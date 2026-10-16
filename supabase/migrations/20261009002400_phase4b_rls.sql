-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: Phase 4B — Complete RLS for Missing Tables                     ║
-- ║  Covers: employees, attendance, leave_requests, reimbursements,             ║
-- ║  announcements, contracts, candidates + all supplementary tables            ║
-- ║  Run AFTER migration_phase4_security_complete.sql                           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: Ensure get_my_company_id() function exists (safe re-create)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS INT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS INT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EMPLOYEES TABLE (the most critical)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select_company" ON employees;
CREATE POLICY "employees_select_company" ON employees
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR auth_user_id = auth.uid()  -- employees can always read their own row
  );

DROP POLICY IF EXISTS "employees_insert_hr" ON employees;
CREATE POLICY "employees_insert_hr" ON employees
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
  );

DROP POLICY IF EXISTS "employees_update_company" ON employees;
CREATE POLICY "employees_update_company" ON employees
  FOR UPDATE USING (
    company_id = get_my_company_id()
    OR auth_user_id = auth.uid()  -- employees can update their own profile
  );

DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
CREATE POLICY "employees_delete_admin" ON employees
  FOR DELETE USING (company_id = get_my_company_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ATTENDANCE TABLE
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_company" ON attendance;
CREATE POLICY "attendance_select_company" ON attendance
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT WITH CHECK (
    employee_id = get_my_employee_id()
  );

DROP POLICY IF EXISTS "attendance_update_company" ON attendance;
CREATE POLICY "attendance_update_company" ON attendance
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id = get_my_company_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEAVE_REQUESTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_select_company" ON leave_requests;
CREATE POLICY "leave_requests_select_company" ON leave_requests
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "leave_requests_insert_own" ON leave_requests;
CREATE POLICY "leave_requests_insert_own" ON leave_requests
  FOR INSERT WITH CHECK (
    employee_id = get_my_employee_id()
  );

DROP POLICY IF EXISTS "leave_requests_update_company" ON leave_requests;
CREATE POLICY "leave_requests_update_company" ON leave_requests
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "leave_requests_delete_own" ON leave_requests;
CREATE POLICY "leave_requests_delete_own" ON leave_requests
  FOR DELETE USING (employee_id = get_my_employee_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. REIMBURSEMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reimbursements_select_company" ON reimbursements;
CREATE POLICY "reimbursements_select_company" ON reimbursements
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "reimbursements_insert_own" ON reimbursements;
CREATE POLICY "reimbursements_insert_own" ON reimbursements
  FOR INSERT WITH CHECK (
    employee_id = get_my_employee_id()
  );

DROP POLICY IF EXISTS "reimbursements_update_company" ON reimbursements;
CREATE POLICY "reimbursements_update_company" ON reimbursements
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "reimbursements_delete_own" ON reimbursements;
CREATE POLICY "reimbursements_delete_own" ON reimbursements
  FOR DELETE USING (employee_id = get_my_employee_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ANNOUNCEMENTS TABLE
-- Note: original table has no company_id — we add it if missing, then apply RLS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Add company_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'company_id'
  ) THEN
    EXECUTE 'ALTER TABLE announcements ADD COLUMN company_id INT REFERENCES companies(id) ON DELETE SET NULL';
  END IF;
END $$;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_company" ON announcements;
CREATE POLICY "announcements_select_company" ON announcements
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR company_id IS NULL  -- global platform announcements visible to all
  );

DROP POLICY IF EXISTS "announcements_insert_company" ON announcements;
CREATE POLICY "announcements_insert_company" ON announcements
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    OR company_id IS NULL
  );

DROP POLICY IF EXISTS "announcements_update_company" ON announcements;
CREATE POLICY "announcements_update_company" ON announcements
  FOR UPDATE USING (
    company_id = get_my_company_id() OR company_id IS NULL
  );

DROP POLICY IF EXISTS "announcements_delete_company" ON announcements;
CREATE POLICY "announcements_delete_company" ON announcements
  FOR DELETE USING (
    company_id = get_my_company_id() OR company_id IS NULL
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CONTRACTS TABLE (employee_contracts already covered — this is the template contracts)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
    EXECUTE 'ALTER TABLE contracts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_select_company" ON contracts';
    EXECUTE 'CREATE POLICY "contracts_select_company" ON contracts FOR SELECT USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_insert_company" ON contracts';
    EXECUTE 'CREATE POLICY "contracts_insert_company" ON contracts FOR INSERT WITH CHECK (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_update_company" ON contracts';
    EXECUTE 'CREATE POLICY "contracts_update_company" ON contracts FOR UPDATE USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_delete_company" ON contracts';
    EXECUTE 'CREATE POLICY "contracts_delete_company" ON contracts FOR DELETE USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CANDIDATES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
    EXECUTE 'ALTER TABLE candidates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "candidates_select_company" ON candidates';
    EXECUTE 'CREATE POLICY "candidates_select_company" ON candidates FOR SELECT USING (
      job_id IN (SELECT id FROM job_postings WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "candidates_insert_company" ON candidates';
    EXECUTE 'CREATE POLICY "candidates_insert_company" ON candidates FOR INSERT WITH CHECK (
      job_id IN (SELECT id FROM job_postings WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "candidates_update_company" ON candidates';
    EXECUTE 'CREATE POLICY "candidates_update_company" ON candidates FOR UPDATE USING (
      job_id IN (SELECT id FROM job_postings WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "candidates_delete_company" ON candidates';
    EXECUTE 'CREATE POLICY "candidates_delete_company" ON candidates FOR DELETE USING (
      job_id IN (SELECT id FROM job_postings WHERE company_id = get_my_company_id())
    )';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ONBOARDING_TASKS TABLE
-- Note: table only has employee_id (no direct company_id column)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_tasks') THEN
    EXECUTE 'ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "onboarding_tasks_select_company" ON onboarding_tasks';
    EXECUTE 'CREATE POLICY "onboarding_tasks_select_company" ON onboarding_tasks FOR SELECT USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "onboarding_tasks_insert_company" ON onboarding_tasks';
    EXECUTE 'CREATE POLICY "onboarding_tasks_insert_company" ON onboarding_tasks FOR INSERT WITH CHECK (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
    EXECUTE 'DROP POLICY IF EXISTS "onboarding_tasks_update_company" ON onboarding_tasks';
    EXECUTE 'CREATE POLICY "onboarding_tasks_update_company" ON onboarding_tasks FOR UPDATE USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
      OR employee_id = get_my_employee_id()
    )';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. OFFBOARDING_CHECKLIST TABLE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offboarding_checklist') THEN
    EXECUTE 'ALTER TABLE offboarding_checklist ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "offboarding_checklist_company" ON offboarding_checklist';
    EXECUTE 'CREATE POLICY "offboarding_checklist_company" ON offboarding_checklist FOR ALL USING (
      offboarding_id IN (
        SELECT o.id FROM offboarding o
        JOIN employees e ON e.id = o.employee_id
        WHERE e.company_id = get_my_company_id()
      )
    )';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. FACE_DESCRIPTORS / EMPLOYEE_FACES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'face_descriptors') THEN
    EXECUTE 'ALTER TABLE face_descriptors ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "face_descriptors_company" ON face_descriptors';
    EXECUTE 'CREATE POLICY "face_descriptors_company" ON face_descriptors FOR ALL USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
      OR employee_id = get_my_employee_id()
    )';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. NOTIFICATION_PREFERENCES TABLE
-- Dynamically handle: table may have company_id OR employee_id OR neither
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    EXECUTE 'ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "notif_prefs_company" ON notification_preferences';
    -- Check which isolation column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'notification_preferences' AND column_name = 'company_id'
    ) THEN
      EXECUTE 'CREATE POLICY "notif_prefs_company" ON notification_preferences FOR ALL USING (
        company_id = get_my_company_id()
      )';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'notification_preferences' AND column_name = 'employee_id'
    ) THEN
      EXECUTE 'CREATE POLICY "notif_prefs_company" ON notification_preferences FOR ALL USING (
        employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
        OR employee_id = get_my_employee_id()
      )';
    ELSE
      -- Add company_id column if neither exists
      EXECUTE 'ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE SET NULL';
      EXECUTE 'CREATE POLICY "notif_prefs_company" ON notification_preferences FOR ALL USING (
        company_id IS NULL OR company_id = get_my_company_id()
      )';
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. PAYROLL_CONFIG TABLE
-- Dynamically handle: table may have company_id or not
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_config') THEN
    EXECUTE 'ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "payroll_config_company" ON payroll_config';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payroll_config' AND column_name = 'company_id'
    ) THEN
      EXECUTE 'CREATE POLICY "payroll_config_company" ON payroll_config FOR ALL USING (
        company_id = get_my_company_id()
      )';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payroll_config' AND column_name = 'employee_id'
    ) THEN
      EXECUTE 'CREATE POLICY "payroll_config_company" ON payroll_config FOR ALL USING (
        employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
      )';
    ELSE
      EXECUTE 'ALTER TABLE payroll_config ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE SET NULL';
      EXECUTE 'CREATE POLICY "payroll_config_company" ON payroll_config FOR ALL USING (
        company_id IS NULL OR company_id = get_my_company_id()
      )';
    END IF;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- FOUNDER BYPASS: Super admin (founder) can read all data for support purposes
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Allow founder email bypass on employees table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='employees' AND policyname='employees_founder_bypass'
  ) THEN
    EXECUTE 'CREATE POLICY "employees_founder_bypass" ON employees FOR ALL USING (
      auth.jwt() ->> ''email'' = (SELECT value FROM platform_settings WHERE key = ''founder_email'' LIMIT 1)
    )';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Count total policies after this migration
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  policy_count INT;
  rls_table_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  SELECT COUNT(*) INTO rls_table_count 
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' AND c.relrowsecurity = true;
  
  RAISE NOTICE '✅ Phase 4B Complete: % total policies, % tables with RLS enabled', 
    policy_count, rls_table_count;
END $$;
