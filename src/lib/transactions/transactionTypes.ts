export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionStatus = 'PLANNED' | 'BOOKED' | 'CANCELLED';

export interface Transaction {
  id: string;
  workspaceId: string;
  accountId: string;
  categoryId: string | null;
  title: string;
  amount: string;
  type: TransactionType;
  transactionDate: string;
  effectiveDate: string;
  status: TransactionStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  workspaceId: string;
  accountId: string;
  categoryId?: string | null;
  title: string;
  amount: number;
  type: TransactionType;
  transactionDate: string;
  effectiveDate?: string;
  status?: TransactionStatus;
  notes?: string | null;
}
