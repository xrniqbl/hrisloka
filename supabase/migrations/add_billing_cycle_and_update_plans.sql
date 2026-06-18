-- Add billing_cycle column to payment_orders if not exists
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Add billing_cycle column to subscriptions if not exists
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Update subscription_plans: set correct prices and employee limits
UPDATE public.subscription_plans SET
  price_monthly = 75000,
  price_yearly  = 765000,   -- 75000 * 12 * 0.85
  max_employees = 50
WHERE slug = 'starter';

UPDATE public.subscription_plans SET
  price_monthly = 125000,
  price_yearly  = 1275000,  -- 125000 * 12 * 0.85
  max_employees = 200
WHERE slug = 'pro';

-- Remove free plan from subscription_plans (set inactive)
UPDATE public.subscription_plans SET is_active = false WHERE slug = 'free';

-- Ensure enterprise has correct fields
UPDATE public.subscription_plans SET
  price_monthly = NULL,
  price_yearly  = NULL,
  max_employees = 9999
WHERE slug = 'enterprise';
