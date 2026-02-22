-- ================================================
-- HRISync — Multi-Branch Setup
-- Jalankan SQL ini di Supabase SQL Editor
-- ================================================

-- 1. Branches table
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT DEFAULT 100,
  timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add branch_id and role to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'employee';

-- 3. Add branch_id to shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id);

-- 4. Branch-specific holidays (many-to-many)
CREATE TABLE IF NOT EXISTS branch_holidays (
  id SERIAL PRIMARY KEY,
  branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
  holiday_id INT REFERENCES holidays(id) ON DELETE CASCADE,
  UNIQUE(branch_id, holiday_id)
);

-- ================================================
-- RLS Policies
-- ================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_holidays ENABLE ROW LEVEL SECURITY;

-- Branches: all authenticated users can read
CREATE POLICY "branches_read_all" ON branches
  FOR SELECT USING (true);

-- Branches: only admin can manage
CREATE POLICY "branches_admin_manage" ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role = 'admin'
    )
  );

-- Branch holidays: all authenticated can read
CREATE POLICY "branch_holidays_read_all" ON branch_holidays
  FOR SELECT USING (true);

-- Branch holidays: only admin can manage
CREATE POLICY "branch_holidays_admin_manage" ON branch_holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role = 'admin'
    )
  );

-- ================================================
-- Seed Data: 3 Demo Branches
-- ================================================
INSERT INTO branches (name, code, address, phone, latitude, longitude, radius_meters, timezone) VALUES
  ('Kantor Pusat Jakarta', 'HQ-JKT', 'Jl. Sudirman No. 1, Jakarta Selatan', '021-1234567', -6.2088000, 106.8456000, 100, 'Asia/Jakarta'),
  ('Branch Bandung', 'BR-BDG', 'Jl. Braga No. 15, Bandung', '022-7654321', -6.9175000, 107.6191000, 150, 'Asia/Jakarta'),
  ('Branch Surabaya', 'BR-SBY', 'Jl. Tunjungan No. 8, Surabaya', '031-9876543', -7.2575000, 112.7521000, 120, 'Asia/Jakarta');

-- Link existing employees to HQ branch
UPDATE employees SET branch_id = 1, role = 'employee' WHERE branch_id IS NULL;
-- Set first employee as admin
UPDATE employees SET role = 'admin' WHERE nip = 'EMP-2024-001';
-- Set a branch admin for Bandung
UPDATE employees SET role = 'branch_admin', branch_id = 2 WHERE nip = 'EMP-2024-006';

-- ================================================
-- Enable Realtime
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE branches;
ALTER PUBLICATION supabase_realtime ADD TABLE branch_holidays;

-- ================================================
-- Branch Enhancement: location_type & manager_id
-- ================================================
ALTER TABLE branches ADD COLUMN IF NOT EXISTS location_type VARCHAR(30) DEFAULT 'branch_office';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_id INT REFERENCES employees(id);

-- Update seed data with location types
UPDATE branches SET location_type = 'headquarter' WHERE code = 'HQ-JKT';
UPDATE branches SET location_type = 'branch_office' WHERE code = 'BR-BDG';
UPDATE branches SET location_type = 'branch_office' WHERE code = 'BR-SBY';

