import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
}));

vi.mock('@/lib/db/pool', () => ({
  db: {
    connect: connectMock,
  },
}));

import { createAccount } from './accountService';

describe('createAccount', () => {
  const queryMock = vi.fn();
  const releaseMock = vi.fn();

  const baseInput = {
    workspaceId: 'workspace-123',
    name: 'Girokonto',
    type: 'GIRO' as const,
    openingBalance: 1500,
    openingBalanceDate: '2026-11-11',
  };

  const account = {
    id: 'account-123',
    workspaceId: baseInput.workspaceId,
    name: baseInput.name,
    type: baseInput.type,
    openingBalance: '1500.00',
    openingBalanceDate: '2026-11-11',
    currency: 'EUR',
    isActive: true,
    billingDay: null,
    billingAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    connectMock.mockReset();
    queryMock.mockReset();
    releaseMock.mockReset();

    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it('creates a regular account', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createAccount(baseInput);

    expect(result).toEqual(account);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO accounts'), [
      baseInput.workspaceId,
      baseInput.name,
      baseInput.type,
      baseInput.openingBalance,
      baseInput.openingBalanceDate,
      'EUR',
      null,
      null,
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('allows a negative opening balance', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ ...account, openingBalance: '-250.00' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createAccount({
      ...baseInput,
      openingBalance: -250,
    });

    expect(result.openingBalance).toBe('-250.00');
  });

  it('accepts decimal amounts with two decimal places', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ ...account, openingBalance: '1.15' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createAccount({
      ...baseInput,
      openingBalance: 1.15,
    });

    expect(result.openingBalance).toBe('1.15');
  });

  it('rejects amounts with more than two decimal places', async () => {
    await expect(
      createAccount({
        ...baseInput,
        openingBalance: 1.155,
      }),
    ).rejects.toThrow('Invalid opening balance');

    expect(connectMock).not.toHaveBeenCalled();
  });

  it.each(['SAVINGS', 'CASH', 'OTHER'] as const)('creates an account of type %s', async (type) => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ ...account, type }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createAccount({
      ...baseInput,
      type,
    });

    expect(result.type).toBe(type);
  });

  it('creates a credit card with a billing account', async () => {
    const creditCard = {
      ...account,
      type: 'CREDIT_CARD',
      name: 'Visa',
      openingBalance: '300.00',
      billingDay: 31,
      billingAccountId: 'billing-account-123',
    };

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'billing-account-123',
            type: 'GIRO',
            isActive: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [creditCard] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createAccount({
      ...baseInput,
      name: 'Visa',
      type: 'CREDIT_CARD',
      openingBalance: 300,
      billingDay: 31,
      billingAccountId: 'billing-account-123',
    });

    expect(result).toEqual(creditCard);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT'), [
      'billing-account-123',
      baseInput.workspaceId,
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(4, 'COMMIT');
  });

  it.each([
    ['empty name', { name: '   ' }],
    ['invalid account type', { type: 'INVALID' }],
    ['missing opening balance date', { openingBalanceDate: '' }],
    ['invalid date', { openingBalanceDate: '2026-02-30' }],
    [
      'credit card without billing day',
      {
        type: 'CREDIT_CARD',
        billingAccountId: 'billing-account-123',
      },
    ],
    [
      'credit card without billing account',
      {
        type: 'CREDIT_CARD',
        billingDay: 15,
      },
    ],
    [
      'billing day below range',
      {
        type: 'CREDIT_CARD',
        billingDay: 0,
        billingAccountId: 'billing-account-123',
      },
    ],
    [
      'billing day above range',
      {
        type: 'CREDIT_CARD',
        billingDay: 32,
        billingAccountId: 'billing-account-123',
      },
    ],
    [
      'regular account with billing day',
      {
        billingDay: 15,
      },
    ],
    [
      'regular account with billing account',
      {
        billingAccountId: 'billing-account-123',
      },
    ],
  ])('rejects %s', async (_description, overrides) => {
    await expect(
      createAccount({
        ...baseInput,
        ...overrides,
      } as Parameters<typeof createAccount>[0]),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong account type', { type: 'SAVINGS', isActive: true }],
    ['inactive account', { type: 'GIRO', isActive: false }],
  ])('rejects a billing account with %s', async (_description, billingAccount) => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'billing-account-123', ...billingAccount }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      createAccount({
        ...baseInput,
        type: 'CREDIT_CARD',
        billingDay: 15,
        billingAccountId: 'billing-account-123',
      }),
    ).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rejects a billing account that does not exist in the workspace', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      createAccount({
        ...baseInput,
        type: 'CREDIT_CARD',
        billingDay: 15,
        billingAccountId: 'foreign-account-123',
      }),
    ).rejects.toThrow();

    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rolls back and rethrows database errors', async () => {
    const databaseError = new Error('Database insert failed');

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(databaseError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(createAccount(baseInput)).rejects.toThrow('Database insert failed');

    expect(queryMock).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('releases the connection when connecting fails', async () => {
    connectMock.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(createAccount(baseInput)).rejects.toThrow('Connection failed');

    expect(releaseMock).not.toHaveBeenCalled();
  });
});
