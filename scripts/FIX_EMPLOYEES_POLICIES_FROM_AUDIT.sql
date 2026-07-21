-- ============================================================
-- FIX: employees policies (idempotent rebuild)
-- Safe to re-run even if a previous attempt partially succeeded.
--
-- Problem: overlapping policies + employees_select USING (true)
-- Postgres ORs policies for the same command — one bad policy
-- defeats the good ones.
--
-- Run in Supabase SQL Editor.
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

-- ── Drop EVERY employees policy (legacy + target names) ──────
-- Dynamic: catches any policy we might have missed by name.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON employees', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- ── SELECT: own row OR same company ──────────────────────────
CREATE POLICY "employees_select_tenant" ON employees
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = get_my_company_id()
    )
  );

-- ── UPDATE: own profile ──────────────────────────────────────
CREATE POLICY "employees_update_own" ON employees
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ── UPDATE: HR/admin of same company ─────────────────────────
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

-- ── INSERT: HR/admin of same company ─────────────────────────
CREATE POLICY "employees_insert_company_admin" ON employees
  FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
  );

-- ── INSERT: self-register (own auth_user_id only) ────────────
CREATE POLICY "employees_insert_self" ON employees
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
  );

-- ── DELETE: HR/super_admin of same company ───────────────────
CREATE POLICY "employees_delete_company_admin" ON employees
  FOR DELETE
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin')
  );

-- ── Founder bypass (platform operator only) ──────────────────
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

-- ── Verify remaining policies ────────────────────────────────
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'employees'
ORDER BY policyname;

-- Expected (~7 policies):
--   employees_select_tenant
--   employees_update_own
--   employees_update_company_admin
--   employees_insert_company_admin
--   employees_insert_self
--   employees_delete_company_admin
--   employees_founder_bypass
-- NONE with USING (true) or bare is_admin().
