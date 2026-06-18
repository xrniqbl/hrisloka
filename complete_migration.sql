-- ================================================
-- HRISync — Complete Database Migration
-- Run this in Supabase SQL Editor to enable ALL features
-- ================================================

-- ================================================
-- 1. KPI Records & Metrics
-- ================================================
CREATE TABLE IF NOT EXISTS kpi_records (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL, -- e.g. 'Q1 2026', '2026-H1'
  overall_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_metrics (
  id SERIAL PRIMARY KEY,
  kpi_record_id INT REFERENCES kpi_records(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  target DECIMAL(10,2) DEFAULT 0,
  actual DECIMAL(10,2) DEFAULT 0,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. Appraisals
-- ================================================
CREATE TABLE IF NOT EXISTS appraisals (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id INT REFERENCES employees(id) ON DELETE SET NULL,
  period VARCHAR(30) NOT NULL, -- e.g. 'Q1 2026'
  rating DECIMAL(3,1) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in-progress', -- 'draft', 'in-progress', 'completed'
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 3. Job Postings
-- ================================================
CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  location VARCHAR(100),
  type VARCHAR(30) DEFAULT 'Full-time', -- 'Full-time', 'Part-time', 'Contract', 'Internship'
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'draft'
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 4. Candidates
-- ================================================
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_postings(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(30),
  stage VARCHAR(30) DEFAULT 'applied', -- 'applied', 'screening', 'interview', 'test', 'offer', 'hired', 'rejected'
  source VARCHAR(50), -- 'LinkedIn', 'JobStreet', 'Referral', etc.
  rating INT DEFAULT 0,
  notes TEXT,
  resume_url TEXT,
  applied_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 5. Assets (IT & Equipment)
-- ================================================
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(20) PRIMARY KEY, -- e.g. 'AST-001'
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50), -- 'Laptop', 'Monitor', 'Phone', 'Printer', etc.
  brand VARCHAR(100),
  serial VARCHAR(100),
  purchase_date DATE,
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'in-use', 'maintenance', 'retired'
  assigned_to INT REFERENCES employees(id) ON DELETE SET NULL,
  condition VARCHAR(20) DEFAULT 'Good', -- 'New', 'Good', 'Fair', 'Poor'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 6. Offboarding
-- ================================================
CREATE TABLE IF NOT EXISTS offboarding (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- 'resign', 'terminated', 'contract_end', 'retirement'
  status VARCHAR(20) DEFAULT 'initiated', -- 'initiated', 'in-progress', 'completed', 'cancelled'
  reason TEXT,
  last_working_day DATE,
  pro_rata_salary BIGINT DEFAULT 0,
  severance_pay BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offboarding_checklist (
  id SERIAL PRIMARY KEY,
  offboarding_id INT REFERENCES offboarding(id) ON DELETE CASCADE,
  item VARCHAR(200) NOT NULL,
  completed BOOLEAN DEFAULT false,
  asset_id VARCHAR(20) REFERENCES assets(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 7. Projects
-- ================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  client VARCHAR(200),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  hourly_rate DECIMAL(12,2) DEFAULT 0,
  color VARCHAR(10) DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_assignments (
  id SERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  allocation_pct INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

-- ================================================
-- 8. Timesheets
-- ================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours DECIMAL(6,2),
  description TEXT,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 9. Shifts & Shift Assignments
-- ================================================
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(10) DEFAULT '#6D8196',
  branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  shift_id INT REFERENCES shifts(id) ON DELETE CASCADE,
  day_of_week INT, -- 0=Sunday, 1=Monday, ...
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, day_of_week, effective_date)
);

-- ================================================
-- 10. Holidays
-- ================================================
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 11. Loans & Loan Payments
-- ================================================
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  remaining BIGINT DEFAULT 0,
  monthly_deduction BIGINT DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'paid', 'rejected'
  approved_by INT REFERENCES employees(id) ON DELETE SET NULL,
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_payments (
  id SERIAL PRIMARY KEY,
  loan_id INT REFERENCES loans(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 12. Overtime Requests (if not already created)
-- ================================================
CREATE TABLE IF NOT EXISTS overtime_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(4,1) NOT NULL,
  rate DECIMAL(3,1) DEFAULT 1.5,
  reason TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 13. AI Capabilities (for real data storage)
-- ================================================
CREATE TABLE IF NOT EXISTS ai_capabilities (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  score INT DEFAULT 0,
  level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced', 'expert'
  assessed_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_certifications (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  issued_date DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 14. Branches (if not already created)
-- ================================================
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(30),
  head_id INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Enable RLS on all new tables
-- ================================================
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_certifications ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS Policies — Allow authenticated users full access
-- (Simplified for initial setup — refine per role later)
-- ================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'kpi_records', 'kpi_metrics', 'appraisals', 'job_postings', 'candidates',
    'assets', 'offboarding', 'offboarding_checklist', 'projects', 'project_assignments',
    'timesheets', 'shifts', 'shift_assignments', 'holidays', 'loans', 'loan_payments',
    'overtime_requests', 'ai_capabilities', 'ai_certifications'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_%s" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_full_%s" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');', tbl, tbl);
  END LOOP;
END $$;

-- ================================================
-- Seed Data for Testing
-- ================================================

-- Holidays
INSERT INTO holidays (name, date, description) VALUES
  ('Tahun Baru', '2026-01-01', 'Hari libur nasional'),
  ('Isra Mi''raj', '2026-02-08', 'Hari libur nasional'),
  ('Hari Raya Nyepi', '2026-03-19', 'Hari libur nasional'),
  ('Wafat Isa Almasih', '2026-04-03', 'Hari libur nasional'),
  ('Hari Buruh', '2026-05-01', 'Hari libur nasional'),
  ('Hari Raya Idul Fitri', '2026-03-30', 'Hari Raya Idul Fitri 1447 H'),
  ('Hari Raya Idul Fitri', '2026-03-31', 'Hari Raya Idul Fitri 1447 H'),
  ('Hari Kemerdekaan RI', '2026-08-17', 'Hari Kemerdekaan Indonesia'),
  ('Hari Natal', '2026-12-25', 'Hari libur nasional');

-- Sample Shifts
INSERT INTO shifts (name, start_time, end_time, color) VALUES
  ('Pagi', '07:00', '15:00', '#3B82F6'),
  ('Siang', '14:00', '22:00', '#F59E0B'),
  ('Malam', '22:00', '06:00', '#8B5CF6');

-- Sample Job Postings
INSERT INTO job_postings (title, department, location, type, status, description, requirements, deadline) VALUES
  ('Frontend Developer', 'Engineering', 'Jakarta', 'Full-time', 'open', 'Kami mencari Frontend Developer berpengalaman untuk mengembangkan aplikasi web modern.', ARRAY['React/Next.js', 'TypeScript', 'Minimal 2 tahun pengalaman'], '2026-05-01'),
  ('HR Coordinator', 'HR', 'Jakarta', 'Full-time', 'open', 'Koordinator HR untuk mengelola operasional SDM harian.', ARRAY['S1 Psikologi/Manajemen', 'Pengalaman HR min 1 tahun'], '2026-04-15');

-- Sample Assets
INSERT INTO assets (id, name, category, brand, serial, purchase_date, status, assigned_to, condition) VALUES
  ('AST-001', 'MacBook Pro 14"', 'Laptop', 'Apple', 'FVFG123456', '2024-01-15', 'in-use', 1, 'Good'),
  ('AST-002', 'Dell Monitor 27"', 'Monitor', 'Dell', 'DL987654', '2024-03-10', 'in-use', 1, 'Good'),
  ('AST-003', 'ThinkPad X1 Carbon', 'Laptop', 'Lenovo', 'LN456789', '2024-06-01', 'in-use', 5, 'Good'),
  ('AST-004', 'iPhone 15 Pro', 'Phone', 'Apple', 'AP111222', '2025-01-20', 'in-use', 3, 'New'),
  ('AST-005', 'Epson L3250', 'Printer', 'Epson', 'EP333444', '2023-11-01', 'available', NULL, 'Fair');

-- Sample KPI Records
INSERT INTO kpi_records (employee_id, period, overall_score) VALUES
  (1, 'Q1 2026', 85),
  (2, 'Q1 2026', 72),
  (3, 'Q1 2026', 91),
  (5, 'Q1 2026', 68);

INSERT INTO kpi_metrics (kpi_record_id, name, target, actual, score)
SELECT kr.id, v.name, v.target, v.actual, v.score
FROM (VALUES
  (1, 'Disiplin', 100::decimal, 90::decimal, 90),
  (1, 'Kerjasama Tim', 100::decimal, 85::decimal, 85),
  (1, 'Inisiatif', 100::decimal, 80::decimal, 80),
  (1, 'Kualitas Kerja', 100::decimal, 88::decimal, 88),
  (1, 'Produktivitas', 100::decimal, 82::decimal, 82),
  (2, 'Disiplin', 100::decimal, 75::decimal, 75),
  (2, 'Kerjasama Tim', 100::decimal, 80::decimal, 80),
  (2, 'Inisiatif', 100::decimal, 65::decimal, 65),
  (2, 'Kualitas Kerja', 100::decimal, 70::decimal, 70),
  (2, 'Produktivitas', 100::decimal, 68::decimal, 68),
  (3, 'Disiplin', 100::decimal, 95::decimal, 95),
  (3, 'Kerjasama Tim', 100::decimal, 90::decimal, 90),
  (3, 'Inisiatif', 100::decimal, 88::decimal, 88),
  (3, 'Kualitas Kerja', 100::decimal, 92::decimal, 92),
  (3, 'Produktivitas', 100::decimal, 90::decimal, 90),
  (5, 'Disiplin', 100::decimal, 70::decimal, 70),
  (5, 'Kerjasama Tim', 100::decimal, 72::decimal, 72),
  (5, 'Inisiatif', 100::decimal, 60::decimal, 60),
  (5, 'Kualitas Kerja', 100::decimal, 68::decimal, 68),
  (5, 'Produktivitas', 100::decimal, 70::decimal, 70)
) AS v(emp_id, name, target, actual, score)
JOIN kpi_records kr ON kr.employee_id = v.emp_id AND kr.period = 'Q1 2026';

-- Sample Appraisals
INSERT INTO appraisals (employee_id, reviewer_id, period, rating, status, comments) VALUES
  (1, 3, 'Q1 2026', 4.2, 'completed', 'Performa sangat baik, konsisten dan proaktif dalam menyelesaikan tugas.'),
  (2, 3, 'Q1 2026', 3.5, 'completed', 'Performa memenuhi standar. Perlu peningkatan di area inisiatif.'),
  (5, 1, 'Q1 2026', 3.0, 'in-progress', 'Junior yang potensial, perlu bimbingan lebih lanjut.');

-- Sample Projects (insert and capture UUIDs)
INSERT INTO projects (name, client, description, status, priority, start_date, end_date, hourly_rate, color) VALUES
  ('HRISync v2.0', 'Internal', 'Pengembangan fitur baru platform HRISync', 'active', 'high', '2026-01-01', '2026-06-30', 150000, '#2563EB'),
  ('Mobile App Development', 'PT Maju Jaya', 'Aplikasi mobile untuk client', 'active', 'medium', '2026-02-01', '2026-08-31', 200000, '#10B981'),
  ('Data Analytics Dashboard', 'Internal', 'Dashboard analitik untuk management', 'active', 'low', '2026-03-01', NULL, 0, '#8B5CF6');

INSERT INTO project_assignments (project_id, employee_id, role, allocation_pct)
SELECT p.id, v.employee_id, v.role, v.allocation_pct
FROM (VALUES
  ('HRISync v2.0', 1, 'lead', 60),
  ('HRISync v2.0', 5, 'member', 80),
  ('HRISync v2.0', 8, 'member', 40),
  ('Mobile App Development', 1, 'member', 20),
  ('Mobile App Development', 5, 'member', 20),
  ('Data Analytics Dashboard', 3, 'lead', 30)
) AS v(project_name, employee_id, role, allocation_pct)
JOIN projects p ON p.name = v.project_name;

-- Sample Timesheets
INSERT INTO timesheets (employee_id, project_id, date, start_time, end_time, hours, description, billable)
SELECT v.employee_id, p.id, v.date, v.start_time, v.end_time, v.hours, v.description, v.billable
FROM (VALUES
  (1, 'HRISync v2.0', '2026-03-31'::date, '2026-03-31 08:00:00+07'::timestamptz, '2026-03-31 12:00:00+07'::timestamptz, 4.0, 'Fitur KPI Tracking development', true),
  (1, 'HRISync v2.0', '2026-03-31'::date, '2026-03-31 13:00:00+07'::timestamptz, '2026-03-31 17:00:00+07'::timestamptz, 4.0, 'Approval Dashboard integration', true),
  (5, 'HRISync v2.0', '2026-03-31'::date, '2026-03-31 09:00:00+07'::timestamptz, '2026-03-31 17:00:00+07'::timestamptz, 8.0, 'Bug fixing & testing', true),
  (8, 'HRISync v2.0', '2026-03-31'::date, '2026-03-31 14:00:00+07'::timestamptz, '2026-03-31 18:00:00+07'::timestamptz, 4.0, 'DevOps & deployment', true)
) AS v(employee_id, project_name, date, start_time, end_time, hours, description, billable)
JOIN projects p ON p.name = v.project_name;

-- Sample Overtime
INSERT INTO overtime_requests (employee_id, date, hours, rate, reason, status) VALUES
  (1, '2026-03-28', 3, 1.5, 'Deadline fitur KPI', 'approved'),
  (5, '2026-03-29', 2, 1.5, 'Bug fixing urgent', 'pending'),
  (8, '2026-03-30', 4, 2.0, 'Server maintenance weekend', 'pending');

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE kpi_records;
ALTER PUBLICATION supabase_realtime ADD TABLE appraisals;
ALTER PUBLICATION supabase_realtime ADD TABLE job_postings;
ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE offboarding;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE timesheets;
ALTER PUBLICATION supabase_realtime ADD TABLE overtime_requests;
