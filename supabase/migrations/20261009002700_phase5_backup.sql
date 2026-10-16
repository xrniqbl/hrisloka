-- ============================================================
-- HRISync: Automated Backup System (Phase 5)
-- FIXED: mendefinisikan ulang semua helper functions agar
-- tidak bergantung pada Phase 4 berhasil dijalankan lebih dulu.
-- ============================================================

-- ── RE-CREATE HELPER FUNCTIONS (idempotent) ──────────────────
-- Harus ada sebelum tabel backup bisa pakai RLS

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

CREATE OR REPLACE FUNCTION get_company_employee_ids()
RETURNS SETOF integer LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM employees WHERE company_id = get_my_company_id();
$$;

CREATE TABLE IF NOT EXISTS backup_logs (
  id            bigserial PRIMARY KEY,
  backup_type   text        NOT NULL, -- 'auto_daily' | 'manual' | 'pre_delete'
  company_id    integer     REFERENCES companies(id) ON DELETE SET NULL,
  table_name    text,
  row_count     integer,
  backup_key    text        NOT NULL, -- storage path / identifier
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,          -- NULL = keep forever
  status        text        NOT NULL DEFAULT 'completed', -- 'pending'|'completed'|'failed'
  notes         text
);

ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backup_logs_company_read" ON backup_logs;
DROP POLICY IF EXISTS "backup_logs_founder_full" ON backup_logs;
CREATE POLICY "backup_logs_company_read" ON backup_logs
  FOR SELECT USING (company_id = get_my_company_id() OR is_founder());
CREATE POLICY "backup_logs_founder_full" ON backup_logs
  FOR ALL USING (is_founder());


-- ── 2. SNAPSHOT TABLE (data snapshot per company per hari) ───
-- Menyimpan snapshot JSON ringkasan data tiap perusahaan
CREATE TABLE IF NOT EXISTS company_snapshots (
  id            bigserial PRIMARY KEY,
  company_id    integer     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date date        NOT NULL DEFAULT CURRENT_DATE,
  employees_json  jsonb,
  departments_json jsonb,
  payroll_summary  jsonb,   -- bukan detail, hanya total
  attendance_count integer,
  leave_count      integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, snapshot_date)
);

ALTER TABLE company_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snapshots_company_read"   ON company_snapshots;
DROP POLICY IF EXISTS "snapshots_founder_full"   ON company_snapshots;
CREATE POLICY "snapshots_company_read" ON company_snapshots
  FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "snapshots_founder_full" ON company_snapshots
  FOR ALL USING (is_founder());


-- ── 3. SOFT DELETE AUDIT TABLE ───────────────────────────────
-- Sebelum data dihapus, simpan salinannya di sini
CREATE TABLE IF NOT EXISTS deleted_records (
  id            bigserial PRIMARY KEY,
  company_id    integer,
  table_name    text        NOT NULL,
  record_id     text        NOT NULL, -- original PK
  record_data   jsonb       NOT NULL, -- full row snapshot
  deleted_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at    timestamptz NOT NULL DEFAULT now(),
  restore_key   text,                 -- for easy restore reference
  is_restored   boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_company   ON deleted_records(company_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_table     ON deleted_records(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_deleted_at ON deleted_records(deleted_at);

ALTER TABLE deleted_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deleted_records_company_read" ON deleted_records;
DROP POLICY IF EXISTS "deleted_records_founder_full" ON deleted_records;
CREATE POLICY "deleted_records_company_read" ON deleted_records
  FOR SELECT USING (company_id = get_my_company_id() AND is_hr_or_admin());
CREATE POLICY "deleted_records_founder_full" ON deleted_records
  FOR ALL USING (is_founder());


-- ── 4. TRIGGERS: Auto-backup sebelum DELETE ─────────────────

-- Function: catat record sebelum dihapus
CREATE OR REPLACE FUNCTION fn_soft_delete_backup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id integer;
  v_restore_key text;
BEGIN
  -- Coba ambil company_id dari row yang akan dihapus
  BEGIN
    v_company_id := (row_to_json(OLD) ->> 'company_id')::integer;
  EXCEPTION WHEN OTHERS THEN
    v_company_id := NULL;
  END;

  -- Jika tidak ada company_id langsung, cari lewat employee_id
  IF v_company_id IS NULL THEN
    BEGIN
      v_company_id := (
        SELECT company_id FROM employees
        WHERE id = ((row_to_json(OLD) ->> 'employee_id')::integer)
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN
      v_company_id := NULL;
    END;
  END IF;

  v_restore_key := TG_TABLE_NAME || '_' || (row_to_json(OLD) ->> 'id') || '_' || to_char(now(), 'YYYYMMDD_HH24MI');

  INSERT INTO deleted_records (
    company_id, table_name, record_id, record_data, deleted_by, restore_key
  ) VALUES (
    v_company_id,
    TG_TABLE_NAME,
    (row_to_json(OLD) ->> 'id'),
    row_to_json(OLD)::jsonb,
    auth.uid(),
    v_restore_key
  );

  RETURN OLD;
END;
$$;


-- Pasang trigger pada tabel-tabel penting (safe — cek keberadaan tabel dulu)
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'employees', 'payroll_records', 'leave_requests', 'attendance',
    'reimbursements', 'documents', 'employee_documents',
    'employee_contracts', 'loans', 'loan_payments',
    'projects', 'timesheets', 'kpi_records', 'appraisals',
    'trainings', 'assets', 'departments', 'branches',
    'company_policies', 'job_postings', 'shift_assignments',
    'overtime_requests', 'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Hanya pasang trigger jika tabel ada
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Drop trigger lama (idempotent)
      EXECUTE format('DROP TRIGGER IF EXISTS trg_soft_delete_%I ON %I', tbl, tbl);
      -- Buat trigger baru
      EXECUTE format(
        'CREATE TRIGGER trg_soft_delete_%I
         BEFORE DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_soft_delete_backup()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;



-- ── 5. DAILY SNAPSHOT FUNCTION ───────────────────────────────
CREATE OR REPLACE FUNCTION fn_create_daily_snapshot(p_company_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_employees_json  jsonb;
  v_departments_json jsonb;
  v_payroll_summary  jsonb;
  v_attendance_count integer;
  v_leave_count      integer;
BEGIN
  -- Karyawan (tanpa data sensitif)
  SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'name', full_name, 'position', position,
    'department_id', department_id, 'role', role, 'status', status
  )) INTO v_employees_json
  FROM employees WHERE company_id = p_company_id;

  -- Departemen
  SELECT jsonb_agg(row_to_json(d)::jsonb)
  INTO v_departments_json
  FROM departments d WHERE company_id = p_company_id;

  -- Ringkasan payroll bulan ini
  SELECT jsonb_build_object(
    'month', to_char(now(), 'YYYY-MM'),
    'total_records', COUNT(*),
    'total_gross', COALESCE(SUM(gross_salary), 0),
    'total_net', COALESCE(SUM(net_salary), 0)
  ) INTO v_payroll_summary
  FROM payroll_records pr
  JOIN employees e ON e.id = pr.employee_id
  WHERE e.company_id = p_company_id
    AND to_char(pr.pay_period_start, 'YYYY-MM') = to_char(now(), 'YYYY-MM');

  -- Absensi hari ini
  SELECT COUNT(*) INTO v_attendance_count
  FROM attendance a
  JOIN employees e ON e.id = a.employee_id
  WHERE e.company_id = p_company_id
    AND a.date = CURRENT_DATE;

  -- Leave pending
  SELECT COUNT(*) INTO v_leave_count
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  WHERE e.company_id = p_company_id
    AND lr.status = 'pending';

  -- Upsert snapshot
  INSERT INTO company_snapshots (
    company_id, snapshot_date,
    employees_json, departments_json, payroll_summary,
    attendance_count, leave_count
  ) VALUES (
    p_company_id, CURRENT_DATE,
    v_employees_json, v_departments_json, v_payroll_summary,
    v_attendance_count, v_leave_count
  )
  ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
    employees_json   = EXCLUDED.employees_json,
    departments_json = EXCLUDED.departments_json,
    payroll_summary  = EXCLUDED.payroll_summary,
    attendance_count = EXCLUDED.attendance_count,
    leave_count      = EXCLUDED.leave_count,
    created_at       = now();

  -- Log backup
  INSERT INTO backup_logs (
    backup_type, company_id, backup_key, notes
  ) VALUES (
    'auto_daily', p_company_id,
    'snapshot_' || p_company_id || '_' || CURRENT_DATE,
    'Daily automated snapshot'
  );
END;
$$;


-- ── 6. RUN SNAPSHOT FOR ALL ACTIVE COMPANIES ─────────────────
CREATE OR REPLACE FUNCTION fn_run_all_daily_snapshots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM companies WHERE is_active = true LOOP
    BEGIN
      PERFORM fn_create_daily_snapshot(r.id);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO backup_logs (backup_type, company_id, backup_key, status, notes)
      VALUES ('auto_daily', r.id, 'snapshot_failed_' || r.id || '_' || CURRENT_DATE,
              'failed', SQLERRM);
    END;
  END LOOP;
END;
$$;


-- ── 7. RESTORE HELPER FUNCTION ───────────────────────────────
-- Founder bisa restore record yang terhapus
CREATE OR REPLACE FUNCTION fn_restore_deleted_record(p_restore_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record deleted_records%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Cek bahwa pemanggil adalah founder
  IF NOT is_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only founder can restore records');
  END IF;

  SELECT * INTO v_record FROM deleted_records
  WHERE restore_key = p_restore_key AND is_restored = false
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record not found or already restored');
  END IF;

  -- Return data for application-level restore
  UPDATE deleted_records SET is_restored = true WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'table_name', v_record.table_name,
    'record_id', v_record.record_id,
    'record_data', v_record.record_data,
    'deleted_at', v_record.deleted_at
  );
END;
$$;


-- ── 8. AUTO-CLEANUP: hapus backup lama (>90 hari) ────────────
CREATE OR REPLACE FUNCTION fn_cleanup_old_backups()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Hapus soft delete records lebih dari 90 hari, kecuali yang sudah di-restore
  DELETE FROM deleted_records
  WHERE deleted_at < now() - INTERVAL '90 days'
    AND is_restored = false;

  -- Hapus snapshot lebih dari 60 hari
  DELETE FROM company_snapshots
  WHERE snapshot_date < CURRENT_DATE - INTERVAL '60 days';

  -- Hapus backup logs lebih dari 120 hari
  DELETE FROM backup_logs
  WHERE created_at < now() - INTERVAL '120 days';
END;
$$;


-- ── 9. CRON SCHEDULE (pg_cron — aktifkan di Supabase dashboard) ──
-- Di Supabase: Database → Extensions → aktifkan pg_cron
-- Lalu jalankan perintah berikut SATU KALI di SQL Editor:
/*
  SELECT cron.schedule(
    'daily-snapshot-all',
    '0 1 * * *',                          -- Setiap hari jam 01:00 UTC
    $$SELECT fn_run_all_daily_snapshots()$$
  );

  SELECT cron.schedule(
    'weekly-cleanup-backups',
    '0 2 * * 0',                          -- Setiap Minggu jam 02:00 UTC
    $$SELECT fn_cleanup_old_backups()$$
  );
*/

-- ── 10. INDEXES untuk performa backup query ───────────────────
CREATE INDEX IF NOT EXISTS idx_company_snapshots_company_date
  ON company_snapshots(company_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_backup_logs_company_created
  ON backup_logs(company_id, created_at DESC);


-- ── SELESAI ───────────────────────────────────────────────────
SELECT 'Backup system migration complete ✓' AS status;
SELECT
  'Triggers installed on: employees, payroll_records, leave_requests, attendance, '
  'reimbursements, documents, employee_contracts, loans, projects, timesheets, '
  'kpi_records, appraisals, trainings, assets, departments, branches, job_postings'
  AS coverage;
