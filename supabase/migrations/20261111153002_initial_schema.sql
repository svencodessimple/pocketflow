
-- ============================================================
-- Pocketflow - Initial Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Users and external identities
-- ------------------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_subject TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_identities_provider_not_empty
        CHECK (length(trim(provider)) > 0),

    CONSTRAINT user_identities_subject_not_empty
        CHECK (length(trim(provider_subject)) > 0),

    CONSTRAINT user_identities_provider_subject_unique
        UNIQUE (provider, provider_subject),

    CONSTRAINT user_identities_id_user_unique
        UNIQUE (id, user_id)
);

CREATE INDEX idx_user_identities_user_id
    ON user_identities(user_id);

-- ------------------------------------------------------------
-- Workspaces
-- ------------------------------------------------------------

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT workspaces_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT workspaces_currency_format
        CHECK (currency ~ '^[A-Z]{3}$'),

    CONSTRAINT workspaces_timezone_not_empty
        CHECK (length(trim(timezone)) > 0),

    CONSTRAINT workspaces_id_unique
        UNIQUE (id)
);

-- ------------------------------------------------------------
-- Workspace memberships
-- ------------------------------------------------------------

CREATE TABLE workspace_memberships (
    workspace_id UUID NOT NULL
        REFERENCES workspaces(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'OWNER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id),

    CONSTRAINT workspace_memberships_role_valid
        CHECK (role IN ('OWNER', 'MEMBER'))
);

CREATE INDEX idx_workspace_memberships_user_id
    ON workspace_memberships(user_id);

-- ------------------------------------------------------------
-- Accounts
-- ------------------------------------------------------------

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES workspaces(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    type TEXT NOT NULL,
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    opening_balance_date DATE NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Credit card configuration (optional)
    billing_day SMALLINT,
    billing_account_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT accounts_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT accounts_type_valid
        CHECK (type IN ('GIRO', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'OTHER')),

    CONSTRAINT accounts_billing_day_valid
        CHECK (billing_day IS NULL OR billing_day BETWEEN 1 AND 31),

    CONSTRAINT accounts_billing_account_required
        CHECK (
            (type = 'CREDIT_CARD' AND billing_account_id IS NOT NULL)
            OR
            (type <> 'CREDIT_CARD' AND billing_account_id IS NULL)
        ),

    CONSTRAINT accounts_credit_card_not_self_billed
        CHECK (billing_account_id IS NULL OR billing_account_id <> id),

    CONSTRAINT accounts_id_workspace_unique
        UNIQUE (id, workspace_id),

    CONSTRAINT accounts_billing_account_same_workspace
        FOREIGN KEY (billing_account_id, workspace_id)
        REFERENCES accounts(id, workspace_id)
);

CREATE INDEX idx_accounts_workspace_id
    ON accounts(workspace_id);

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES workspaces(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT categories_type_valid
        CHECK (type IN ('INCOME', 'EXPENSE')),

    CONSTRAINT categories_id_workspace_unique
        UNIQUE (id, workspace_id),

    CONSTRAINT categories_workspace_name_type_unique
        UNIQUE (workspace_id, name, type)
);

CREATE INDEX idx_categories_workspace_id
    ON categories(workspace_id);

-- ------------------------------------------------------------
-- Transactions
-- ------------------------------------------------------------

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    account_id UUID NOT NULL,
    category_id UUID,

    title TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    type TEXT NOT NULL,

    transaction_date DATE NOT NULL,
    effective_date DATE NOT NULL,

    status TEXT NOT NULL DEFAULT 'PLANNED',
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transactions_title_not_empty
        CHECK (length(trim(title)) > 0),

    CONSTRAINT transactions_amount_positive
        CHECK (amount > 0),

    CONSTRAINT transactions_type_valid
        CHECK (type IN ('INCOME', 'EXPENSE')),

    CONSTRAINT transactions_status_valid
        CHECK (status IN ('PLANNED', 'BOOKED', 'CANCELLED')),

    CONSTRAINT transactions_account_same_workspace
        FOREIGN KEY (account_id, workspace_id)
        REFERENCES accounts(id, workspace_id)
        ON DELETE CASCADE,

    CONSTRAINT transactions_category_same_workspace
        FOREIGN KEY (category_id, workspace_id)
        REFERENCES categories(id, workspace_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_transactions_account_effective_date
    ON transactions(account_id, effective_date);

CREATE INDEX idx_transactions_workspace_status_effective_date
    ON transactions(workspace_id, status, effective_date);

CREATE INDEX idx_transactions_category_id
    ON transactions(category_id)
    WHERE category_id IS NOT NULL;
