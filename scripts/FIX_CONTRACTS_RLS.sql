-- ============================================================
-- FIX: contract_templates + employee_contracts RLS
--
-- Why "contracts" showed rls_enabled=false in the scan:
--   App tables are named employee_contracts / contract_templates
--   (not "contracts"). Old migration also used:
--     USING (auth.role() = 'authenticated')  -- any logged-in user
--
-- Run in Supabase SQL Editor. Idempotent.
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

-- ── Ensure tables exist (no-op if already created) ───────────
CREATE TABLE IF NOT EXISTS contract_templates (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER       REFERENCES companies(id) ON DELETE CASCADE,
  name         VARCHAR(150)  NOT NULL,
  type         VARCHAR(30)   NOT NULL,
  html_content TEXT          NOT NULL DEFAULT '',
  is_default   BOOLEAN       DEFAULT false,
  description  TEXT,
  created_at   TIMESTAMPTZ   DEFAULT now(),
  updated_at   TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_contracts (
  id                  SERIAL        PRIMARY KEY,
  company_id          INTEGER       REFERENCES companies(id) ON DELETE CASCADE,
  employee_id         INTEGER       REFERENCES employees(id) ON DELETE CASCADE,
  template_id         INTEGER       REFERENCES contract_templates(id) ON DELETE SET NULL,
  contract_number     VARCHAR(100),
  type                VARCHAR(30)   NOT NULL,
  html_content        TEXT          NOT NULL DEFAULT '',
  status              VARCHAR(20)   DEFAULT 'draft',
  employee_signature  TEXT,
  company_signature   TEXT,
  employee_signed_at  TIMESTAMPTZ,
  company_signed_at   TIMESTAMPTZ,
  signed_at           TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  pdf_url             TEXT,
  notes               TEXT,
  metadata            JSONB         DEFAULT '{}',
  created_by          UUID,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  updated_at          TIMESTAMPTZ   DEFAULT now()
);

ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE employee_contracts
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE employee_contracts
  ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE;

-- ── Enable RLS ───────────────────────────────────────────────
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;

-- ── Drop ALL existing policies on both tables ────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contract_templates'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON contract_templates', r.policyname);
  END LOOP;

  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employee_contracts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON employee_contracts', r.policyname);
  END LOOP;
END $$;

-- ── contract_templates ───────────────────────────────────────
-- Default platform templates (is_default) readable by all auth users
-- Company templates only for own company
CREATE POLICY "contract_templates_select" ON contract_templates
  FOR SELECT
  USING (
    is_default = true
    OR (
      company_id IS NOT NULL
      AND company_id = get_my_company_id()
    )
  );

CREATE POLICY "contract_templates_write" ON contract_templates
  FOR ALL
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
  );

-- ── employee_contracts ───────────────────────────────────────
-- SELECT: same company OR employee viewing own contracts
CREATE POLICY "employee_contracts_select" ON employee_contracts
  FOR SELECT
  USING (
    (
      company_id IS NOT NULL
      AND company_id = get_my_company_id()
    )
    OR employee_id = get_my_employee_id()
    OR (
      employee_id IN (
        SELECT id FROM employees WHERE company_id = get_my_company_id()
      )
    )
  );

-- INSERT: HR of same company (and employee belongs to company)
CREATE POLICY "employee_contracts_insert" ON employee_contracts
  FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
    AND (
      employee_id IS NULL
      OR employee_id IN (
        SELECT id FROM employees WHERE company_id = get_my_company_id()
      )
    )
  );

-- UPDATE: HR same company OR employee signing own contract
CREATE POLICY "employee_contracts_update" ON employee_contracts
  FOR UPDATE
  USING (
    (
      company_id IS NOT NULL
      AND company_id = get_my_company_id()
      AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
    )
    OR employee_id = get_my_employee_id()
  )
  WITH CHECK (
    (
      company_id IS NOT NULL
      AND company_id = get_my_company_id()
    )
    OR employee_id = get_my_employee_id()
  );

-- DELETE: HR same company only
CREATE POLICY "employee_contracts_delete" ON employee_contracts
  FOR DELETE
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin')
  );

-- ── Verify ───────────────────────────────────────────────────
SELECT 'contract_templates' AS table_name, relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'contract_templates'
UNION ALL
SELECT 'employee_contracts', relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'employee_contracts';

SELECT tablename, policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contract_templates', 'employee_contracts')
ORDER BY tablename, policyname;

-- Expected:
--   both tables rls_enabled = true
--   no policy with auth.role() = 'authenticated' alone
