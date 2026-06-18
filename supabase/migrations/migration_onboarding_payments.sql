-- ============================================================
-- Migration: Onboarding Profiles + Payment Orders
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Onboarding profiles (wajib diisi setelah daftar)
CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text        NOT NULL,
  company_name    text        NOT NULL,
  phone           text        NOT NULL,
  province        text        NOT NULL,
  city            text        NOT NULL,
  gender          text        NOT NULL CHECK (gender IN ('male','female')),
  employee_count  text        NOT NULL,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_profiles_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_profiles;
CREATE POLICY "Users manage own onboarding"
  ON public.onboarding_profiles
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for webhook)
DROP POLICY IF EXISTS "Service role full access onboarding" ON public.onboarding_profiles;
CREATE POLICY "Service role full access onboarding"
  ON public.onboarding_profiles
  FOR ALL
  TO service_role
  USING (true);

-- 2. Payment orders (Midtrans transactions)
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        text        NOT NULL UNIQUE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug       text        NOT NULL,
  plan_name       text,
  amount          bigint      NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','failed','expired','cancelled')),
  midtrans_status text,
  snap_token      text,
  voucher_code    text,
  discount_amount bigint      NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own orders" ON public.payment_orders;
CREATE POLICY "Users view own orders"
  ON public.payment_orders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own orders" ON public.payment_orders;
CREATE POLICY "Users insert own orders"
  ON public.payment_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access orders" ON public.payment_orders;
CREATE POLICY "Service role full access orders"
  ON public.payment_orders
  FOR ALL
  TO service_role
  USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Vouchers table (editable by founder)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  discount_type   text        NOT NULL DEFAULT 'percentage'
                              CHECK (discount_type IN ('percentage','fixed')),
  discount_value  numeric     NOT NULL,
  max_uses        integer,
  used_count      integer     NOT NULL DEFAULT 0,
  valid_until     timestamptz,
  plan_slug       text,       -- null = berlaku semua plan
  is_active       boolean     NOT NULL DEFAULT true,
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active vouchers" ON public.vouchers;
CREATE POLICY "Authenticated users can read active vouchers"
  ON public.vouchers FOR SELECT
  TO authenticated
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

DROP POLICY IF EXISTS "Service role full access vouchers" ON public.vouchers;
CREATE POLICY "Service role full access vouchers"
  ON public.vouchers FOR ALL
  TO service_role USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON public.payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.onboarding_profiles(user_id);
