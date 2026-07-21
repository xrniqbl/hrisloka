-- ============================================================
-- ONE-SHOT: Multi-tenant RLS hardening (Supabase SQL Editor)
-- Safe to re-run (idempotent DROP IF EXISTS).
-- After this, run scripts/rls-audit.sql separately and check query 2 = 0 rows.
-- ============================================================


-- ######## BEGIN supabase/migrations/fix_employees_rls_super_admin_leak.sql ########

-- ============================================================
-- CRITICAL FIX: Multi-tenant isolation for employees SELECT
-- ============================================================
-- Bug: policy "employees_company_isolation" allowed ANY super_admin
-- to SELECT all employees across ALL companies:
--   company_id = get_my_company_id() OR get_my_role() = 'super_admin'
--
-- super_admin is a *tenant* role (company owner), not platform founder.
-- They must only see their own company.
-- ============================================================

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

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_company_isolation" ON employees;

-- SELECT: same company only (includes super_admin of that company)
CREATE POLICY "employees_company_isolation" ON employees
  FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
  );

-- Keep own-record update (employee can edit self)
DROP POLICY IF EXISTS "employees_own_record_update" ON employees;
CREATE POLICY "employees_own_record_update" ON employees
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Insert: admin of same company only
DROP POLICY IF EXISTS "employees_admin_insert" ON employees;
CREATE POLICY "employees_admin_insert" ON employees
  FOR INSERT
  WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin', 'manager')
  );

-- Delete: super_admin / hr_admin of same company
DROP POLICY IF EXISTS "employees_admin_delete" ON employees;
CREATE POLICY "employees_admin_delete" ON employees
  FOR DELETE
  USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin')
  );

-- Note: Founder portal must use service_role or a dedicated is_founder() policy.
-- Do NOT open SELECT with get_my_role() = 'super_admin' globally.


-- ######## END supabase/migrations/fix_employees_rls_super_admin_leak.sql ########


-- ######## BEGIN supabase/migrations/harden_notifications_company_settings_rls.sql ########

-- ============================================================
-- Harden notifications + company_settings multi-tenant RLS
-- Run after fix_employees_rls_super_admin_leak.sql
-- ============================================================

-- Helpers (idempotent)
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
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

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── notifications ────────────────────────────────────────────
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Drop old / target policies so re-run is idempotent (SQL Editor safe)
DROP POLICY IF EXISTS "auth_full_notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_access" ON notifications;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "notifications_company" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own_or_company_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_company" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own_or_admin" ON notifications;

-- Employee: only own rows
-- Admin (same company): can insert for employees in their company + read those
CREATE POLICY "notifications_select_own_or_company_admin" ON notifications
  FOR SELECT
  USING (
    employee_id = get_my_employee_id()
    OR (
      get_my_role() IN ('super_admin', 'hr_admin', 'manager')
      AND employee_id IN (
        SELECT id FROM employees WHERE company_id = get_my_company_id()
      )
    )
  );

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (
    employee_id = get_my_employee_id()
    OR (
      get_my_role() IN ('super_admin', 'hr_admin')
      AND employee_id IN (
        SELECT id FROM employees WHERE company_id = get_my_company_id()
      )
    )
  );

CREATE POLICY "notifications_insert_company" ON notifications
  FOR INSERT
  WITH CHECK (
    employee_id = get_my_employee_id()
    OR (
      get_my_role() IN ('super_admin', 'hr_admin', 'manager')
      AND employee_id IN (
        SELECT id FROM employees WHERE company_id = get_my_company_id()
      )
    )
  );

CREATE POLICY "notifications_delete_own_or_admin" ON notifications
  FOR DELETE
  USING (
    employee_id = get_my_employee_id()
    OR (
      get_my_role() IN ('super_admin', 'hr_admin')
      AND employee_id IN (
        SELECT id FROM employees WHERE company_id = get_my_company_id()
      )
    )
  );

-- ── company_settings: prefer company_id column ───────────────
ALTER TABLE IF EXISTS company_settings
  ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS company_settings
  ADD COLUMN IF NOT EXISTS company_code text;

ALTER TABLE IF EXISTS company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_read" ON company_settings;
DROP POLICY IF EXISTS "company_settings_write" ON company_settings;
DROP POLICY IF EXISTS "company_settings_write_v2" ON company_settings;
DROP POLICY IF EXISTS "company_settings_tenant" ON company_settings;
DROP POLICY IF EXISTS "company_settings_tenant_select" ON company_settings;
DROP POLICY IF EXISTS "company_settings_tenant_write" ON company_settings;

CREATE POLICY "company_settings_tenant_select" ON company_settings
  FOR SELECT
  USING (
    (company_id IS NOT NULL AND company_id = get_my_company_id())
    OR (
      company_code IS NOT NULL
      AND company_code IN (
        SELECT c.company_code FROM companies c WHERE c.id = get_my_company_id()
      )
    )
  );

CREATE POLICY "company_settings_tenant_write" ON company_settings
  FOR ALL
  USING (
    get_my_role() IN ('super_admin', 'hr_admin')
    AND (
      (company_id IS NOT NULL AND company_id = get_my_company_id())
      OR (
        company_code IS NOT NULL
        AND company_code IN (
          SELECT c.company_code FROM companies c WHERE c.id = get_my_company_id()
        )
      )
    )
  )
  WITH CHECK (
    get_my_role() IN ('super_admin', 'hr_admin')
    AND (
      (company_id IS NOT NULL AND company_id = get_my_company_id())
      OR (
        company_code IS NOT NULL
        AND company_code IN (
          SELECT c.company_code FROM companies c WHERE c.id = get_my_company_id()
        )
      )
    )
  );

-- ── payroll_config tenant (if table exists) ──────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payroll_config'
  ) THEN
    ALTER TABLE payroll_config ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
    ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "payroll_config_tenant" ON payroll_config;
    EXECUTE $p$
      CREATE POLICY "payroll_config_tenant" ON payroll_config
      FOR ALL
      USING (
        (company_id IS NOT NULL AND company_id = get_my_company_id())
        OR (
          company_code IS NOT NULL
          AND company_code IN (SELECT c.company_code FROM companies c WHERE c.id = get_my_company_id())
        )
      )
      WITH CHECK (
        get_my_role() IN ('super_admin', 'hr_admin')
        AND (
          (company_id IS NOT NULL AND company_id = get_my_company_id())
          OR (
            company_code IS NOT NULL
            AND company_code IN (SELECT c.company_code FROM companies c WHERE c.id = get_my_company_id())
          )
        )
      )
    $p$;
  END IF;
END $$;


-- ######## END supabase/migrations/harden_notifications_company_settings_rls.sql ########


-- ######## BEGIN supabase/migrations/harden_tenant_rls_bcd_2026.sql ########

-- ============================================================
-- B: Harden multi-tenant RLS (no global super_admin leak)
-- super_admin = company owner, scoped to get_my_company_id()
-- Founder uses service_role / is_founder() elsewhere
--
-- SAFE for schemas where child tables have employee_id but NOT company_id
-- (e.g. attendance is keyed by employee_id only).
--
-- Run in Supabase SQL Editor after backup.
-- Idempotent: DROP POLICY IF EXISTS before CREATE.
-- ============================================================

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

-- Helper: does public.table have column?
-- Used inside DO blocks via information_schema

-- ── employees (re-affirm fix — company_id required) ──────────
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_company_isolation" ON employees;
CREATE POLICY "employees_company_isolation" ON employees
  FOR SELECT USING (
    company_id IS NOT NULL AND company_id = get_my_company_id()
  );

-- ── Generic tenant policies per table ────────────────────────
-- Strategy:
--   1) If table has company_id  → company_id = get_my_company_id()
--   2) Else if has employee_id  → employee belongs to my company
--   3) Else skip (raise NOTICE)

DO $$
DECLARE
  t text;
  has_company boolean;
  has_employee boolean;
  policy_name text;
  using_expr text;
  check_expr text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments',
    'attendance',
    'leave_requests',
    'overtime_requests',
    'reimbursements',
    'documents',
    'announcements',
    'job_postings',
    'candidates',
    'shifts',
    'payroll_runs',
    'contracts',
    'assets',
    'tickets',
    'projects',
    'trainings',
    'kpi_records',
    'appraisals',
    'loans',
    'timesheets'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) INTO has_company;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'employee_id'
    ) INTO has_employee;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    policy_name := t || '_tenant_all';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
    -- also drop older names used by prior migration versions
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_company_isolation', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'auth_full_' || t, t);

    IF has_company THEN
      using_expr := 'company_id = get_my_company_id()';
      check_expr := 'company_id = get_my_company_id()';
    ELSIF has_employee THEN
      -- Scope via employees.company_id (attendance etc. have no company_id)
      using_expr := format(
        'employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())'
      );
      check_expr := using_expr;
    ELSE
      RAISE NOTICE 'Skipping % — no company_id or employee_id column', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (%s) WITH CHECK (%s)',
      policy_name, t, using_expr, check_expr
    );

    RAISE NOTICE 'RLS policy % applied on % (company_id=%, employee_id=%)',
      policy_name, t, has_company, has_employee;
  END LOOP;
END $$;

-- ── companies: members can read own company only ─────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
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
    -- Insert: authenticated (owner setup creates company) — still no cross-read
    DROP POLICY IF EXISTS "companies_insert_auth" ON companies;
    CREATE POLICY "companies_insert_auth" ON companies
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

COMMENT ON FUNCTION get_my_company_id() IS
  'Tenant scope for RLS. super_admin is company-scoped, not global.';
COMMENT ON FUNCTION get_my_employee_id() IS
  'Current employee row id for the authenticated user.';


-- ######## END supabase/migrations/harden_tenant_rls_bcd_2026.sql ########
