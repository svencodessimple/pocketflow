export interface MonthlyBudget {
  id: string;
  workspaceId: string;
  categoryId: string;
  month: string;
  amount: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMonthlyBudgetInput {
  workspaceId: string;
  categoryId: string;
  month: string;
  amount: number;
}

export interface UpdateMonthlyBudgetInput {
  workspaceId: string;
  budgetId: string;
  amount: number;
}
