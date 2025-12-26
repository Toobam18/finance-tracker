-- ============================================
-- Personal Finance Tracker - Supabase Schema
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================

-- 1) CREATE TABLES
-- ============================================

-- Recurring Rules table (must be created first due to FK)
CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount >= 0),
  category text NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  day integer NOT NULL CHECK (day >= 1 AND day <= 28),
  created_at timestamptz DEFAULT now()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount >= 0),
  category text NOT NULL,
  date date NOT NULL,
  description text,
  recurring_id uuid REFERENCES public.recurring_rules(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_amount numeric NOT NULL CHECK (monthly_amount >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

-- 2) ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

-- 3) DROP EXISTING POLICIES (if re-running)
-- ============================================

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;

DROP POLICY IF EXISTS "Users can view own recurring_rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can insert own recurring_rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can update own recurring_rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can delete own recurring_rules" ON public.recurring_rules;

-- 4) CREATE RLS POLICIES
-- ============================================

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view own budgets"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Recurring rules policies
CREATE POLICY "Users can view own recurring_rules"
  ON public.recurring_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring_rules"
  ON public.recurring_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring_rules"
  ON public.recurring_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring_rules"
  ON public.recurring_rules FOR DELETE
  USING (auth.uid() = user_id);

-- 5) CREATE TRIGGER FUNCTION (backup for user_id)
-- ============================================

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) CREATE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS set_transactions_user_id ON public.transactions;
CREATE TRIGGER set_transactions_user_id
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_budgets_user_id ON public.budgets;
CREATE TRIGGER set_budgets_user_id
  BEFORE INSERT ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

DROP TRIGGER IF EXISTS set_recurring_rules_user_id ON public.recurring_rules;
CREATE TRIGGER set_recurring_rules_user_id
  BEFORE INSERT ON public.recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

-- 7) CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON public.transactions(recurring_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id ON public.recurring_rules(user_id);

-- ============================================
-- DONE! All tables, RLS, and triggers created.
-- ============================================

