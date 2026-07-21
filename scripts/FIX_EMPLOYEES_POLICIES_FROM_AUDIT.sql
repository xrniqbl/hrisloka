-- ============================================================
-- FIX: employees policies after rls-audit (query 5)
-- Problem found in production audit:
--   employees_select  → USING (true)  = ANY authenticated user can read ALL employees
-- Plus overlapping legacy policies that weaken tenant isolation.
--
-- PostgreSQL RLS: for the same command (SELECT/UPDATE/...), policies are OR'd.
-- One bad policy with true / is_admin() without company scope defeats the good ones.
--
-- Run in Supabase SQL Editor. Idempotent.
-- ============================================================

-- Helpers (same as other harden scripts)
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

-- ── Drop ALL known employees policies (legacy + current) ─────
-- We rebuild a minimal safe set below.
DROP POLICY IF EXISTS "employees_admin_delete" ON employees;
DROP POLICY IF EXISTS "employees_admin_insert" ON employees;
DROP POLICY IF EXISTS "employees_company_isolation" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
DROP POLICY IF EXISTS "employees_founder_bypass" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_insert_hr" ON employees;
DROP POLICY IF EXISTS "employees_own_record_update" ON employees;
DROP POLICY IF EXISTS "employees_own_select" ON employees;
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_select_company" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_update_company" ON employees;
-- Extra aliases seen in older migrations
DROP POLICY IF EXISTS "employees_access" ON employees;
DROP POLICY IF EXISTS "auth_full_employees" ON employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON employees;

-- ── SELECT: same company OR own row (pending self before company_id) ──
CREATE POLICY "employees_select_tenant" ON employees
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = get_my_company_id()
    )
  );

-- ── UPDATE: own profile OR HR/admin of same company ──────────
CREATE POLICY "employees_update_own" ON employees
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "employees_update_company_admin" ON employees
  FOR UPDATE
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
  );

-- ── INSERT: HR/admin of same company only ────────────────────
CREATE POLICY "employees_insert_company_admin" ON employees
  FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
  );

-- Self-register path: new employee may insert own row with their auth_user_id
-- (company_id set via company_code flow). Restrict to self only.
CREATE POLICY "employees_insert_self" ON employees
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
  );

-- ── DELETE: HR/admin of same company only ────────────────────
CREATE POLICY "employees_delete_company_admin" ON employees
  FOR DELETE
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin')
  );

-- ── Founder bypass (platform operator only) ──────────────────
-- Matches email in platform_settings.key = 'founder_email'
-- If you prefer service_role only for founder, DROP this policy.
CREATE POLICY "employees_founder_bypass" ON employees
  FOR ALL
  USING (
    (auth.jwt() ->> 'email') = (
      SELECT value::text
      FROM platform_settings
      WHERE key = 'founder_email'
      LIMIT 1
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = (
      SELECT value::text
      FROM platform_settings
      WHERE key = 'founder_email'
      LIMIT 1
    )
  );

-- ── Verify: list remaining policies ──────────────────────────
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'employees'
ORDER BY policyname;

-- Expected after fix:
--   employees_select_tenant          SELECT  (own OR company)
--   employees_update_own             UPDATE
--   employees_update_company_admin   UPDATE
--   employees_insert_company_admin   INSERT
--   employees_insert_self            INSERT
--   employees_delete_company_admin   DELETE
--   employees_founder_bypass         ALL
-- NO policy with USING (true) or is_admin() alone.
