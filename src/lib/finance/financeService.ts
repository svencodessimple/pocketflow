import type { Account } from '@/lib/accounts/accountTypes';
import type { Transaction } from '@/lib/transactions/transactionTypes';

export type BalanceMode = 'ACTUAL' | 'PROJECTED';

interface CalculateAccountBalanceInput {
  account: Account;
  transactions: Transaction[];
  asOfDate: string;
  mode: BalanceMode;
}

const CREDIT_CARD = 'CREDIT_CARD';

function parseCents(value: string): number {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error('Invalid monetary value');
  }

  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  if (!Number.isSafeInteger(cents)) {
    throw new Error('Monetary value exceeds supported precision');
  }

  return cents;
}

function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Calculated balance exceeds supported precision');
  }

  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const euros = Math.floor(absolute / 100);
  const remainder = absolute % 100;

  return `${sign}${euros}.${String(remainder).padStart(2, '0')}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function calculateAccountBalance({
  account,
  transactions,
  asOfDate,
  mode,
}: CalculateAccountBalanceInput): string {
  if (!isValidDate(asOfDate)) {
    throw new Error('Invalid balance date');
  }

  if (!isValidDate(account.openingBalanceDate)) {
    throw new Error('Invalid opening balance date');
  }

  let balance = parseCents(account.openingBalance);

  if (asOfDate < account.openingBalanceDate) {
    return '0.00';
  }

  for (const transaction of transactions) {
    if (transaction.accountId !== account.id || transaction.workspaceId !== account.workspaceId) {
      continue;
    }

    if (
      transaction.status === 'CANCELLED' ||
      (mode === 'ACTUAL' && transaction.status !== 'BOOKED')
    ) {
      continue;
    }

    if (!isValidDate(transaction.effectiveDate)) {
      throw new Error('Invalid transaction effective date');
    }

    if (
      transaction.effectiveDate < account.openingBalanceDate ||
      transaction.effectiveDate > asOfDate
    ) {
      continue;
    }

    const amount = parseCents(transaction.amount);

    const isIncome = transaction.type === 'INCOME';
    const isCreditCard = account.type === CREDIT_CARD;

    if (isIncome !== isCreditCard) {
      balance += amount;
    } else {
      balance -= amount;
    }
  }

  return formatCents(balance);
}
