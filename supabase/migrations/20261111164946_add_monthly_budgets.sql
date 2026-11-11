
CREATE TABLE public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    category_id UUID NOT NULL,
    month DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT monthly_budgets_amount_positive
        CHECK (amount > 0),

    CONSTRAINT monthly_budgets_month_start
        CHECK (EXTRACT(DAY FROM month) = 1),

    CONSTRAINT monthly_budgets_workspace_category_month_unique
        UNIQUE (workspace_id, category_id, month),

    CONSTRAINT monthly_budgets_category_workspace_fk
        FOREIGN KEY (category_id, workspace_id)
        REFERENCES public.categories (id, workspace_id)
        ON DELETE RESTRICT
);
