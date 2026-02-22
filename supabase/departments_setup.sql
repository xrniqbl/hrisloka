-- ================================================
-- HRISync — Departments Master Data
-- Jalankan SQL ini di Supabase SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_read_all" ON departments
  FOR SELECT USING (true);

CREATE POLICY "departments_admin_manage" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role = 'admin'
    )
  );

-- Seed Data: Standard Enterprise Departments
INSERT INTO departments (name, description) VALUES
  ('Human Resources & General Affairs', 'Pengelola SDM, rekrutmen, dan aset kantor'),
  ('Finance & Accounting', 'Keuangan, akuntansi, pajak, dan payroll'),
  ('Information Technology', 'Infrastruktur TI, pengembangan aplikasi, dan data'),
  ('Legal & Compliance', 'Legalitas, kontrak kerja, dan kepatuhan regulasi'),
  ('Sales & Business Development', 'Penjualan, akuisisi klien, dan ekspansi bisnis'),
  ('Marketing & Communications', 'Brand, kampanye digital, dan public relations'),
  ('Customer Service', 'Pelayanan pelanggan dan helpdesk'),
  ('Product & Design', 'Manajemen produk, UI/UX, dan riset pengguna'),
  ('Operations & Logistics', 'Operasional harian, supply chain, dan distribusi'),
  ('Production & Manufacturing', 'Produksi, quality control, dan manajemen pabrik')
ON CONFLICT (name) DO NOTHING;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE departments;

-- Update employees to reference departments table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id);
