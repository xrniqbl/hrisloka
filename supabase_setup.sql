-- ================================================
-- HRISync — Supabase Database Setup
-- Jalankan semua SQL ini di Supabase SQL Editor
-- ================================================

-- 1. Employees
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  nip VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  photo TEXT,
  division VARCHAR(50),
  position VARCHAR(100),
  status VARCHAR(20) DEFAULT 'contract',
  join_date DATE,
  birth_date DATE,
  contract_start DATE,
  contract_end DATE,
  base_salary BIGINT DEFAULT 0,
  allowance BIGINT DEFAULT 0,
  bpjs_rate DECIMAL(4,2) DEFAULT 0.04,
  tax_rate DECIMAL(4,2) DEFAULT 0.15,
  emergency_contact JSONB,
  bank_account JSONB,
  education JSONB,
  address TEXT,
  nik VARCHAR(20),
  leave_quota INT DEFAULT 12,
  leave_used INT DEFAULT 0,
  manager_id INT REFERENCES employees(id),
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id),
  date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  status VARCHAR(20) DEFAULT 'present',
  location VARCHAR(50),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  in_radius BOOLEAN DEFAULT false,
  selfie_url TEXT,
  selfie_verified BOOLEAN DEFAULT false,
  location_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id),
  type VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reason TEXT,
  approved_by INT REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Helpdesk Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id),
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  description TEXT,
  assigned_to VARCHAR(100),
  sla_hours INT,
  resolved_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reimbursements
CREATE TABLE IF NOT EXISTS reimbursements (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id),
  category VARCHAR(50),
  date DATE,
  amount BIGINT,
  receipt_url TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Office Locations
CREATE TABLE IF NOT EXISTS office_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT DEFAULT 100
);

-- ================================================
-- Enable Row Level Security
-- ================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS Policies
-- ================================================

-- Employees: karyawan bisa lihat data sendiri
CREATE POLICY "employees_own_select" ON employees
  FOR SELECT USING (auth_user_id = auth.uid());

-- Attendance: karyawan lihat & insert sendiri
CREATE POLICY "attendance_own_select" ON attendance
  FOR SELECT USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "attendance_own_insert" ON attendance
  FOR INSERT WITH CHECK (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

-- Leave: karyawan kelola cuti sendiri
CREATE POLICY "leave_own" ON leave_requests
  FOR ALL USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

-- Tickets: karyawan kelola tiket sendiri
CREATE POLICY "tickets_own" ON tickets
  FOR ALL USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

-- Reimbursements: karyawan kelola sendiri
CREATE POLICY "reimburse_own" ON reimbursements
  FOR ALL USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

-- Office locations: semua bisa baca
CREATE POLICY "locations_read" ON office_locations
  FOR SELECT USING (true);

-- ================================================
-- Seed Data
-- ================================================

-- Office Locations
INSERT INTO office_locations (name, latitude, longitude, radius_meters) VALUES
  ('Kantor Pusat Jakarta', -6.2088, 106.8456, 100),
  ('Branch Office Bandung', -6.9175, 107.6191, 150);

-- Employees (tanpa auth_user_id dulu, nanti di-link)
INSERT INTO employees (nip, name, email, phone, division, position, status, join_date, birth_date, contract_start, contract_end, base_salary, allowance, bpjs_rate, tax_rate, emergency_contact, bank_account, education, address, nik, leave_quota, leave_used, manager_id) VALUES
  ('EMP-2024-001', 'Ahmad Rizky Pratama', 'ahmad.rizky@company.com', '0812-3456-7890', 'Engineering', 'Senior Developer', 'permanent', '2022-03-15', '1995-08-14', NULL, NULL, 18000000, 4000000, 0.04, 0.15, '{"name":"Siti Rahayu","relation":"Mother","phone":"0811-1234-5678"}', '{"bank":"BCA","number":"1234567890","holder":"Ahmad Rizky Pratama"}', '{"level":"S1","major":"Teknik Informatika","university":"Universitas Indonesia","year":2017}', 'Jl. Sudirman No. 42, Jakarta Selatan', '3201234567890001', 12, 3, NULL),
  ('EMP-2024-002', 'Siti Nurhaliza', 'siti.nur@company.com', '0813-2345-6789', 'Marketing', 'Marketing Specialist', 'contract', '2024-06-01', '1998-03-22', '2024-06-01', '2026-05-31', 10000000, 2500000, 0.04, 0.10, '{"name":"Nurdin","relation":"Father","phone":"0812-9999-8888"}', '{"bank":"Mandiri","number":"0987654321","holder":"Siti Nurhaliza"}', '{"level":"S1","major":"Manajemen","university":"UI","year":2020}', 'Jl. Gatot Subroto No. 18, Jakarta Pusat', '3201234567890002', 12, 5, NULL),
  ('EMP-2024-003', 'Budi Santoso', 'budi.santoso@company.com', '0814-3456-7890', 'Finance', 'Finance Manager', 'permanent', '2020-01-10', '1990-12-05', NULL, NULL, 22000000, 5000000, 0.04, 0.25, '{"name":"Ani Santoso","relation":"Wife","phone":"0813-5555-6666"}', '{"bank":"BCA","number":"5566778899","holder":"Budi Santoso"}', '{"level":"S2","major":"Akuntansi","university":"UGM","year":2014}', 'Jl. HR Rasuna Said No. 7, Jakarta Selatan', '3201234567890003', 12, 1, NULL),
  ('EMP-2024-004', 'Dewi Lestari', 'dewi.lestari@company.com', '0815-4567-8901', 'HR', 'HR Admin', 'permanent', '2021-05-01', '1993-07-18', NULL, NULL, 12000000, 3000000, 0.04, 0.10, '{"name":"Lestari Dewi","relation":"Sister","phone":"0814-7777-8888"}', '{"bank":"BRI","number":"3344556677","holder":"Dewi Lestari"}', '{"level":"S1","major":"Psikologi","university":"Unpad","year":2015}', 'Jl. Thamrin No. 31, Jakarta Pusat', '3201234567890004', 12, 7, 3),
  ('EMP-2024-005', 'Raka Pratama', 'raka.pratama@company.com', '0816-5678-9012', 'Engineering', 'Junior Developer', 'contract', '2025-09-01', '2000-01-30', '2025-09-01', '2026-08-31', 8000000, 2000000, 0.04, 0.05, '{"name":"Pratama Senior","relation":"Father","phone":"0815-1111-0000"}', '{"bank":"BCA","number":"6677889900","holder":"Raka Pratama"}', '{"level":"S1","major":"Ilmu Komputer","university":"Binus","year":2022}', 'Jl. Kuningan No. 55, Jakarta Selatan', '3201234567890005', 12, 2, 1),
  ('EMP-2024-006', 'Fajar Setiawan', 'fajar.setiawan@company.com', '0817-6789-0123', 'Operations', 'Operations Lead', 'permanent', '2019-05-12', '1991-11-25', NULL, NULL, 16000000, 3500000, 0.04, 0.15, '{"name":"Setiawan Jaya","relation":"Brother","phone":"0816-2222-3333"}', '{"bank":"Mandiri","number":"1122334455","holder":"Fajar Setiawan"}', '{"level":"S1","major":"Teknik Industri","university":"ITS","year":2013}', 'Jl. Casablanca No. 12, Jakarta Selatan', '3201234567890006', 12, 4, NULL),
  ('EMP-2024-007', 'Anisa Rahmawati', 'anisa.rahma@company.com', '0818-7890-1234', 'Marketing', 'Content Writer', 'contract', '2025-01-15', '1999-04-10', '2025-01-15', '2026-01-14', 7500000, 1500000, 0.04, 0.05, '{"name":"Rahmawati","relation":"Mother","phone":"0817-4444-5555"}', '{"bank":"BNI","number":"9988776655","holder":"Anisa Rahmawati"}', '{"level":"S1","major":"Sastra Inggris","university":"UNJ","year":2021}', 'Jl. Menteng Raya No. 8, Jakarta Pusat', '3201234567890007', 12, 0, 2),
  ('EMP-2024-008', 'Yoga Aditya', 'yoga.aditya@company.com', '0819-8901-2345', 'Engineering', 'DevOps Engineer', 'permanent', '2021-11-01', '1994-06-20', NULL, NULL, 14000000, 3000000, 0.04, 0.15, '{"name":"Maya Sari","relation":"Wife","phone":"0812-0000-1111"}', '{"bank":"BNI","number":"2233445566","holder":"Yoga Aditya"}', '{"level":"S1","major":"Teknik Komputer","university":"ITB","year":2016}', 'Jl. Kemang Raya No. 23, Jakarta Selatan', '3201234567890008', 12, 6, 1);

-- Sample Attendance
INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, location, latitude, longitude, in_radius, selfie_verified, location_id) VALUES
  (1, '2026-02-22', '08:02', '17:15', 'present', 'Office', -6.2090, 106.8458, true, true, 1),
  (2, '2026-02-22', '08:30', '17:00', 'present', 'Office', -6.2087, 106.8455, true, true, 1),
  (3, '2026-02-22', '07:55', '17:30', 'present', 'Office', -6.2085, 106.8460, true, true, 1),
  (4, '2026-02-22', '08:15', '17:10', 'present', 'Office', -6.2089, 106.8457, true, true, 1),
  (5, '2026-02-22', '08:10', NULL, 'present', 'Remote', -6.3500, 106.8200, false, true, 1);

-- Sample Leave Requests
INSERT INTO leave_requests (employee_id, type, start_date, end_date, days, status, reason, approved_by) VALUES
  (4, 'cuti', '2026-02-22', '2026-02-24', 2, 'approved', 'Family event', 3),
  (1, 'sakit', '2026-02-10', '2026-02-11', 1, 'approved', 'Flu', NULL),
  (5, 'cuti', '2026-03-01', '2026-03-03', 2, 'pending', 'Liburan keluarga', NULL);

-- Sample Tickets
INSERT INTO tickets (employee_id, subject, category, priority, status, description, assigned_to, sla_hours) VALUES
  (5, 'Laptop tidak bisa nyala', 'IT', 'high', 'open', 'Laptop MacBook Air tiba-tiba mati dan tidak bisa di-charge.', 'IT Support', 4),
  (2, 'Error pada slip gaji bulan Januari', 'HR', 'medium', 'in-progress', 'Potongan BPJS tidak sesuai.', 'HR Team', 24),
  (1, 'Request akses VPN untuk remote', 'IT', 'low', 'open', 'Butuh akses VPN untuk WFH minggu depan.', 'IT Support', 48);

-- Sample Reimbursements
INSERT INTO reimbursements (employee_id, category, date, amount, notes, status) VALUES
  (1, 'Transport', '2026-02-20', 350000, 'Grab ke client meeting', 'approved'),
  (3, 'Medical', '2026-02-19', 1250000, 'Dental checkup', 'pending'),
  (6, 'Meeting', '2026-02-18', 500000, 'Lunch meeting vendor', 'pending');
