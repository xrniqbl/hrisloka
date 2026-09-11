-- ============================================================================
-- RUN_AFTER_AUDIT.sql — Satu script gabungan pasca-audit (Supabase SQL Editor)
-- ============================================================================
-- Jalankan ini SEBELUM go-live. Idempoten: aman dijalankan berulang.
--
-- Isi (urut eksekusi):
--   BAGIAN 0  Helper functions (get_my_role, get_my_company_id, dst.)
--   BAGIAN 1  Tutup leak super_admin global di employees
--             (= fix_employees_rls_super_admin_leak.sql)
--   BAGIAN 2  RLS notifications + company_settings + payroll_config
--             (= harden_notifications_company_settings_rls.sql)
--   BAGIAN 3  RLS core tables tenant-scoped
--             (= harden_tenant_rls_bcd_2026.sql)
--   BAGIAN 4  Schema hilang: billing_info + onboarding.company_id
--             (= fix_audit_missing_schema_2026.sql)
--
-- Setelah selesai: jalankan query verifikasi di docs/POST_AUDIT_CHECKLIST.md
-- ============================================================================

-- ############################################################################
-- BAGIAN 0 — Helper functions (dari harden_tenant_rls_bcd_2026.sql)
-- ############################################################################

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_my_role() = 'founder';
$$;

-- Helper: does public.table have column? (used by DO blocks below)
CREATE OR REPLACE FUNCTION fn_table_has_column(_table text, _column text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = _table AND column_name = _column
  );
$$;

-- ############################################################################
-- BAGIAN 1 — Fix employees super_admin leak (fix_employees_rls_super_admin_leak.sql)
-- ############################################################################

-- Drop policy lama yang bocor / legacy (super_admin global read, schema.sql lama)
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_select_all" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
DROP POLICY IF EXISTS "employees_company_isolation" ON public.employees;
DROP POLICY IF EXISTS "employees_own_record_update" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_delete" ON public.employees;

-- Policy tenant-scoped: anggota company hanya melihat company sendiri.
-- super_admin (owner) juga company-scoped, bukan global.
-- Semantik mengikuti fix_employees_rls_super_admin_leak.sql.
DROP POLICY IF EXISTS "employees_tenant_select" ON public.employees;
CREATE POLICY "employees_tenant_select" ON public.employees
  FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
  );

-- Employee boleh edit barisnya sendiri
DROP POLICY IF EXISTS "employees_own_record_update_v2" ON public.employees;
CREATE POLICY "employees_own_record_update_v2" ON public.employees
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Insert: admin company tsb
DROP POLICY IF EXISTS "employees_admin_insert_v2" ON public.employees;
CREATE POLICY "employees_admin_insert_v2" ON public.employees
  FOR INSERT
  WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin', 'manager')
  );

-- Update admin: kelola karyawan company sendiri
DROP POLICY IF EXISTS "employees_tenant_update" ON public.employees;
CREATE POLICY "employees_tenant_update" ON public.employees
  FOR UPDATE
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- Delete: super_admin / hr_admin company tsb
DROP POLICY IF EXISTS "employees_tenant_delete" ON public.employees;
CREATE POLICY "employees_tenant_delete" ON public.employees
  FOR DELETE
  USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin')
  );

-- self-access: karyawan selalu boleh baca barisnya sendiri
DROP POLICY IF EXISTS "employees_self_select" ON public.employees;
CREATE POLICY "employees_self_select" ON public.employees
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Founder full access (portal founder)
DROP POLICY IF EXISTS "employees_founder_all" ON public.employees;
CREATE POLICY "employees_founder_all" ON public.employees
  FOR ALL
  USING (public.is_founder())
  WITH CHECK (public.is_founder());

-- ############################################################################
-- BAGIAN 2 — notifications + company_settings + payroll_config
--            (harden_notifications_company_settings_rls.sql)
-- ############################################################################

DO $$
BEGIN
  -- notifications: production table has employee_id ONLY (no company_id —
  -- verified live 2026-09). Scope per-employee; admins manage via service
  -- layer / tenantGuard at the app level.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='notifications' AND column_name='company_id') THEN
      DROP POLICY IF EXISTS "notifications_tenant_all" ON public.notifications;
      CREATE POLICY "notifications_tenant_all" ON public.notifications
        FOR ALL USING (
          company_id = get_my_company_id()
          OR employee_id = get_my_employee_id()
        );
    ELSE
      DROP POLICY IF EXISTS "notifications_tenant_all" ON public.notifications;
      CREATE POLICY "notifications_tenant_all" ON public.notifications
        FOR ALL USING (employee_id = get_my_employee_id());
    END IF;
  END IF;

  -- company_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='company_settings')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='company_settings' AND column_name='company_id') THEN
    ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "company_settings_tenant_all" ON public.company_settings;
    CREATE POLICY "company_settings_tenant_all" ON public.company_settings
      FOR ALL USING (company_id = get_my_company_id());
  END IF;

  -- payroll_config
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='payroll_config')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='payroll_config' AND column_name='company_id') THEN
    ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "payroll_config_tenant_all" ON public.payroll_config;
    CREATE POLICY "payroll_config_tenant_all" ON public.payroll_config
      FOR ALL USING (company_id = get_my_company_id());
  END IF;
END $$;

-- ############################################################################
-- BAGIAN 3 — RLS core tables (harden_tenant_rls_bcd_2026.sql)
-- ############################################################################

DO $$
DECLARE
  t text;
  has_company boolean;
  has_employee boolean;
  using_expr  text;
  check_expr  text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attendance','leave_requests','reimbursements','overtime_requests',
    'timesheets','loans','loan_payments','payroll_records',
    'kpi_records','kpi_metrics','appraisals','self_assessments',
    'trainings','training_participants','training_materials',
    'documents','employee_documents','contract_templates','employee_contracts',
    'projects','project_assignments','assets',
    'onboarding','onboarding_checklist','onboarding_tasks',
    'offboarding','offboarding_checklist',
    'job_postings','candidates','career_settings',
    'tickets','announcements','company_policies',
    'branches','departments','divisions','holidays','branch_holidays',
    'shifts','shift_assignments','office_locations',
    'push_subscriptions','notification_preferences',
    'ai_capabilities','ai_certifications','company_snapshots','backup_logs'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name=t) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='company_id')
      INTO has_company;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='employee_id')
      INTO has_employee;

    -- Skip entirely (leave RLS state untouched) when neither scope column
    -- exists — enabling RLS here would create a deny-all and break features
    -- (e.g. onboarding_checklist is scoped via parent onboarding_id).
    IF NOT has_company AND NOT has_employee THEN
      RAISE NOTICE 'Skipping % — no company_id or employee_id column', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    policy_name := t || '_tenant_all';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_company_isolation', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_full_' || t, t);

    IF has_company THEN
      using_expr := 'company_id = get_my_company_id()';
      check_expr := 'company_id = get_my_company_id()';
    ELSIF has_employee THEN
      using_expr := 'employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())';
      check_expr := using_expr;
    ELSE
      RAISE NOTICE 'Skipping % — no company_id or employee_id column', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (%s) WITH CHECK (%s)',
      policy_name, t, using_expr, check_expr
    );
  END LOOP;
END $$;

-- companies: members read own company only
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='companies') THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "companies_select_own" ON companies;
    CREATE POLICY "companies_select_own" ON companies
      FOR SELECT USING (id = get_my_company_id());
    DROP POLICY IF EXISTS "companies_update_admin" ON companies;
    CREATE POLICY "companies_update_admin" ON companies
      FOR UPDATE USING (
        id = get_my_company_id()
        AND get_my_role() IN ('super_admin', 'hr_admin')
      );
    DROP POLICY IF EXISTS "companies_insert_auth" ON companies;
    CREATE POLICY "companies_insert_auth" ON companies
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ############################################################################
-- BAGIAN 4 — Schema hilang (fix_audit_missing_schema_2026.sql)
-- ############################################################################

-- ── 4a. billing_info ─────────────────────────────────────────
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

DROP POLICY IF EXISTS "billing_info_founder_read" ON public.billing_info;
CREATE POLICY "billing_info_founder_read" ON public.billing_info
  FOR SELECT
  USING (public.is_founder());

DROP POLICY IF EXISTS "billing_info_isolation" ON public.billing_info;

-- ── 4b. onboarding.company_id ────────────────────────────────
ALTER TABLE public.onboarding
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.onboarding o
SET company_id = e.company_id
FROM public.employees e
WHERE o.employee_id = e.id AND o.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_company ON public.onboarding(company_id);

-- (RLS onboarding sudah diatur di BAGIAN 3 via loop generik)

-- ============================================================================
-- SELESAI. Lanjut ke docs/POST_AUDIT_CHECKLIST.md untuk verifikasi.
-- ============================================================================
