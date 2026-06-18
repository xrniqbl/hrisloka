-- ============================================================
-- Phase 4 FIXED v3 — explicit casts, no type mismatches
-- employees.id = SERIAL(int), some employee_id cols = BIGINT
-- projects.id = UUID, announcements.id = UUID
-- ============================================================

-- ── HELPER FUNCTIONS ─────────────────────────────────────────
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

-- Fungsi ini return BIGINT untuk aman dengan semua versi employee_id
CREATE OR REPLACE FUNCTION get_company_emp_ids()
RETURNS SETOF bigint LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id::bigint FROM employees WHERE company_id = get_my_company_id();
$$;


-- ── COMPANIES ────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_tenant_read"  ON companies;
DROP POLICY IF EXISTS "companies_founder_full" ON companies;

CREATE POLICY "companies_tenant_read" ON companies
  FOR SELECT USING (id = get_my_company_id() OR is_founder());

CREATE POLICY "companies_founder_full" ON companies
  FOR ALL USING (is_founder());


-- ── DEPARTMENTS ──────────────────────────────────────────────
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE departments SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_isolation" ON departments;

CREATE POLICY "departments_isolation" ON departments
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());


-- ── BRANCHES ─────────────────────────────────────────────────
ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE branches SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_isolation" ON branches;

CREATE POLICY "branches_isolation" ON branches
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());


-- ── PAYROLL RECORDS (pakai DO block — tabel mungkin tidak ada) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payroll_records') THEN
    EXECUTE 'ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "payroll_own" ON payroll_records';
    EXECUTE 'DROP POLICY IF EXISTS "payroll_admin" ON payroll_records';
    EXECUTE $p$
      CREATE POLICY "payroll_own" ON payroll_records FOR SELECT
        USING (employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid()))
    $p$;
    EXECUTE $p$
      CREATE POLICY "payroll_admin" ON payroll_records FOR ALL
        USING (
          employee_id::bigint IN (SELECT get_company_emp_ids())
          AND is_hr_or_admin()
          OR is_founder()
        )
    $p$;
  END IF;
END;
$$;


-- ── SHIFTS ───────────────────────────────────────────────────
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_isolation" ON shifts;

CREATE POLICY "shifts_isolation" ON shifts
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE company_id = get_my_company_id())
    OR branch_id IS NULL
    OR is_founder()
  );


-- ── SHIFT ASSIGNMENTS ────────────────────────────────────────
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_assignments_isolation" ON shift_assignments;

CREATE POLICY "shift_assignments_isolation" ON shift_assignments
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── OVERTIME REQUESTS ────────────────────────────────────────
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overtime_isolation" ON overtime_requests;

CREATE POLICY "overtime_isolation" ON overtime_requests
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── LOANS ────────────────────────────────────────────────────
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loans_isolation" ON loans;

CREATE POLICY "loans_isolation" ON loans
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── LOAN PAYMENTS ────────────────────────────────────────────
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loan_payments_isolation" ON loan_payments;

CREATE POLICY "loan_payments_isolation" ON loan_payments
  FOR ALL USING (
    loan_id IN (
      SELECT id FROM loans
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );


-- ── DOCUMENTS ────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_isolation" ON documents;

CREATE POLICY "documents_isolation" ON documents
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_documents_isolation" ON employee_documents;

CREATE POLICY "employee_documents_isolation" ON employee_documents
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── CONTRACTS ────────────────────────────────────────────────
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_templates_isolation" ON contract_templates;
CREATE POLICY "contract_templates_isolation" ON contract_templates
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());

ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_contracts_isolation" ON employee_contracts;
CREATE POLICY "employee_contracts_isolation" ON employee_contracts
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());


-- ── PROJECTS (id = UUID) ─────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE projects SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_isolation" ON projects;
CREATE POLICY "projects_isolation" ON projects
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());

-- project_assignments: project_id UUID, employee_id BIGINT
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_assignments_isolation" ON project_assignments;
CREATE POLICY "project_assignments_isolation" ON project_assignments
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
    OR is_founder()
  );


-- ── TIMESHEETS (employee_id BIGINT) ──────────────────────────
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timesheets_isolation" ON timesheets;

CREATE POLICY "timesheets_isolation" ON timesheets
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── KPI ──────────────────────────────────────────────────────
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_records_isolation" ON kpi_records;
CREATE POLICY "kpi_records_isolation" ON kpi_records
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_metrics_isolation" ON kpi_metrics;
CREATE POLICY "kpi_metrics_isolation" ON kpi_metrics
  FOR ALL USING (
    kpi_record_id IN (
      SELECT id FROM kpi_records
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );


-- ── APPRAISALS ───────────────────────────────────────────────
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appraisals_isolation" ON appraisals;
CREATE POLICY "appraisals_isolation" ON appraisals
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── TRAININGS ────────────────────────────────────────────────
-- trainings.company_id sudah ada sebagai UUID — jangan ADD COLUMN integer
-- Isolasi via training_participants.employee_id → employees.company_id

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trainings_isolation"  ON trainings;
DROP POLICY IF EXISTS "trainings_select"     ON trainings;
DROP POLICY IF EXISTS "trainings_manage"     ON trainings;

-- Semua yang login bisa baca training (global resource)
CREATE POLICY "trainings_read" ON trainings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya HR/Admin company sendiri (via participant) atau founder yang bisa kelola
CREATE POLICY "trainings_manage" ON trainings
  FOR ALL USING (
    id IN (
      SELECT training_id FROM training_participants
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    AND is_hr_or_admin()
    OR is_founder()
  );

ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_participants_isolation" ON training_participants;
CREATE POLICY "training_participants_isolation" ON training_participants
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_materials_isolation" ON training_materials;
CREATE POLICY "training_materials_isolation" ON training_materials
  FOR ALL USING (
    training_id IN (
      SELECT tp.training_id FROM training_participants tp
      WHERE tp.employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );


-- ── ASSETS ───────────────────────────────────────────────────
ALTER TABLE assets ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE assets SET company_id = (
  SELECT e.company_id FROM employees e WHERE e.id = assets.assigned_to::int LIMIT 1
) WHERE company_id IS NULL AND assigned_to IS NOT NULL;
UPDATE assets SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets_isolation" ON assets;
CREATE POLICY "assets_isolation" ON assets
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());


-- ── OFFBOARDING ──────────────────────────────────────────────
ALTER TABLE offboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offboarding_isolation" ON offboarding;
CREATE POLICY "offboarding_isolation" ON offboarding
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );

-- onboarding_checklist: company_id sudah ada sebagai UUID — jangan ADD COLUMN
-- Isolasi via onboarding_checklist.onboarding_id → onboarding.employee_id
ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_checklist_isolation" ON onboarding_checklist;

-- Cek apakah tabel onboarding ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='onboarding') THEN
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
    -- Fallback: semua yang login bisa baca (tabel onboarding tidak ada)
    EXECUTE $p$
      CREATE POLICY "onboarding_checklist_isolation" ON onboarding_checklist
        FOR ALL USING (auth.role() = 'authenticated' OR is_founder())
    $p$;
  END IF;
END;
$$;


-- ── COMPANY POLICIES ─────────────────────────────────────────
ALTER TABLE company_policies ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE company_policies SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE company_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_policies_isolation" ON company_policies;
CREATE POLICY "company_policies_isolation" ON company_policies
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());


-- ── TICKETS ──────────────────────────────────────────────────
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_isolation" ON tickets;
CREATE POLICY "tickets_isolation" ON tickets
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── NOTIFICATIONS ────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_isolation" ON notifications;
CREATE POLICY "notifications_isolation" ON notifications
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── OFFICE LOCATIONS ─────────────────────────────────────────
ALTER TABLE office_locations ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE office_locations SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "office_locations_isolation" ON office_locations;
CREATE POLICY "office_locations_isolation" ON office_locations
  FOR ALL USING (company_id = get_my_company_id() OR is_founder());


-- ── JOB POSTINGS ─────────────────────────────────────────────
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE job_postings SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_postings_public_read"   ON job_postings;
DROP POLICY IF EXISTS "job_postings_company_write" ON job_postings;
CREATE POLICY "job_postings_public_read" ON job_postings
  FOR SELECT USING (status = 'published' OR company_id = get_my_company_id() OR is_founder());
CREATE POLICY "job_postings_company_write" ON job_postings
  FOR ALL USING (company_id = get_my_company_id() AND is_hr_or_admin() OR is_founder());


-- ── SUBSCRIPTIONS ────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_own"          ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_founder_full" ON subscriptions;
CREATE POLICY "subscriptions_own"          ON subscriptions FOR SELECT USING (company_id = get_my_company_id() OR is_founder());
CREATE POLICY "subscriptions_founder_full" ON subscriptions FOR ALL   USING (is_founder());


-- ── BILLING INFO (optional table) ────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='billing_info') THEN
    EXECUTE 'ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "billing_info_isolation" ON billing_info';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='billing_info' AND column_name='company_id') THEN
      EXECUTE $p$CREATE POLICY "billing_info_isolation" ON billing_info FOR ALL USING (company_id = get_my_company_id() AND is_hr_or_admin() OR is_founder())$p$;
    ELSE
      EXECUTE $p$CREATE POLICY "billing_info_isolation" ON billing_info FOR ALL USING (is_founder())$p$;
    END IF;
  END IF;
END;
$$;


-- ── PROFILE UPDATE REQUESTS ──────────────────────────────────
ALTER TABLE profile_update_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_update_requests_isolation" ON profile_update_requests;
CREATE POLICY "profile_update_requests_isolation" ON profile_update_requests
  FOR ALL USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
    OR (employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin())
    OR is_founder()
  );


-- ── BRANCH HOLIDAYS ──────────────────────────────────────────
ALTER TABLE branch_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_holidays_isolation" ON branch_holidays;
CREATE POLICY "branch_holidays_isolation" ON branch_holidays
  FOR ALL USING (
    branch_id IN (SELECT id FROM branches WHERE company_id = get_my_company_id())
    OR is_founder()
  );


-- ── ATTENDANCE TRUST LOGS ────────────────────────────────────
ALTER TABLE attendance_trust_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trust_logs_isolation" ON attendance_trust_logs;
CREATE POLICY "trust_logs_isolation" ON attendance_trust_logs
  FOR ALL USING (
    attendance_id IN (
      SELECT id FROM attendance
      WHERE employee_id::bigint IN (SELECT get_company_emp_ids())
    )
    OR is_founder()
  );


-- ── EMPLOYEE FACES ───────────────────────────────────────────
ALTER TABLE employee_faces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_faces_own"   ON employee_faces;
DROP POLICY IF EXISTS "employee_faces_admin" ON employee_faces;
CREATE POLICY "employee_faces_own" ON employee_faces
  FOR SELECT USING (
    employee_id::bigint IN (SELECT id::bigint FROM employees WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "employee_faces_admin" ON employee_faces
  FOR ALL USING (
    employee_id::bigint IN (SELECT get_company_emp_ids()) AND is_hr_or_admin()
    OR is_founder()
  );


-- ── HOLIDAYS (nasional, baca semua) ──────────────────────────
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holidays_public_read"   ON holidays;
DROP POLICY IF EXISTS "holidays_founder_write" ON holidays;
CREATE POLICY "holidays_public_read"   ON holidays FOR SELECT USING (true);
CREATE POLICY "holidays_founder_write" ON holidays FOR ALL   USING (is_founder());


-- ── AUDIT TRAILS ─────────────────────────────────────────────
ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE SET NULL;
UPDATE audit_trails SET company_id = (
  SELECT e.company_id FROM employees e WHERE e.auth_user_id = audit_trails.user_id LIMIT 1
) WHERE company_id IS NULL;

ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_trails_insert" ON audit_trails;
DROP POLICY IF EXISTS "audit_trails_read"   ON audit_trails;
CREATE POLICY "audit_trails_insert" ON audit_trails FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_trails_read"   ON audit_trails FOR SELECT USING (company_id = get_my_company_id() OR is_founder());


-- ── PLATFORM SETTINGS ────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='platform_settings') THEN
    EXECUTE 'ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "platform_settings_read"    ON platform_settings';
    EXECUTE 'DROP POLICY IF EXISTS "platform_settings_founder" ON platform_settings';
    EXECUTE $p$CREATE POLICY "platform_settings_read"    ON platform_settings FOR SELECT USING (auth.role() = 'authenticated')$p$;
    EXECUTE $p$CREATE POLICY "platform_settings_founder" ON platform_settings FOR ALL    USING (is_founder())$p$;
  END IF;
END;
$$;


-- ── COMPANY SETTINGS ─────────────────────────────────────────
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE;
UPDATE company_settings SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_settings_read"     ON company_settings;
DROP POLICY IF EXISTS "company_settings_write"    ON company_settings;
DROP POLICY IF EXISTS "company_settings_read_v2"  ON company_settings;
DROP POLICY IF EXISTS "company_settings_write_v2" ON company_settings;
CREATE POLICY "company_settings_read"  ON company_settings FOR SELECT USING (company_id = get_my_company_id() OR is_founder());
CREATE POLICY "company_settings_write" ON company_settings FOR ALL    USING (company_id = get_my_company_id() AND is_hr_or_admin() OR is_founder());


-- ── FOUNDER TABLES ───────────────────────────────────────────
ALTER TABLE founder_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_broadcasts_read"   ON founder_broadcasts;
DROP POLICY IF EXISTS "founder_broadcasts_manage" ON founder_broadcasts;
CREATE POLICY "founder_broadcasts_read"   ON founder_broadcasts FOR SELECT USING (
  is_founder()
  OR (auth.role() = 'authenticated'
    AND (
      NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name='founder_broadcasts' AND column_name='target_company_id')
      OR (SELECT target_company_id::text FROM founder_broadcasts fb2
          WHERE fb2.id = founder_broadcasts.id) IS NULL
    )
  )
);
CREATE POLICY "founder_broadcasts_manage" ON founder_broadcasts FOR ALL USING (is_founder());

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vouchers_active_read" ON vouchers;
DROP POLICY IF EXISTS "vouchers_founder"     ON vouchers;
CREATE POLICY "vouchers_active_read" ON vouchers FOR SELECT USING (is_active = true AND auth.role() = 'authenticated' OR is_founder());
CREATE POLICY "vouchers_founder"     ON vouchers FOR ALL   USING (is_founder());

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_public_read"   ON subscription_plans;
DROP POLICY IF EXISTS "plans_founder_write" ON subscription_plans;
CREATE POLICY "plans_public_read"   ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "plans_founder_write" ON subscription_plans FOR ALL   USING (is_founder());


-- ── VERIFY ───────────────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_on,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policies
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'Phase 4 v3 DONE ✓' AS status;
