-- ================================================
-- HRISync — Enhanced RLS Policies
-- Run in Supabase SQL Editor
-- ================================================

-- ================================================
-- STEP 1: Add user_id column to employees if not exists
-- (needed by all RLS functions below)
-- ================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='user_id') THEN
    ALTER TABLE employees ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
  END IF;
END $$;

-- Helper: Create a function to check employee role
CREATE OR REPLACE FUNCTION get_employee_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM employees WHERE user_id = auth.uid() LIMIT 1),
    'employee'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user is admin (super_admin or hr_admin)  
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'hr_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get current employee ID
CREATE OR REPLACE FUNCTION get_employee_id()
RETURNS INT AS $$
  SELECT id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================
-- Employees table: Admins see all, employees see own
-- ================================================
DROP POLICY IF EXISTS "employees_select" ON employees;
CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "employees_insert" ON employees;
CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "employees_update" ON employees;
CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (
    is_admin() OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "employees_delete" ON employees;
CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (is_admin());

-- ================================================
-- Attendance: Admins see all, employees see own
-- ================================================
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance
  FOR SELECT USING (
    is_admin() OR employee_id = get_employee_id()
  );

DROP POLICY IF EXISTS "attendance_modify" ON attendance;
CREATE POLICY "attendance_modify" ON attendance
  FOR ALL USING (
    is_admin() OR employee_id = get_employee_id()
  ) WITH CHECK (
    is_admin() OR employee_id = get_employee_id()
  );

-- ================================================
-- Leave Requests: Admins see all, employees see own
-- ================================================
DROP POLICY IF EXISTS "leaves_select" ON leave_requests;
CREATE POLICY "leaves_select" ON leave_requests
  FOR SELECT USING (
    is_admin() OR employee_id = get_employee_id()
  );

DROP POLICY IF EXISTS "leaves_modify" ON leave_requests;
CREATE POLICY "leaves_modify" ON leave_requests
  FOR ALL USING (
    is_admin() OR employee_id = get_employee_id()
  ) WITH CHECK (
    is_admin() OR employee_id = get_employee_id()
  );

-- ================================================
-- Payroll Records: Admin only
-- ================================================
DROP POLICY IF EXISTS "payroll_admin" ON payroll_records;
CREATE POLICY "payroll_admin" ON payroll_records
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Payroll Records (employee view own payslips)
DROP POLICY IF EXISTS "payslips_access" ON payroll_records;
CREATE POLICY "payslips_access" ON payroll_records
  FOR SELECT USING (
    is_admin() OR employee_id = get_employee_id()
  );

-- ================================================
-- Notifications: Employees see own only
-- ================================================
DROP POLICY IF EXISTS "auth_full_notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_access" ON notifications;
CREATE POLICY "notifications_access" ON notifications
  FOR ALL USING (
    is_admin() OR employee_id = get_employee_id()
  ) WITH CHECK (
    is_admin() OR employee_id = get_employee_id()
  );

-- ================================================
-- Audit Trail: Admin only read
-- ================================================
DROP POLICY IF EXISTS "auth_full_audit_trails" ON audit_trails;
DROP POLICY IF EXISTS "audit_trail_admin" ON audit_trails;
CREATE POLICY "audit_trail_admin" ON audit_trails
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "audit_trail_insert" ON audit_trails;
CREATE POLICY "audit_trail_insert" ON audit_trails
  FOR INSERT WITH CHECK (true);

-- ================================================
-- Company Settings table (new)
-- ================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_by INT REFERENCES employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_read" ON company_settings;
CREATE POLICY "company_settings_read" ON company_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "company_settings_write" ON company_settings;
CREATE POLICY "company_settings_write" ON company_settings
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Seed default company settings
INSERT INTO company_settings (key, value) VALUES
  ('company_name', 'PT HRISync Indonesia'),
  ('company_address', 'Jl. Sudirman No. 123, Jakarta Selatan'),
  ('company_phone', '(021) 555-0123'),
  ('company_website', 'hrisync.id')
ON CONFLICT (key) DO NOTHING;

