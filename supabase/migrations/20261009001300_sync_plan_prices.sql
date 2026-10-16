-- Sync subscription_plans to canonical public pricing
-- Starter Rp 149.000 | Pro Rp 299.000 | Enterprise custom
-- Yearly stored as monthly×12×0.85 (15% off)

UPDATE public.subscription_plans SET
  price_monthly = 149000,
  price_yearly  = 1519800,
  max_employees = 25,
  is_active     = true,
  updated_at    = now()
WHERE slug = 'starter';

UPDATE public.subscription_plans SET
  price_monthly = 299000,
  price_yearly  = 3049800,
  max_employees = 100,
  is_active     = true,
  updated_at    = now()
WHERE slug = 'pro';

UPDATE public.subscription_plans SET
  price_monthly = NULL,
  price_yearly  = NULL,
  max_employees = 9999,
  is_active     = true,
  updated_at    = now()
WHERE slug = 'enterprise';

UPDATE public.subscription_plans SET is_active = false
WHERE slug = 'free';
