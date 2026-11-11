import 'server-only';

import { db } from '@/lib/db/pool';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionStatus,
  TransactionType,
} from './transactionTypes';

const TRANSACTION_TYPES: TransactionType[] = ['INCOME', 'EXPENSE'];

const TRANSACTION_STATUSES: TransactionStatus[] = ['PLANNED', 'BOOKED', 'CANCELLED'];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateInput(input: CreateTransactionInput): void {
  if (!input.workspaceId?.trim()) {
    throw new Error('Workspace ID is required');
  }

  if (!input.accountId?.trim()) {
    throw new Error('Account ID is required');
  }

  if (!input.title?.trim()) {
    throw new Error('Transaction title is required');
  }

  if (!TRANSACTION_TYPES.includes(input.type)) {
    throw new Error('Invalid transaction type');
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount >= 1_000_000_000_000 ||
    Number(input.amount.toFixed(2)) !== input.amount
  ) {
    throw new Error('Invalid transaction amount');
  }

  if (!isValidDate(input.transactionDate)) {
    throw new Error('Invalid transaction date');
  }

  if (input.effectiveDate !== undefined && !isValidDate(input.effectiveDate)) {
    throw new Error('Invalid effective date');
  }

  if (input.status !== undefined && !TRANSACTION_STATUSES.includes(input.status)) {
    throw new Error('Invalid transaction status');
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  validateInput(input);

  const effectiveDate = input.effectiveDate ?? input.transactionDate;
  const status = input.status ?? 'PLANNED';

  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const accountResult = await client.query(
      `
        SELECT
          id,
          is_active AS "isActive"
        FROM accounts
        WHERE id = $1
          AND workspace_id = $2
        FOR UPDATE
      `,
      [input.accountId, input.workspaceId],
    );

    const account = accountResult.rows[0];

    if (!account || !account.isActive) {
      throw new Error('Account must be active in the same workspace');
    }

    if (input.categoryId) {
      const categoryResult = await client.query(
        `
          SELECT
            id,
            type,
            is_active AS "isActive"
          FROM categories
          WHERE id = $1
            AND workspace_id = $2
          FOR UPDATE
        `,
        [input.categoryId, input.workspaceId],
      );

      const category = categoryResult.rows[0];

      if (!category || !category.isActive || category.type !== input.type) {
        throw new Error(
          'Category must be active and match the transaction type in the same workspace',
        );
      }
    }

    const result = await client.query<Transaction>(
      `
        INSERT INTO transactions (
          workspace_id,
          account_id,
          category_id,
          title,
          amount,
          type,
          transaction_date,
          effective_date,
          status,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          workspace_id AS "workspaceId",
          account_id AS "accountId",
          category_id AS "categoryId",
          title,
          amount,
          type,
          transaction_date AS "transactionDate",
          effective_date AS "effectiveDate",
          status,
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        input.workspaceId,
        input.accountId,
        input.categoryId ?? null,
        input.title.trim(),
        input.amount,
        input.type,
        input.transactionDate,
        effectiveDate,
        status,
        input.notes?.trim() || null,
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
