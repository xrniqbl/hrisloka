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
