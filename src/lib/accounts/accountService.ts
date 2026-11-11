import 'server-only';

import { db } from '@/lib/db/pool';
import type { Account, AccountType, CreateAccountInput } from './accountTypes';

const ACCOUNT_TYPES: AccountType[] = ['GIRO', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'OTHER'];

function validateInput(input: CreateAccountInput): void {
  if (!input.workspaceId?.trim()) {
    throw new Error('Workspace ID is required');
  }

  if (!input.name?.trim()) {
    throw new Error('Account name is required');
  }

  if (!ACCOUNT_TYPES.includes(input.type)) {
    throw new Error('Invalid account type');
  }

  if (
    !Number.isFinite(input.openingBalance) ||
    Math.abs(input.openingBalance) >= 1_000_000_000_000 ||
    Number(input.openingBalance.toFixed(2)) !== input.openingBalance
  ) {
    throw new Error('Invalid opening balance');
  }

  if (!isValidDate(input.openingBalanceDate)) {
    throw new Error('Invalid opening balance date');
  }

  if (input.type === 'CREDIT_CARD') {
    if (!Number.isInteger(input.billingDay) || input.billingDay! < 1 || input.billingDay! > 31) {
      throw new Error('Credit card requires a valid billing day');
    }

    if (!input.billingAccountId?.trim()) {
      throw new Error('Credit card requires a billing account');
    }
  } else if (input.billingDay !== undefined || input.billingAccountId !== undefined) {
    throw new Error('Billing configuration is only valid for credit cards');
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  validateInput(input);

  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    if (input.type === 'CREDIT_CARD') {
      const billingAccountResult = await client.query(
        `
          SELECT
            id,
            type,
            is_active AS "isActive"
          FROM accounts
          WHERE id = $1
            AND workspace_id = $2
          FOR UPDATE
        `,
        [input.billingAccountId, input.workspaceId],
      );

      const billingAccount = billingAccountResult.rows[0];

      if (!billingAccount || billingAccount.type !== 'GIRO' || !billingAccount.isActive) {
        throw new Error('Billing account must be an active giro account in the same workspace');
      }
    }

    const result = await client.query<Account>(
      `
        INSERT INTO accounts (
          workspace_id,
          name,
          type,
          opening_balance,
          opening_balance_date,
          currency,
          billing_day,
          billing_account_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          workspace_id AS "workspaceId",
          name,
          type,
          opening_balance AS "openingBalance",
          opening_balance_date AS "openingBalanceDate",
          currency,
          is_active AS "isActive",
          billing_day AS "billingDay",
          billing_account_id AS "billingAccountId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        input.workspaceId,
        input.name.trim(),
        input.type,
        input.openingBalance,
        input.openingBalanceDate,
        'EUR',
        input.billingDay ?? null,
        input.billingAccountId ?? null,
      ],
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return result.rows[0];
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original error.
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
