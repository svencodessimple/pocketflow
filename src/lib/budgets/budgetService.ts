import 'server-only';

import { db } from '@/lib/db/pool';
import type {
  CreateMonthlyBudgetInput,
  MonthlyBudget,
  UpdateMonthlyBudgetInput,
} from './budgetTypes';

interface MonthlyBudgetRow {
  id: string;
  workspaceId: string;
  categoryId: string;
  month: string;
  amount: string;
  createdAt: Date;
  updatedAt: Date;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateInput(input: CreateMonthlyBudgetInput): void {
  if (!input.workspaceId?.trim()) {
    throw new Error('Invalid workspace ID');
  }

  if (!input.categoryId?.trim()) {
    throw new Error('Invalid category ID');
  }

  if (!isValidDate(input.month) || !input.month.endsWith('-01')) {
    throw new Error('Invalid budget month');
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount >= 1_000_000_000_000 ||
    Number(input.amount.toFixed(2)) !== input.amount
  ) {
    throw new Error('Invalid budget amount');
  }
}

export async function createMonthlyBudget(input: CreateMonthlyBudgetInput): Promise<MonthlyBudget> {
  validateInput(input);

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const categoryResult = await client.query<{ id: string }>(
      `SELECT id
       FROM categories
       WHERE id = $1
         AND workspace_id = $2
         AND type = 'EXPENSE'
         AND is_active = TRUE
       FOR UPDATE`,
      [input.categoryId, input.workspaceId],
    );

    if (categoryResult.rows.length === 0) {
      throw new Error('Category not found or not eligible for a budget');
    }

    const result = await client.query<MonthlyBudgetRow>(
      `INSERT INTO monthly_budgets (
         workspace_id,
         category_id,
         month,
         amount
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         workspace_id AS "workspaceId",
         category_id AS "categoryId",
         month::text AS month,
         amount::text AS amount,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [input.workspaceId, input.categoryId, input.month, input.amount],
    );

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function updateMonthlyBudget(input: UpdateMonthlyBudgetInput): Promise<MonthlyBudget> {
  if (!input.workspaceId?.trim()) {
    throw new Error('Invalid workspace ID');
  }

  if (!input.budgetId?.trim()) {
    throw new Error('Invalid budget ID');
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount >= 1_000_000_000_000 ||
    Number(input.amount.toFixed(2)) !== input.amount
  ) {
    throw new Error('Invalid budget amount');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query<MonthlyBudgetRow>(
      `UPDATE monthly_budgets
       SET amount = $3,
           updated_at = NOW()
       WHERE id = $1
         AND workspace_id = $2
       RETURNING
         id,
         workspace_id AS "workspaceId",
         category_id AS "categoryId",
         month::text AS month,
         amount::text AS amount,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [input.budgetId, input.workspaceId, input.amount],
    );

    if (result.rows.length === 0) {
      throw new Error('Monthly budget not found');
    }

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMonthlyBudget(
  input: Pick<UpdateMonthlyBudgetInput, 'workspaceId' | 'budgetId'>,
): Promise<void> {
  if (!input.workspaceId?.trim()) {
    throw new Error('Invalid workspace ID');
  }

  if (!input.budgetId?.trim()) {
    throw new Error('Invalid budget ID');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `DELETE FROM monthly_budgets
       WHERE id = $1
         AND workspace_id = $2`,
      [input.budgetId, input.workspaceId],
    );

    if (result.rowCount === 0) {
      throw new Error('Monthly budget not found');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
