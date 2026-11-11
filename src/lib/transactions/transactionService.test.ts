import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
}));

vi.mock('@/lib/db/pool', () => ({
  db: {
    connect: connectMock,
  },
}));

import { createTransaction } from './transactionService';

describe('createTransaction', () => {
  const queryMock = vi.fn();
  const releaseMock = vi.fn();

  const baseInput = {
    workspaceId: 'workspace-123',
    accountId: 'account-123',
    title: 'Miete',
    amount: 850,
    type: 'EXPENSE' as const,
    transactionDate: '2026-11-01',
  };

  const account = {
    id: baseInput.accountId,
    type: 'GIRO',
    isActive: true,
  };

  const transaction = {
    id: 'transaction-123',
    workspaceId: baseInput.workspaceId,
    accountId: baseInput.accountId,
    categoryId: null,
    title: baseInput.title,
    amount: '850.00',
    type: baseInput.type,
    transactionDate: '2026-11-01',
    effectiveDate: '2026-11-01',
    status: 'PLANNED',
    notes: null,
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

  it('creates a transaction with default status and effective date', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({ rows: [transaction] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createTransaction(baseInput);

    expect(result).toEqual(transaction);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO transactions'),
      [
        baseInput.workspaceId,
        baseInput.accountId,
        null,
        baseInput.title,
        baseInput.amount,
        baseInput.type,
        baseInput.transactionDate,
        baseInput.transactionDate,
        'PLANNED',
        null,
      ],
    );
    expect(queryMock).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('uses an explicitly provided effective date', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({
        rows: [{ ...transaction, effectiveDate: '2026-11-05' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createTransaction({
      ...baseInput,
      effectiveDate: '2026-11-05',
    });

    expect(result.effectiveDate).toBe('2026-11-05');
  });

  it.each(['INCOME', 'EXPENSE'] as const)('creates a transaction of type %s', async (type) => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({ rows: [{ ...transaction, type }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createTransaction({
      ...baseInput,
      type,
    });

    expect(result.type).toBe(type);
  });

  it.each(['PLANNED', 'BOOKED', 'CANCELLED'] as const)(
    'creates a transaction with status %s',
    async (status) => {
      queryMock
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [account] })
        .mockResolvedValueOnce({ rows: [{ ...transaction, status }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await createTransaction({
        ...baseInput,
        status,
      });

      expect(result.status).toBe(status);
    },
  );

  it('creates a transaction with a category', async () => {
    const category = {
      id: 'category-123',
      type: 'EXPENSE',
      isActive: true,
    };

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({ rows: [category] })
      .mockResolvedValueOnce({
        rows: [{ ...transaction, categoryId: category.id }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createTransaction({
      ...baseInput,
      categoryId: category.id,
    });

    expect(result.categoryId).toBe(category.id);
  });

  it('creates a transaction with notes', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({
        rows: [{ ...transaction, notes: 'Monatliche Zahlung' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createTransaction({
      ...baseInput,
      notes: 'Monatliche Zahlung',
    });

    expect(result.notes).toBe('Monatliche Zahlung');
  });

  it.each([
    ['missing workspace ID', { workspaceId: '' }],
    ['missing account ID', { accountId: '' }],
    ['empty title', { title: '   ' }],
    ['invalid type', { type: 'INVALID' }],
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -10 }],
    ['non-finite amount', { amount: Number.NaN }],
    ['amount with more than two decimals', { amount: 1.155 }],
    ['amount exceeding database precision', { amount: 1_000_000_000_000 }],
    ['missing transaction date', { transactionDate: '' }],
    ['invalid transaction date', { transactionDate: '2026-02-30' }],
    ['invalid date format', { transactionDate: '01.11.2026' }],
    ['invalid effective date', { effectiveDate: '2026-02-30' }],
    ['invalid status', { status: 'INVALID' }],
  ])('rejects %s', async (_description, overrides) => {
    await expect(
      createTransaction({
        ...baseInput,
        ...overrides,
      } as Parameters<typeof createTransaction>[0]),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it.each([['inactive account', { ...account, isActive: false }]])(
    'rejects an %s',
    async (_description, accountResult) => {
      queryMock
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [accountResult] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(createTransaction(baseInput)).rejects.toThrow();

      expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
      expect(releaseMock).toHaveBeenCalledOnce();
    },
  );

  it('rejects an account that does not exist in the workspace', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(createTransaction(baseInput)).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
  });

  it.each([
    ['inactive category', { type: 'EXPENSE', isActive: false }],
    ['wrong category type', { type: 'INCOME', isActive: true }],
  ])('rejects a category with %s', async (_description, category) => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({
        rows: [{ id: 'category-123', ...category }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      createTransaction({
        ...baseInput,
        categoryId: 'category-123',
      }),
    ).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects a category that does not exist in the workspace', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      createTransaction({
        ...baseInput,
        categoryId: 'foreign-category-123',
      }),
    ).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rolls back and rethrows database errors', async () => {
    const databaseError = new Error('Database insert failed');

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [account] })
      .mockRejectedValueOnce(databaseError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(createTransaction(baseInput)).rejects.toThrow('Database insert failed');

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('releases the connection when connecting fails', async () => {
    connectMock.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(createTransaction(baseInput)).rejects.toThrow('Connection failed');

    expect(releaseMock).not.toHaveBeenCalled();
  });
});
