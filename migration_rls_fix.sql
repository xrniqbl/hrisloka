-- ============================================================
-- KiniKerja — RLS Security Fix Migration
-- Fixes:
--   1. 19 overly-permissive tables from complete_migration.sql
--   2. Operator precedence bugs in Phase 4 policies
--   3. trainings table missing company isolation
--   4. trainings cross-tenant data leakage
--   5. onboarding_checklist overly-permissive fallback
-- ============================================================
-- Run AFTER complete_migration.sql and migration_phase4_security_complete.sql
-- Safe to run multiple times (DROP IF EXISTS + CREATE POLICY)
-- ============================================================

-- ── HELPER FUNCTIONS (idempotent) ──────────────────────────────
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT get_my_role() = 'founder';
$$;

CREATE OR REPLACE FUNCTION is_hr_or_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT get_my_role() IN ('hr_admin', 'super_admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION get_company_emp_ids()
RETURNS SETOF bigint LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id::bigint FROM employees WHERE company_id = get_my_company_id();
$$;


-- ============================================================
-- FIX 1: Replace blanket auth.role() = 'authenticated' policies
-- on 19 tables from complete_migration.sql with proper isolation
-- ============================================================

-- ── KPI RECORDS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_kpi_records" ON kpi_records;
DROP POLICY IF EXISTS "kpi_records_isolation" ON kpi_records;
CREATE POLICY "kpi_records_isolation" ON kpi_records
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── KPI METRICS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_kpi_metrics" ON kpi_metrics;
DROP POLICY IF EXISTS "kpi_metrics_isolation" ON kpi_metrics;
CREATE POLICY "kpi_metrics_isolation" ON kpi_metrics
  FOR ALL USING (
    kpi_record_id IN (
      SELECT id FROM kpi_records
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );

-- ── APPRAISALS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_appraisals" ON appraisals;
DROP POLICY IF EXISTS "appraisals_isolation" ON appraisals;
CREATE POLICY "appraisals_isolation" ON appraisals
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── JOB POSTINGS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_job_postings" ON job_postings;
DROP POLICY IF EXISTS "job_postings_public_read" ON job_postings;
DROP POLICY IF EXISTS "job_postings_company_write" ON job_postings;
CREATE POLICY "job_postings_public_read" ON job_postings
  FOR SELECT USING (status = 'open' OR company_id = get_my_company_id() OR is_founder());
CREATE POLICY "job_postings_company_write" ON job_postings
  FOR ALL USING ((company_id = get_my_company_id() AND is_hr_or_admin()) OR is_founder());

-- ── CANDIDATES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_candidates" ON candidates;
DROP POLICY IF EXISTS "candidates_isolation" ON candidates;
CREATE POLICY "candidates_isolation" ON candidates
  FOR ALL USING (
    job_id IN (
      SELECT id FROM job_postings WHERE company_id = get_my_company_id()
    )
    OR is_founder()
  );

-- ── ASSETS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_assets" ON assets;
DROP POLICY IF EXISTS "assets_isolation" ON assets;
CREATE POLICY "assets_isolation" ON assets
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());

-- ── OFFBOARDING ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_offboarding" ON offboarding;
DROP POLICY IF EXISTS "offboarding_isolation" ON offboarding;
CREATE POLICY "offboarding_isolation" ON offboarding
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── OFFBOARDING CHECKLIST ──────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_offboarding_checklist" ON offboarding_checklist;
DROP POLICY IF EXISTS "offboarding_checklist_isolation" ON offboarding_checklist;
CREATE POLICY "offboarding_checklist_isolation" ON offboarding_checklist
  FOR ALL USING (
    offboarding_id IN (
      SELECT id FROM offboarding
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );

-- ── PROJECTS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_projects" ON projects;
DROP POLICY IF EXISTS "projects_isolation" ON projects;
CREATE POLICY "projects_isolation" ON projects
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());

-- ── PROJECT ASSIGNMENTS ────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_project_assignments" ON project_assignments;
DROP POLICY IF EXISTS "project_assignments_isolation" ON project_assignments;
CREATE POLICY "project_assignments_isolation" ON project_assignments
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
    OR is_founder()
  );

-- ── TIMESHEETS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_timesheets" ON timesheets;
DROP POLICY IF EXISTS "timesheets_isolation" ON timesheets;
CREATE POLICY "timesheets_isolation" ON timesheets
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── SHIFTS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_shifts" ON shifts;
DROP POLICY IF EXISTS "shifts_isolation" ON shifts;
CREATE POLICY "shifts_isolation" ON shifts
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE company_id = get_my_company_id())
    OR branch_id IS NULL
    OR is_founder()
  );

-- ── SHIFT ASSIGNMENTS ──────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_shift_assignments" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_isolation" ON shift_assignments;
CREATE POLICY "shift_assignments_isolation" ON shift_assignments
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── HOLIDAYS ───────────────────────────────────────────────────
-- Holidays are national — read is public, write is founder-only
DROP POLICY IF EXISTS "auth_full_holidays" ON holidays;
DROP POLICY IF EXISTS "holidays_public_read" ON holidays;
DROP POLICY IF EXISTS "holidays_founder_write" ON holidays;
CREATE POLICY "holidays_public_read" ON holidays FOR SELECT USING (true);
CREATE POLICY "holidays_founder_write" ON holidays FOR ALL USING (is_founder());

-- ── LOANS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_loans" ON loans;
DROP POLICY IF EXISTS "loans_isolation" ON loans;
CREATE POLICY "loans_isolation" ON loans
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── LOAN PAYMENTS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_loan_payments" ON loan_payments;
DROP POLICY IF EXISTS "loan_payments_isolation" ON loan_payments;
CREATE POLICY "loan_payments_isolation" ON loan_payments
  FOR ALL USING (
    loan_id IN (
      SELECT id FROM loans
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );

-- ── OVERTIME REQUESTS ──────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_overtime_requests" ON overtime_requests;
DROP POLICY IF EXISTS "overtime_isolation" ON overtime_requests;
CREATE POLICY "overtime_isolation" ON overtime_requests
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── AI CAPABILITIES ────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_ai_capabilities" ON ai_capabilities;
DROP POLICY IF EXISTS "ai_capabilities_isolation" ON ai_capabilities;
CREATE POLICY "ai_capabilities_isolation" ON ai_capabilities
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- ── AI CERTIFICATIONS ──────────────────────────────────────────
DROP POLICY IF EXISTS "auth_full_ai_certifications" ON ai_certifications;
DROP POLICY IF EXISTS "ai_certifications_isolation" ON ai_certifications;
CREATE POLICY "ai_certifications_isolation" ON ai_certifications
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ============================================================
-- FIX 2: Operator precedence — add explicit parentheses
-- to all policies that mix AND/OR without grouping
-- ============================================================

-- ── PAYROLL RECORDS ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payroll_records') THEN
    EXECUTE 'DROP POLICY IF EXISTS "payroll_admin" ON payroll_records';
    EXECUTE 'DROP POLICY IF EXISTS "payroll_own" ON payroll_records';
    EXECUTE $p$
      CREATE POLICY "payroll_own" ON payroll_records FOR SELECT
        USING (employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid()))
    $p$;
    EXECUTE $p$
      CREATE POLICY "payroll_admin" ON payroll_records FOR ALL
        USING (
          (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
          OR is_founder()
        )
    $p$;
  END IF;
END;
$$;

-- ── BILLING INFO ───────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='billing_info') THEN
    EXECUTE 'DROP POLICY IF EXISTS "billing_info_isolation" ON billing_info';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='billing_info' AND column_name='company_id') THEN
      EXECUTE $p$CREATE POLICY "billing_info_isolation" ON billing_info FOR ALL USING ((company_id = get_my_company_id() AND is_hr_or_admin()) OR is_founder())$p$;
    ELSE
      EXECUTE $p$CREATE POLICY "billing_info_isolation" ON billing_info FOR ALL USING (is_founder())$p$;
    END IF;
  END IF;
END;
$$;

-- ── COMPANY SETTINGS WRITE ─────────────────────────────────────
DROP POLICY IF EXISTS "company_settings_write" ON company_settings;
DROP POLICY IF EXISTS "company_settings_write_v2" ON company_settings;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='company_settings' AND column_name='company_id'
  ) THEN
    EXECUTE $p$CREATE POLICY "company_settings_write" ON company_settings FOR ALL USING ((company_id = get_my_company_id() AND is_hr_or_admin()) OR is_founder())$p$;
  ELSE
    -- Fallback: only founder can write (no company_id column to scope by)
    EXECUTE $p$CREATE POLICY "company_settings_write" ON company_settings FOR ALL USING (is_founder())$p$;
  END IF;
END;
$$;

-- ── VOUCHERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "vouchers_active_read" ON vouchers;
CREATE POLICY "vouchers_active_read" ON vouchers
  FOR SELECT USING ((is_active = true AND auth.role() = 'authenticated') OR is_founder());

-- ── EMPLOYEE FACES ADMIN ───────────────────────────────────────
DROP POLICY IF EXISTS "employee_faces_admin" ON employee_faces;
CREATE POLICY "employee_faces_admin" ON employee_faces
  FOR ALL USING (
    (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ============================================================
-- FIX 3: Add company_id to trainings table + proper isolation
-- ============================================================

-- Add company_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trainings' AND column_name='company_id'
  ) THEN
    ALTER TABLE trainings ADD COLUMN company_id integer REFERENCES companies(id) ON DELETE CASCADE;
    -- Backfill: set company_id based on the first participant's company
    UPDATE trainings SET company_id = (
      SELECT e.company_id FROM training_participants tp
      JOIN employees e ON e.id = tp.employee_id
      WHERE tp.training_id = trainings.id
      LIMIT 1
    );
    -- Fallback for trainings with no participants
    UPDATE trainings SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
    ALTER TABLE trainings ALTER COLUMN company_id SET NOT NULL;
  ELSE
    -- company_id already exists — check if it's UUID (from create_missing_tables.sql)
    -- If so, drop it and recreate as integer to match companies.id (SERIAL)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='trainings' AND column_name='company_id' AND data_type = 'uuid'
    ) THEN
      ALTER TABLE trainings DROP COLUMN company_id;
      ALTER TABLE trainings ADD COLUMN company_id integer REFERENCES companies(id) ON DELETE CASCADE;
      UPDATE trainings SET company_id = (
        SELECT e.company_id FROM training_participants tp
        JOIN employees e ON e.id = tp.employee_id
        WHERE tp.training_id = trainings.id
        LIMIT 1
      );
      UPDATE trainings SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
      ALTER TABLE trainings ALTER COLUMN company_id SET NOT NULL;
    END IF;
  END IF;
END;
$$;


-- ============================================================
-- FIX 4: Replace trainings cross-tenant policies
-- ============================================================

DROP POLICY IF EXISTS "trainings_read" ON trainings;
DROP POLICY IF EXISTS "trainings_manage" ON trainings;
DROP POLICY IF EXISTS "trainings_isolation" ON trainings;
DROP POLICY IF EXISTS "trainings_select" ON trainings;

-- Only read trainings from own company (via participant join — works with or without company_id)
CREATE POLICY "trainings_read" ON trainings
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR id IN (SELECT training_id FROM training_participants WHERE employee_id::bigint IN (SELECT get_company_emp_ids()))
    OR is_founder()
  );

-- Only HR/Admin from own company can manage
CREATE POLICY "trainings_manage" ON trainings
  FOR ALL USING (
    (company_id = get_my_company_id() AND is_hr_or_admin())
    OR is_founder()
  );


-- ============================================================
-- FIX 5: onboarding_checklist — proper fallback
-- ============================================================

DROP POLICY IF EXISTS "onboarding_checklist_isolation" ON onboarding_checklist;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='onboarding')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_checklist' AND column_name='onboarding_id')
  THEN
    EXECUTE $p$
      CREATE POLICY "onboarding_checklist_isolation" ON onboarding_checklist
        FOR ALL USING (
          onboarding_id IN (
            SELECT id FROM onboarding
            WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
          )
          OR is_founder()
        )
    $p$;
  ELSE
    -- Fallback: founder-only (onboarding table missing or onboarding_id column missing)
    EXECUTE $p$
      CREATE POLICY "onboarding_checklist_isolation" ON onboarding_checklist
        FOR ALL USING (is_founder())
    $p$;
  END IF;
END;
$$;


-- ============================================================
-- VERIFY: Show all tables and their RLS status
-- ============================================================
SELECT tablename, rowsecurity AS rls_on,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policies
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'RLS Security Fix DONE ✓' AS status;
