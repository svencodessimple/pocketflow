export type AccountType = 'GIRO' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'OTHER';

export interface Account {
  id: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  openingBalance: string;
  openingBalanceDate: string;
  currency: string;
  isActive: boolean;
  billingDay: number | null;
  billingAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  workspaceId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  openingBalanceDate: string;
  billingDay?: number;
  billingAccountId?: string;
}
