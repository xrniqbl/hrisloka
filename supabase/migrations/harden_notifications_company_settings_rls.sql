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

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "auth_full_notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_access" ON notifications;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "notifications_company" ON notifications;

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
