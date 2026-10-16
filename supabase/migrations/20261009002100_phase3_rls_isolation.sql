-- ============================================================
-- HRISync Migration: Row Level Security — Multi-Tenant Isolation
-- Run AFTER migration_phase2_settings.sql
-- Safe, idempotent — aman dijalankan berkali-kali (DROP IF EXISTS sebelum CREATE)
-- ============================================================

-- ── HELPER FUNCTION ───────────────────────────────────────────────────────────
-- SECURITY DEFINER = bypass RLS saat dipanggil, mencegah infinite recursion
-- di dalam employees RLS policy.

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;


-- ── ANNOUNCEMENTS: Add company_id column ──────────────────────────────────────
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE SET NULL;

-- Assign existing announcements to the first company (jika belum ada)
UPDATE announcements
  SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1)
  WHERE company_id IS NULL;


-- ── EMPLOYEES TABLE ───────────────────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_company_isolation"  ON employees;
DROP POLICY IF EXISTS "employees_own_record_update"  ON employees;
DROP POLICY IF EXISTS "employees_admin_insert"       ON employees;

-- Read: bisa lihat semua karyawan di perusahaan yang sama
CREATE POLICY "employees_company_isolation" ON employees
  FOR SELECT
  USING (
    company_id = get_my_company_id()
    OR get_my_role() = 'super_admin'
  );

-- Update: hanya bisa update record sendiri
CREATE POLICY "employees_own_record_update" ON employees
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Insert: HR/Admin bisa tambah karyawan ke perusahaan sendiri
CREATE POLICY "employees_admin_insert" ON employees
  FOR INSERT
  WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin')
  );


-- ── LEAVE REQUESTS ────────────────────────────────────────────────────────────
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_own_access"          ON leave_requests;
DROP POLICY IF EXISTS "leave_company_read"        ON leave_requests;
DROP POLICY IF EXISTS "leave_company_admin_access" ON leave_requests;

-- Karyawan lihat cuti sendiri, Admin lihat semua di perusahaannya
CREATE POLICY "leave_company_admin_access" ON leave_requests
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM employees target
      WHERE target.id = leave_requests.employee_id
        AND target.company_id = get_my_company_id()
        AND get_my_role() IN ('hr_admin', 'manager', 'super_admin')
    )
  );


-- ── REIMBURSEMENTS ────────────────────────────────────────────────────────────
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reimbursements_company_isolation" ON reimbursements;

CREATE POLICY "reimbursements_company_isolation" ON reimbursements
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM employees target
      WHERE target.id = reimbursements.employee_id
        AND target.company_id = get_my_company_id()
        AND get_my_role() IN ('hr_admin', 'manager', 'super_admin')
    )
  );


-- ── ATTENDANCE ────────────────────────────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_company_isolation" ON attendance;

CREATE POLICY "attendance_company_isolation" ON attendance
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM employees target
      WHERE target.id = attendance.employee_id
        AND target.company_id = get_my_company_id()
        AND get_my_role() IN ('hr_admin', 'manager', 'super_admin')
    )
  );


-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop SEMUA policy announcements (termasuk yang sebelumnya sudah ada)
DROP POLICY IF EXISTS "announcements_company_isolation" ON announcements;
DROP POLICY IF EXISTS "announcements_admin_write"       ON announcements;
DROP POLICY IF EXISTS "announcements_admin_modify"      ON announcements;
DROP POLICY IF EXISTS "announcements_admin_delete"      ON announcements;

-- Read: pengumuman perusahaan sendiri, atau pengumuman global (company_id NULL)
CREATE POLICY "announcements_company_isolation" ON announcements
  FOR SELECT
  USING (
    company_id = get_my_company_id()
    OR company_id IS NULL
  );

-- Insert: HR Admin atau Super Admin perusahaan sendiri
CREATE POLICY "announcements_admin_write" ON announcements
  FOR INSERT
  WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin')
  );

-- Update: sama, hanya admin perusahaan sendiri
CREATE POLICY "announcements_admin_modify" ON announcements
  FOR UPDATE
  USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin')
  );

-- Delete: sama
CREATE POLICY "announcements_admin_delete" ON announcements
  FOR DELETE
  USING (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin')
  );


-- ── DONE ──────────────────────────────────────────────────────────────────────
SELECT 'RLS multi-tenant isolation policies applied ✓' AS status;
