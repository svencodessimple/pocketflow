import { describe, expect, it } from 'vitest';
import { calculateAccountBalance } from './financeService';
import type { Account } from '@/lib/accounts/accountTypes';
import type { Transaction } from '@/lib/transactions/transactionTypes';

describe('calculateAccountBalance', () => {
  const account: Account = {
    id: 'account-123',
    workspaceId: 'workspace-123',
    name: 'Girokonto',
    type: 'GIRO',
    openingBalance: '1000.00',
    openingBalanceDate: '2026-11-01',
    currency: 'EUR',
    isActive: true,
    billingDay: null,
    billingAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: 'transaction-123',
      workspaceId: account.workspaceId,
      accountId: account.id,
      categoryId: null,
      title: 'Testbuchung',
      amount: '100.00',
      type: 'EXPENSE',
      transactionDate: '2026-11-05',
      effectiveDate: '2026-11-05',
      status: 'BOOKED',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function calculate(
    transactions: Transaction[] = [],
    options: {
      asOfDate?: string;
      mode?: 'ACTUAL' | 'PROJECTED';
      selectedAccount?: Account;
    } = {},
  ) {
    return calculateAccountBalance({
      account: options.selectedAccount ?? account,
      transactions,
      asOfDate: options.asOfDate ?? '2026-11-10',
      mode: options.mode ?? 'ACTUAL',
    });
  }

  it('returns the opening balance without transactions', () => {
    expect(calculate()).toBe('1000.00');
  });

  it('returns zero before the opening balance date', () => {
    expect(calculate([], { asOfDate: '2026-10-31' })).toBe('0.00');
  });

  it('includes booked transactions on the opening balance date', () => {
    expect(
      calculate([
        createTransaction({
          effectiveDate: '2026-11-01',
          amount: '100.00',
        }),
      ]),
    ).toBe('900.00');
  });

  it('subtracts booked expenses from a regular account', () => {
    expect(calculate([createTransaction()])).toBe('900.00');
  });

  it('adds booked income to a regular account', () => {
    expect(
      calculate([
        createTransaction({
          type: 'INCOME',
          amount: '250.00',
        }),
      ]),
    ).toBe('1250.00');
  });

  it('includes multiple booked transactions', () => {
    expect(
      calculate([
        createTransaction({ amount: '100.00' }),
        createTransaction({
          id: 'transaction-124',
          amount: '50.00',
        }),
        createTransaction({
          id: 'transaction-125',
          type: 'INCOME',
          amount: '300.00',
        }),
      ]),
    ).toBe('1150.00');
  });

  it('ignores transactions after the selected date', () => {
    expect(
      calculate([
        createTransaction({
          effectiveDate: '2026-11-11',
          amount: '100.00',
        }),
      ]),
    ).toBe('1000.00');
  });

  it('uses effective date instead of transaction date', () => {
    expect(
      calculate([
        createTransaction({
          transactionDate: '2026-11-01',
          effectiveDate: '2026-11-15',
        }),
      ]),
    ).toBe('1000.00');
  });

  it('ignores transactions before the opening balance date', () => {
    expect(
      calculate([
        createTransaction({
          effectiveDate: '2026-10-31',
        }),
      ]),
    ).toBe('1000.00');
  });

  it('ignores planned transactions in actual mode', () => {
    expect(calculate([createTransaction({ status: 'PLANNED' })])).toBe('1000.00');
  });

  it('includes planned transactions in projected mode', () => {
    expect(calculate([createTransaction({ status: 'PLANNED' })], { mode: 'PROJECTED' })).toBe(
      '900.00',
    );
  });

  it('includes booked transactions in projected mode', () => {
    expect(calculate([createTransaction()], { mode: 'PROJECTED' })).toBe('900.00');
  });

  it.each(['ACTUAL', 'PROJECTED'] as const)('ignores cancelled transactions in %s mode', (mode) => {
    expect(calculate([createTransaction({ status: 'CANCELLED' })], { mode })).toBe('1000.00');
  });

  it('calculates a credit card expense as an increase in liability', () => {
    const creditCard = { ...account, type: 'CREDIT_CARD' as const };

    expect(calculate([createTransaction()], { selectedAccount: creditCard })).toBe('1100.00');
  });

  it('calculates a credit card income as a reduction in liability', () => {
    const creditCard = { ...account, type: 'CREDIT_CARD' as const };

    expect(
      calculate(
        [
          createTransaction({
            type: 'INCOME',
            amount: '250.00',
          }),
        ],
        { selectedAccount: creditCard },
      ),
    ).toBe('750.00');
  });

  it('does not include transactions from another account', () => {
    expect(
      calculate([
        createTransaction({
          accountId: 'another-account',
        }),
      ]),
    ).toBe('1000.00');
  });

  it('does not include transactions from another workspace', () => {
    expect(
      calculate([
        createTransaction({
          workspaceId: 'another-workspace',
        }),
      ]),
    ).toBe('1000.00');
  });

  it('handles decimal amounts without floating point errors', () => {
    expect(
      calculate([
        createTransaction({ amount: '0.10' }),
        createTransaction({
          id: 'transaction-124',
          type: 'INCOME',
          amount: '0.20',
        }),
      ]),
    ).toBe('1000.10');
  });

  it('supports amounts with thousands of euros', () => {
    expect(
      calculate([
        createTransaction({
          amount: '12345.67',
        }),
      ]),
    ).toBe('-11345.67');
  });

  it('supports savings accounts', () => {
    const savings = { ...account, type: 'SAVINGS' as const };

    expect(calculate([createTransaction()], { selectedAccount: savings })).toBe('900.00');
  });

  it('supports cash accounts', () => {
    const cash = { ...account, type: 'CASH' as const };

    expect(calculate([createTransaction()], { selectedAccount: cash })).toBe('900.00');
  });

  it('supports other account types', () => {
    const other = { ...account, type: 'OTHER' as const };

    expect(calculate([createTransaction()], { selectedAccount: other })).toBe('900.00');
  });

  it('throws for an invalid as-of date', () => {
    expect(() => calculate([], { asOfDate: '2026-02-30' })).toThrow('Invalid balance date');
  });

  it('throws for an invalid opening balance date', () => {
    expect(() =>
      calculate([], {
        selectedAccount: {
          ...account,
          openingBalanceDate: '2026-02-30',
        },
      }),
    ).toThrow('Invalid opening balance date');
  });

  it('throws for an invalid opening balance amount', () => {
    expect(() =>
      calculate([], {
        selectedAccount: {
          ...account,
          openingBalance: 'invalid',
        },
      }),
    ).toThrow('Invalid monetary value');
  });

  it('throws for an amount with more than two decimal places', () => {
    expect(() =>
      calculate([
        createTransaction({
          amount: '100.123',
        }),
      ]),
    ).toThrow('Invalid monetary value');
  });

  it('throws for an invalid transaction effective date', () => {
    expect(() =>
      calculate([
        createTransaction({
          effectiveDate: '2026-02-30',
        }),
      ]),
    ).toThrow('Invalid transaction effective date');
  });

  it('throws for an invalid transaction amount', () => {
    expect(() =>
      calculate([
        createTransaction({
          amount: 'invalid',
        }),
      ]),
    ).toThrow('Invalid monetary value');
  });
});
