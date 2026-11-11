import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connectMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
}));

vi.mock('@/lib/db/pool', () => ({
  db: {
    connect: connectMock,
  },
}));

import { createWorkspace } from './workspaceService';

describe('createWorkspace', () => {
  const queryMock = vi.fn();
  const releaseMock = vi.fn();

  beforeEach(() => {
    connectMock.mockReset();
    queryMock.mockReset();
    releaseMock.mockReset();

    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it('creates a workspace with an OWNER membership', async () => {
    const workspace = {
      id: 'workspace-123',
      name: 'Haushalt',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const membership = {
      workspaceId: workspace.id,
      userId: 'user-123',
      role: 'OWNER',
      createdAt: new Date(),
    };

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [workspace] })
      .mockResolvedValueOnce({ rows: [membership] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createWorkspace({
      name: 'Haushalt',
      ownerUserId: 'user-123',
    });

    expect(result).toEqual({
      ...workspace,
      membership,
    });

    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO workspaces'),
      ['Haushalt', 'EUR', 'Europe/Berlin'],
    );

    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO workspace_memberships'),
      [workspace.id, 'user-123'],
    );

    expect(queryMock).toHaveBeenNthCalledWith(4, 'COMMIT');

    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it('rolls back when creating the membership fails', async () => {
    const databaseError = new Error('Membership creation failed');

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'workspace-123' }],
      })
      .mockRejectedValueOnce(databaseError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      createWorkspace({
        name: 'Haushalt',
        ownerUserId: 'user-123',
      }),
    ).rejects.toThrow('Membership creation failed');

    expect(queryMock).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });
});
