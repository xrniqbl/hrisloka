-- ============================================================
-- SEED REFERENCE DATA — KiniKerja / HRISync
-- Safe reference seeds only. No demo employees, no demo attendance,
-- no demo branches/policies — those stay out of the repo baseline.
-- All statements use ON CONFLICT DO NOTHING (safe to re-run).
-- Apply after 20261009000000_baseline_schema.sql.
-- Canonical pricing: Starter Rp 149.000/bln, Pro Rp 299.000/bln
-- (yearly = monthly x 12 x 0.85), Enterprise custom, Free inactive.
-- ============================================================

-- 1. Office locations (2 rows, from supabase_setup.sql)
INSERT INTO office_locations (name, latitude, longitude, radius_meters) VALUES
  ('Kantor Pusat Jakarta', -6.2088, 106.8456, 100),
  ('Branch Office Bandung', -6.9175, 107.6191, 150)
ON CONFLICT DO NOTHING;

-- 2. Departments (from supabase/departments_setup.sql)
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

-- 3. National holidays 2026 (from complete_migration.sql; no unique
-- key on holidays, so plain ON CONFLICT DO NOTHING guards re-runs
-- against any unique violation without assuming a constraint)
INSERT INTO holidays (name, date, description) VALUES
  ('Tahun Baru', '2026-01-01', 'Hari libur nasional'),
  ('Isra Mi''raj', '2026-02-08', 'Hari libur nasional'),
  ('Hari Raya Nyepi', '2026-03-19', 'Hari libur nasional'),
  ('Hari Raya Idul Fitri', '2026-03-30', 'Hari Raya Idul Fitri 1447 H'),
  ('Hari Raya Idul Fitri', '2026-03-31', 'Hari Raya Idul Fitri 1447 H'),
  ('Wafat Isa Almasih', '2026-04-03', 'Hari libur nasional'),
  ('Hari Buruh', '2026-05-01', 'Hari libur nasional'),
  ('Hari Kemerdekaan RI', '2026-08-17', 'Hari Kemerdekaan Indonesia'),
  ('Hari Natal', '2026-12-25', 'Hari libur nasional')
ON CONFLICT DO NOTHING;

-- 4. Subscription plans (from migration_founder_portal.sql seed,
-- prices synced to sync_plan_prices_149k_299k.sql; free inactive)
INSERT INTO subscription_plans
  (name, slug, price_monthly, price_yearly, max_employees, features, is_active, sort_order)
VALUES
  ('Free', 'free', 0, 0, 5,
   '["Hingga 5 karyawan", "Absensi dasar", "Dashboard sederhana"]',
   false, 1),
  ('Starter', 'starter', 149000, 1519800, 25,
   '["Hingga 25 karyawan", "Absensi & Cuti", "Payroll dasar", "PWA Karyawan", "Email support"]',
   true, 2),
  ('Pro', 'pro', 299000, 3049800, 100,
   '["Hingga 100 karyawan", "Semua fitur Starter", "Perekrutan & KPI", "Geofence Attendance", "AI Expense OCR", "Laporan lanjutan", "Priority support"]',
   true, 3),
  ('Enterprise', 'enterprise', NULL, NULL, 9999,
   '["Karyawan unlimited", "Semua fitur Pro", "Custom integration", "Dedicated support", "SLA 99.9%", "On-premise option"]',
   true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Keep prices canonical even if rows already existed from an older seed.
UPDATE subscription_plans SET
  price_monthly = 149000, price_yearly = 1519800,
  max_employees = 25, is_active = true
WHERE slug = 'starter';

UPDATE subscription_plans SET
  price_monthly = 299000, price_yearly = 3049800,
  max_employees = 100, is_active = true
WHERE slug = 'pro';

UPDATE subscription_plans SET is_active = false WHERE slug = 'free';
