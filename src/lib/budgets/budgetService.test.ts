import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
}));

vi.mock('@/lib/db/pool', () => ({
  db: {
    connect: connectMock,
  },
}));

import { createMonthlyBudget, updateMonthlyBudget, deleteMonthlyBudget } from './budgetService';

describe('createMonthlyBudget', () => {
  const queryMock = vi.fn();
  const releaseMock = vi.fn();

  const baseInput = {
    workspaceId: 'workspace-123',
    categoryId: 'category-123',
    month: '2026-11-01',
    amount: 500,
  };

  const budget = {
    id: 'budget-123',
    workspaceId: baseInput.workspaceId,
    categoryId: baseInput.categoryId,
    month: baseInput.month,
    amount: '500.00',
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

  it('creates a monthly budget for an active expense category', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: baseInput.categoryId }],
      })
      .mockResolvedValueOnce({ rows: [budget] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createMonthlyBudget(baseInput);

    expect(result).toEqual(budget);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT'), [
      baseInput.categoryId,
      baseInput.workspaceId,
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO monthly_budgets'),
      [baseInput.workspaceId, baseInput.categoryId, baseInput.month, baseInput.amount],
    );
    expect(queryMock).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('accepts decimal amounts with two decimal places', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: baseInput.categoryId }] })
      .mockResolvedValueOnce({
        rows: [{ ...budget, amount: '123.45' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createMonthlyBudget({
      ...baseInput,
      amount: 123.45,
    });

    expect(result.amount).toBe('123.45');
  });

  it.each([
    ['zero amount', 0],
    ['negative amount', -100],
    ['amount with more than two decimal places', 10.123],
    ['infinite amount', Infinity],
    ['NaN amount', NaN],
    ['amount exceeding the supported range', 1_000_000_000_000],
  ])('rejects %s', async (_description, amount) => {
    await expect(
      createMonthlyBudget({
        ...baseInput,
        amount,
      }),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it.each([
    ['empty workspace ID', { workspaceId: '' }],
    ['empty category ID', { categoryId: '' }],
    ['missing month', { month: '' }],
    ['invalid month', { month: '2026-13-01' }],
    ['invalid calendar date', { month: '2026-02-30' }],
    ['month not starting on the first day', { month: '2026-11-15' }],
  ])('rejects %s', async (_description, overrides) => {
    await expect(
      createMonthlyBudget({
        ...baseInput,
        ...overrides,
      }),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it('rejects a category that does not exist in the workspace', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(createMonthlyBudget(baseInput)).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rejects an income category', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(createMonthlyBudget(baseInput)).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rejects an inactive expense category', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(createMonthlyBudget(baseInput)).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rolls back and rethrows database errors', async () => {
    const databaseError = new Error('Database insert failed');

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: baseInput.categoryId }] })
      .mockRejectedValueOnce(databaseError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(createMonthlyBudget(baseInput)).rejects.toThrow('Database insert failed');

    expect(queryMock).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('releases the connection when connecting fails', async () => {
    connectMock.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(createMonthlyBudget(baseInput)).rejects.toThrow('Connection failed');

    expect(releaseMock).not.toHaveBeenCalled();
  });
});

describe('updateMonthlyBudget', () => {
  const queryMock = vi.fn();
  const releaseMock = vi.fn();

  const baseInput = {
    workspaceId: 'workspace-123',
    budgetId: 'budget-123',
    amount: 750,
  };

  const budget = {
    id: baseInput.budgetId,
    workspaceId: baseInput.workspaceId,
    categoryId: 'category-123',
    month: '2026-11-01',
    amount: '750.00',
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

  it('updates the amount of an existing monthly budget', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [budget] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await updateMonthlyBudget(baseInput);

    expect(result).toEqual(budget);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE monthly_budgets'),
      [baseInput.budgetId, baseInput.workspaceId, baseInput.amount],
    );
    expect(queryMock).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('accepts decimal amounts with two decimal places', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ ...budget, amount: '123.45' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await updateMonthlyBudget({
      ...baseInput,
      amount: 123.45,
    });

    expect(result.amount).toBe('123.45');
  });

  it.each([
    ['zero amount', 0],
    ['negative amount', -100],
    ['amount with more than two decimal places', 10.123],
    ['infinite amount', Infinity],
    ['NaN amount', NaN],
    ['amount exceeding the supported range', 1_000_000_000_000],
  ])('rejects %s', async (_description, amount) => {
    await expect(
      updateMonthlyBudget({
        ...baseInput,
        amount,
      }),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it.each([
    ['empty workspace ID', { workspaceId: '' }],
    ['empty budget ID', { budgetId: '' }],
  ])('rejects %s', async (_description, overrides) => {
    await expect(
      updateMonthlyBudget({
        ...baseInput,
        ...overrides,
      }),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it('rejects a budget that does not exist in the workspace', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(updateMonthlyBudget(baseInput)).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rolls back and rethrows database errors', async () => {
    const databaseError = new Error('Database update failed');

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(databaseError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(updateMonthlyBudget(baseInput)).rejects.toThrow('Database update failed');

    expect(queryMock).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('releases the connection when connecting fails', async () => {
    connectMock.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(updateMonthlyBudget(baseInput)).rejects.toThrow('Connection failed');

    expect(releaseMock).not.toHaveBeenCalled();
  });
});

describe('deleteMonthlyBudget', () => {
  const queryMock = vi.fn();
  const releaseMock = vi.fn();

  const baseInput = {
    workspaceId: 'workspace-123',
    budgetId: 'budget-123',
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

  it('deletes an existing monthly budget', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(deleteMonthlyBudget(baseInput)).resolves.toBeUndefined();

    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM monthly_budgets'),
      [baseInput.budgetId, baseInput.workspaceId],
    );
    expect(queryMock).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rejects a budget that does not exist in the workspace', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(deleteMonthlyBudget(baseInput)).rejects.toThrow();

    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['empty workspace ID', { workspaceId: '' }],
    ['empty budget ID', { budgetId: '' }],
  ])('rejects %s', async (_description, overrides) => {
    await expect(
      deleteMonthlyBudget({
        ...baseInput,
        ...overrides,
      }),
    ).rejects.toThrow();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it('rolls back and rethrows database errors', async () => {
    const databaseError = new Error('Database delete failed');

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(databaseError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(deleteMonthlyBudget(baseInput)).rejects.toThrow('Database delete failed');

    expect(queryMock).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('releases the connection when connecting fails', async () => {
    connectMock.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(deleteMonthlyBudget(baseInput)).rejects.toThrow('Connection failed');

    expect(releaseMock).not.toHaveBeenCalled();
  });
});
