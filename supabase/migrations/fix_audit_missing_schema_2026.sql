-- ============================================================
-- fix_audit_missing_schema_2026.sql
--
-- Hasil audit (feature/theme-payment-align):
-- 1. `billing_info` dipakai src/services/billingService.js
--    (select/upsert keyed by user_id, onConflict: user_id) tetapi tidak ada
--    CREATE TABLE di repo — tabel ini harus ada sebelum RLS phase4
--    ("billing_info_isolation") bisa diterapkan.
-- 2. `onboarding` dipakai src/pages/OnboardingChecklist.jsx dengan kolom
--    company_id, tetapi definisi di migration_batch2.sql tidak memilikinya.
--
-- Idempoten — aman dijalankan berulang (Supabase SQL Editor).
--
-- LIVE-DB DRIFT WARNING (audit 2026-09): tipe companies.id di production
-- dapat berupa uuid (bukan integer seperti di repo). Script gabungan yang
-- type-aware adalah scripts/RUN_AFTER_AUDIT.sql — gunakan itu untuk
-- production. File ini adalah versi repo-repo asumsi integer.
-- ============================================================

-- ── 1. billing_info ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_info (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL,
  plan_name TEXT,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly') OR billing_cycle IS NULL),
  next_billing TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  payment_method TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_info_company ON public.billing_info(company_id);

ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_info_self_all" ON public.billing_info;
CREATE POLICY "billing_info_self_all" ON public.billing_info
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Founder melihat semua baris (kebutuhan portal founder bila ada)
DROP POLICY IF EXISTS "billing_info_founder_read" ON public.billing_info;
CREATE POLICY "billing_info_founder_read" ON public.billing_info
  FOR SELECT
  USING (public.is_founder());

-- Rapikan policy lama phase4 yang kondisional (jika sempat terbuat)
DROP POLICY IF EXISTS "billing_info_isolation" ON public.billing_info;

-- ── 2. onboarding.company_id ────────────────────────────────
ALTER TABLE public.onboarding
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill dari employee masing-masing baris
UPDATE public.onboarding o
SET company_id = e.company_id
FROM public.employees e
WHERE o.employee_id = e.id AND o.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_company ON public.onboarding(company_id);

ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_tenant_all" ON public.onboarding;
CREATE POLICY "onboarding_tenant_all" ON public.onboarding
  FOR ALL
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Baris lama tanpa company_id tetap terlihat oleh pemiliknya
DROP POLICY IF EXISTS "onboarding_self_row" ON public.onboarding;
CREATE POLICY "onboarding_self_row" ON public.onboarding
  FOR SELECT
  USING (employee_id = public.get_my_employee_id());

COMMENT ON TABLE public.billing_info IS
  'Per-user billing snapshot (billingService). Created by fix_audit_missing_schema_2026.sql.';
COMMENT ON COLUMN public.onboarding.company_id IS
  'Tenant scope. Added by fix_audit_missing_schema_2026.sql.';
