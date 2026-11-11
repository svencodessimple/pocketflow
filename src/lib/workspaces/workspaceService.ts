import 'server-only';

import { db } from '@/lib/db/pool';
import type { CreateWorkspaceInput, WorkspaceWithMembership } from './workspaceTypes';

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<WorkspaceWithMembership> {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const workspaceResult = await client.query(
      `
            INSERT INTO workspaces (name, currency, timezone)
            VALUES ($1, $2, $3)
            RETURNING
                id,
                name,
                currency,
                timezone,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            `,
      [input.name.trim(), input.currency ?? 'EUR', input.timezone ?? 'Europe/Berlin'],
    );

    const workspace = workspaceResult.rows[0];

    const membershipResult = await client.query(
      `
            INSERT INTO workspace_memberships (workspace_id, user_id, role)
            VALUES ($1, $2, 'OWNER')
            RETURNING
                workspace_id AS "workspaceId",
                user_id AS "userId",
                role,
                created_at AS "createdAt"
            `,
      [workspace.id, input.ownerUserId],
    );

    await client.query('COMMIT');

    return {
      ...workspace,
      membership: membershipResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
