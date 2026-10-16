-- ============================================================
-- Security audit remediation (2026-10-11)
-- Closes: C1 (permissive employees policies), C2 (canonical founder
-- source of truth), H1 (missing WITH CHECK on UPDATE), H2 (subscriptions
-- write scope), H5 (audit_trails anon INSERT + onboarding fallback).
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE; CREATE OR
-- REPLACE for helpers/trigger; table-existence guards via DO blocks.
-- Safe to apply on top of 20261011000000 (which must already be applied).
-- ============================================================

-- ── 0. Hardened helpers (SET search_path — closes M1 for good) ─
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$ SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$ SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$ SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1; $$;

-- ── C2. Canonical founder source of truth ─────────────────────
-- platform_founders (user_id) replaces the user-row-controlled
-- get_my_role()='founder' check and the email-vs-platform_settings bypass.
CREATE TABLE IF NOT EXISTS platform_founders (
  user_id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE platform_founders ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policy for anon/authenticated = deny default.
-- Only SQL operator / service_role can read/write.

-- BOOTSTRAP (operator only, run once in SQL Editor as owner):
--   INSERT INTO platform_founders (user_id, email)
--   SELECT id, email FROM auth.users WHERE email = '<FOUNDER_EMAIL>'
--   ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM platform_founders WHERE user_id = auth.uid()); $$;

-- Trigger: non-founders can never GRANT role='founder' (backstop that
-- closes every permissive INSERT/UPDATE policy variant at row level).
CREATE OR REPLACE FUNCTION prevent_founder_self_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $trig$
BEGIN
  IF COALESCE(NEW.role, '') = 'founder'
     AND auth.uid() IS NOT NULL
     AND NOT is_founder() THEN
    RAISE EXCEPTION 'forbidden: founder role grant';
  END IF;
  RETURN NEW;
END;
$trig$;

DROP TRIGGER IF EXISTS prevent_founder_self_grant ON employees;
CREATE TRIGGER prevent_founder_self_grant
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION prevent_founder_self_grant();

-- Drop the legacy email-based founder bypass (superseded by platform_founders).
DROP POLICY IF EXISTS "employees_founder_bypass" ON employees;

-- ── C1. Drop permissive Phase-4B employees policies ───────────
-- These are OR-ed with the hardened ones, so they must be DROPPED
-- (not merely shadowed): any same-company member could INSERT/UPDATE/
-- DELETE arbitrary employee rows, including minting role='founder'.
DROP POLICY IF EXISTS "employees_insert_hr" ON employees;
DROP POLICY IF EXISTS "employees_update_company" ON employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON employees;
-- employees_select_company (SELECT-only, self-read included) is safe — keep.

-- Hardened replacements (role-gated + WITH CHECK + founder-grant guard).
DROP POLICY IF EXISTS "employees_insert_role_gated" ON employees;
CREATE POLICY "employees_insert_role_gated" ON employees
  FOR INSERT
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin', 'manager')
    AND (role IS DISTINCT FROM 'founder' OR is_founder())
  );

DROP POLICY IF EXISTS "employees_update_role_gated" ON employees;
CREATE POLICY "employees_update_role_gated" ON employees
  FOR UPDATE
  USING (
    (company_id IS NOT NULL AND company_id = get_my_company_id()
     AND get_my_role() IN ('hr_admin', 'super_admin', 'manager'))
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND (role IS DISTINCT FROM 'founder' OR is_founder())
  );

DROP POLICY IF EXISTS "employees_delete_role_gated" ON employees;
CREATE POLICY "employees_delete_role_gated" ON employees
  FOR DELETE
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin')
  );

-- ── H1. WITH CHECK on UPDATE policies (tenant-hop via rewrite) ─
-- Postgres defaults WITH CHECK = USING when omitted, but the Phase-4B
-- UPDATE policies below predate that convention in this codebase and were
-- flagged; make the check explicit (and self-update safe where needed).

DROP POLICY IF EXISTS "attendance_update_company" ON attendance;
CREATE POLICY "attendance_update_company" ON attendance
  FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));

DROP POLICY IF EXISTS "leave_requests_update_company" ON leave_requests;
CREATE POLICY "leave_requests_update_company" ON leave_requests
  FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));

DROP POLICY IF EXISTS "reimbursements_update_company" ON reimbursements;
CREATE POLICY "reimbursements_update_company" ON reimbursements
  FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id()));

DROP POLICY IF EXISTS "announcements_update_company" ON announcements;
CREATE POLICY "announcements_update_company" ON announcements
  FOR UPDATE
  USING (company_id = get_my_company_id() OR company_id IS NULL)
  WITH CHECK (company_id = get_my_company_id() OR company_id IS NULL);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "contracts_update_company" ON contracts';
    EXECUTE 'CREATE POLICY "contracts_update_company" ON contracts FOR UPDATE USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    ) WITH CHECK (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
    )';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "candidates_update_company" ON candidates';
    EXECUTE 'CREATE POLICY "candidates_update_company" ON candidates FOR UPDATE USING (
      job_id IN (SELECT id FROM job_postings WHERE company_id = get_my_company_id())
    ) WITH CHECK (
      job_id IN (SELECT id FROM job_postings WHERE company_id = get_my_company_id())
    )';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_tasks') THEN
    EXECUTE 'DROP POLICY IF EXISTS "onboarding_tasks_update_company" ON onboarding_tasks';
    EXECUTE 'CREATE POLICY "onboarding_tasks_update_company" ON onboarding_tasks FOR UPDATE USING (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
      OR employee_id = get_my_employee_id()
    ) WITH CHECK (
      employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())
      OR employee_id = get_my_employee_id()
    )';
  END IF;
END $$;

-- ── H2. subscriptions: split read (tenant) from write (owner/admin) ─
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "subscriptions_tenant_all" ON public.subscriptions';
    -- Read: owner by user_id OR anyone in the same company.
    EXECUTE 'CREATE POLICY "subscriptions_tenant_read" ON public.subscriptions
      FOR SELECT USING (
        user_id = auth.uid() OR company_id = get_my_company_id()
      )';
    -- Write: owner OR company hr_admin/super_admin only.
    EXECUTE 'CREATE POLICY "subscriptions_owner_admin_write" ON public.subscriptions
      FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR (company_id = get_my_company_id()
            AND get_my_role() IN (''hr_admin'', ''super_admin''))
      )';
    EXECUTE 'CREATE POLICY "subscriptions_owner_admin_update" ON public.subscriptions
      FOR UPDATE USING (
        user_id = auth.uid()
        OR (company_id = get_my_company_id()
            AND get_my_role() IN (''hr_admin'', ''super_admin''))
      ) WITH CHECK (
        user_id = auth.uid()
        OR (company_id = get_my_company_id()
            AND get_my_role() IN (''hr_admin'', ''super_admin''))
      )';
    EXECUTE 'DROP POLICY IF EXISTS "subscriptions_owner_admin_delete" ON public.subscriptions';
    EXECUTE 'CREATE POLICY "subscriptions_owner_admin_delete" ON public.subscriptions
      FOR DELETE USING (
        user_id = auth.uid()
        OR (company_id = get_my_company_id()
            AND get_my_role() IN (''hr_admin'', ''super_admin''))
      )';
  END IF;
END $$;

-- ── H5a. audit_trails: anon INSERT removed (log spoofing/flooding) ─
-- The public job-application form writes via the service_role API route,
-- so anon direct INSERT is not needed. Authenticated writes are constrained
-- to rows they own (user_id = self).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_trails') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can insert audit_trails" ON audit_trails';
    EXECUTE 'DROP POLICY IF EXISTS "audit_trails_insert" ON audit_trails';
    EXECUTE 'CREATE POLICY "audit_trails_insert_own" ON audit_trails
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ── H5b. onboarding_checklist: close authenticated-fallback write ─
-- If the parent `onboarding` table is absent, replace the fail-open
-- FOR ALL authenticated policy with a deny (no rows) until the schema
-- is repaired — fail-closed instead of world-writable.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_checklist') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding') THEN
      EXECUTE 'DROP POLICY IF EXISTS "onboarding_checklist_isolation" ON onboarding_checklist';
      EXECUTE 'CREATE POLICY "onboarding_checklist_isolation" ON onboarding_checklist
        FOR ALL USING (false)';
    END IF;
  END IF;
END $$;

-- ── M5. subscription_plans: hide inactive plans from logins ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN
    EXECUTE 'DROP POLICY IF EXISTS "subscription_plans_auth_read" ON public.subscription_plans';
    EXECUTE 'CREATE POLICY "subscription_plans_auth_read" ON public.subscription_plans
      FOR SELECT TO authenticated
      USING (is_active = true)';
  END IF;
END $$;
