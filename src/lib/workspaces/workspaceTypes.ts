export type WorkspaceRole = 'OWNER' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  ownerUserId: string;
  currency?: string;
  timezone?: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
}

export interface WorkspaceWithMembership extends Workspace {
  membership: WorkspaceMembership;
}
