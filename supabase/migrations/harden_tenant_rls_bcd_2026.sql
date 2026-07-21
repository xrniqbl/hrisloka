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
    'employee_contracts',
    'contract_templates',
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
