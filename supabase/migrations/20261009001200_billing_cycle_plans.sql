-- Add billing_cycle column to payment_orders if not exists
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Add billing_cycle column to subscriptions if not exists
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Update subscription_plans: set correct prices and employee limits
-- Canonical pricing (KEEP IN SYNC with src/lib/plans.js + sync_plan_prices_149k_299k.sql):
-- Starter Rp 149.000 (max 25) | Pro Rp 299.000 (max 100). Yearly = monthly×12×0.85.
UPDATE public.subscription_plans SET
  price_monthly = 149000,
  price_yearly  = 1519800,   -- 149000 * 12 * 0.85
  max_employees = 25
WHERE slug = 'starter';

UPDATE public.subscription_plans SET
  price_monthly = 299000,
  price_yearly  = 3049800,  -- 299000 * 12 * 0.85
  max_employees = 100
WHERE slug = 'pro';

-- Remove free plan from subscription_plans (set inactive)
UPDATE public.subscription_plans SET is_active = false WHERE slug = 'free';

-- Ensure enterprise has correct fields
UPDATE public.subscription_plans SET
  price_monthly = NULL,
  price_yearly  = NULL,
  max_employees = 9999
WHERE slug = 'enterprise';
