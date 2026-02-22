-- ================================================
-- HRISync — Employee Profile Expansion
-- Jalankan SQL ini di Supabase SQL Editor
-- ================================================

-- 1. Tambah kolom profil ke tabel employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30) DEFAULT 'single';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ktp_address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- 2. Tabel profile_update_requests (alur persetujuan perubahan data)
CREATE TABLE IF NOT EXISTS profile_update_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL,
  field_label VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INT REFERENCES employees(id),
  review_note TEXT
);

-- 3. RLS untuk profile_update_requests
ALTER TABLE profile_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_view_own_requests" ON profile_update_requests
  FOR SELECT USING (true);

CREATE POLICY "employees_insert_own_requests" ON profile_update_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_update_requests" ON profile_update_requests
  FOR UPDATE USING (true);

-- 4. Seed data: update existing employees with sample profile data
UPDATE employees SET
  gender = 'male',
  religion = 'Islam',
  blood_type = 'O',
  marital_status = 'married',
  whatsapp = phone,
  personal_email = email
WHERE id = 1;

UPDATE employees SET
  gender = 'female',
  religion = 'Islam',
  blood_type = 'A',
  marital_status = 'single',
  whatsapp = phone,
  personal_email = email
WHERE id = 2;
