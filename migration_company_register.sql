-- ============================================================
-- Migration: Multi-Company + Employee Self-Registration
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tabel companies (multi-tenant: 1 perusahaan = 1 kode unik)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  company_code VARCHAR(20) UNIQUE NOT NULL,   -- Format: HRSLK-XXXXXX, auto-generated, immutable
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(30),
  website VARCHAR(200),
  industry VARCHAR(100),
  employee_count_limit INT DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup kode perusahaan (sering dipakai saat registrasi)
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- 2. Kolom baru di tabel employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';
  -- 'pending_verification' | 'active' | 'rejected'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS verified_by INT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(10);        -- 'male' | 'female'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;             -- sudah ada? kalau belum

-- Index untuk query pending verifikasi
CREATE INDEX IF NOT EXISTS idx_employees_account_status ON employees(account_status);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- 3. RLS untuk companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_read_authenticated" ON companies;
CREATE POLICY "companies_read_authenticated" ON companies
  FOR SELECT USING (true);   -- Siapa saja bisa baca kode perusahaan (untuk validasi saat registrasi)

DROP POLICY IF EXISTS "companies_write_authenticated" ON companies;
CREATE POLICY "companies_write_authenticated" ON companies
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Generate kode unik untuk perusahaan demo/existing
-- Fungsi helper untuk generate kode unik
CREATE OR REPLACE FUNCTION generate_company_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := 'HRSLK-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Insert perusahaan demo (jika belum ada)
INSERT INTO companies (name, company_code, is_active)
VALUES ('PT HRIS Loka Indonesia', generate_company_code(), true)
ON CONFLICT DO NOTHING;

-- 5. View: pending employee registrations (untuk admin dashboard)
CREATE OR REPLACE VIEW pending_employee_registrations AS
SELECT
  e.id,
  e.name,
  e.email,
  e.phone,
  e.photo_url,
  e.division,
  e.position,
  e.join_date,
  e.nik,
  e.birth_date,
  e.gender,
  e.address,
  e.account_status,
  e.rejection_reason,
  e.registered_at,
  e.verified_at,
  c.name AS company_name,
  c.company_code
FROM employees e
LEFT JOIN companies c ON e.company_id = c.id
WHERE e.account_status = 'pending_verification'
ORDER BY e.registered_at DESC;

-- 6. Trigger: auto-update updated_at di companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();
