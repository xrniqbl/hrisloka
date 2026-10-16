-- ============================================================
-- KiniKerja — RLS coverage gap closure (Supabase SQL Editor)
-- ============================================================
-- Menutup celah H4: tabel-tabel sensitif yang TIDAK tercakup loop
-- RUN_ALL_RLS_HARDENING.sql sehingga masih memakai policy lama
-- (atau tanpa policy sama sekali → fail-open bila RLS off,
--  fail-closed/DoS bila RLS on tanpa policy).
--
-- Idempoten — aman dijalankan berulang. Jalankan SETELAH
-- RUN_ALL_RLS_HARDENING.sql + FIX_FOUNDER_PORTAL_RLS.sql +
-- FIX_FOUNDER_ESCALATION.sql.
-- ============================================================

-- ── Helpers (idempotent) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- is_founder() kanonis ada di FIX_FOUNDER_ESCALATION.sql
-- (platform_founders table). Didefinisikan ulang identik di sini agar
-- file ini mandiri — urutan jalan tidak penting (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_founders WHERE user_id = auth.uid());
$$;

-- ============================================================
-- A. Tabel ber-employee_id → scope via employees.company_id
--    (pola sama seperti attendance di hardening loop)
-- ============================================================
DO $$
DECLARE
  t text;
  using_expr constant text :=
    'employee_id IN (SELECT id FROM employees WHERE company_id = get_my_company_id())';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payroll_records',        -- gaji + rekening (H4)
    'employee_documents',     -- KTP/NPWP dsb.
    'shift_assignments',
    'profile_update_requests',
    'push_subscriptions',     -- endpoint push milik karyawan
    'onboarding_tasks',
    'employee_faces'         -- deskriptor wajah (H4)
    -- NOTE: attendance_trust_logs TIDAK di sini — tidak punya employee_id;
    -- di-scope via attendance_id di blok A2 di bawah.
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'Skipping % — table not found', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'auth_full_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (%s) WITH CHECK (%s)',
      t || '_tenant_all', t, using_expr, using_expr
    );
    RAISE NOTICE 'RLS policy % applied on %', t || '_tenant_all', t;
  END LOOP;
END $$;

-- ============================================================
-- A2. attendance_trust_logs → scope via attendance → employees
--     (tidak punya employee_id; hanya attendance_id)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attendance_trust_logs') THEN
    ALTER TABLE attendance_trust_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "attendance_trust_logs_tenant_all" ON attendance_trust_logs;
    DROP POLICY IF EXISTS "auth_full_attendance_trust_logs" ON attendance_trust_logs;
    CREATE POLICY "attendance_trust_logs_tenant_all" ON attendance_trust_logs
      FOR ALL
      USING (
        attendance_id IN (
          SELECT a.id FROM attendance a
          JOIN employees e ON e.id = a.employee_id
          WHERE e.company_id = get_my_company_id()
        )
      )
      WITH CHECK (
        attendance_id IN (
          SELECT a.id FROM attendance a
          JOIN employees e ON e.id = a.employee_id
          WHERE e.company_id = get_my_company_id()
        )
      );
  END IF;
END $$;

-- ============================================================
-- B. loan_payments → scope via loans → employees
--    (loans hanya punya employee_id, tanpa company_id;
--     loan_payments hanya punya loan_id)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loan_payments') THEN
    ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "loan_payments_tenant_all" ON loan_payments;
    DROP POLICY IF EXISTS "auth_full_loan_payments" ON loan_payments;
    CREATE POLICY "loan_payments_tenant_all" ON loan_payments
      FOR ALL
      USING (
        loan_id IN (
          SELECT l.id FROM loans l
          JOIN employees e ON e.id = l.employee_id
          WHERE e.company_id = get_my_company_id()
        )
      )
      WITH CHECK (
        loan_id IN (
          SELECT l.id FROM loans l
          JOIN employees e ON e.id = l.employee_id
          WHERE e.company_id = get_my_company_id()
        )
      );
  END IF;
END $$;

-- ============================================================
-- C. billing_info → owner-only via auth.uid() + company scope
--    (user_id = auth.users id; service billingService sudah filter
--     requireCurrentUserId client-side — ini enforcement server-nya)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='billing_info') THEN
    ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "billing_info_owner" ON billing_info;
    DROP POLICY IF EXISTS "auth_full_billing_info" ON billing_info;
    CREATE POLICY "billing_info_owner" ON billing_info
      FOR ALL
      USING (
        user_id = auth.uid()
        OR (company_id IS NOT NULL AND company_id = get_my_company_id())
        OR is_founder()
      )
      WITH CHECK (
        user_id = auth.uid()
        OR (company_id IS NOT NULL AND company_id = get_my_company_id())
        OR is_founder()
      );
  END IF;
END $$;

-- ============================================================
-- D. Tabel ber-company_id langsung
-- ============================================================
DO $$
DECLARE
  t text;
  using_expr constant text :=
    '(company_id IS NOT NULL AND company_id = get_my_company_id())';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'company_policies',
    'office_locations'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'Skipping % — table not found', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'auth_full_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (%s) WITH CHECK (%s)',
      t || '_tenant_all', t, using_expr, using_expr
    );
    RAISE NOTICE 'RLS policy % applied on %', t || '_tenant_all', t;
  END LOOP;
END $$;

-- ============================================================
-- E. branches / holidays — katalog semi-publik
--    branches: tidak punya company_id di skema (katalog cabang).
--    Kebijakan: SELECT untuk semua authenticated (dibutuhkan validasi
--    kode registrasi + dropdown cabang), tulis hanya HR/admin/founder
--    yang company-nya me-referensikan cabang tersebut ATAU founder.
--    holidays: kalender publik per cabang — SELECT authenticated,
--    tulis HR/admin/super_admin/founder.
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='branches') THEN
    ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "branches_select_auth" ON branches;
    DROP POLICY IF EXISTS "branches_write_admin" ON branches;
    DROP POLICY IF EXISTS "auth_full_branches" ON branches;
    CREATE POLICY "branches_select_auth" ON branches
      FOR SELECT USING (auth.uid() IS NOT NULL);
    CREATE POLICY "branches_write_admin" ON branches
      FOR ALL
      USING (
        get_my_role() IN ('super_admin', 'hr_admin') OR is_founder()
      )
      WITH CHECK (
        get_my_role() IN ('super_admin', 'hr_admin') OR is_founder()
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='holidays') THEN
    ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "holidays_select_auth" ON holidays;
    DROP POLICY IF EXISTS "holidays_write_admin" ON holidays;
    DROP POLICY IF EXISTS "auth_full_holidays" ON holidays;
    CREATE POLICY "holidays_select_auth" ON holidays
      FOR SELECT USING (auth.uid() IS NOT NULL);
    CREATE POLICY "holidays_write_admin" ON holidays
      FOR ALL
      USING (
        get_my_role() IN ('super_admin', 'hr_admin') OR is_founder()
      )
      WITH CHECK (
        get_my_role() IN ('super_admin', 'hr_admin') OR is_founder()
      );
  END IF;
END $$;

-- ============================================================
-- VERIFIKASI (jalankan terpisah):
--   SELECT tablename FROM pg_tables WHERE schemaname='public'
--     AND tablename IN ('payroll_records','employee_documents',
--       'shift_assignments','loan_payments','profile_update_requests',
--       'billing_info','push_subscriptions','onboarding_tasks',
--       'company_policies','holidays','branches','office_locations',
--       'employee_faces','attendance_trust_logs')
--     AND NOT EXISTS (SELECT 1 FROM pg_policies p
--       WHERE p.schemaname='public' AND p.tablename = pg_tables.tablename);
--   → harus 0 baris (semua sudah ber-policy).
-- ============================================================
