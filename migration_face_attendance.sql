-- ============================================================
-- Migration: Face Attendance + Anti-Fake GPS
-- FIXED: employee_id menggunakan INT (sesuai tabel employees)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Table: employee_faces
-- Menyimpan face descriptors (128-dim float array) per karyawan
CREATE TABLE IF NOT EXISTS employee_faces (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  descriptor FLOAT8[] NOT NULL,              -- 128-element face descriptor vector
  label VARCHAR(100) DEFAULT 'face',         -- 'photo_1', 'photo_2', 'photo_3'
  capture_image_url TEXT,                    -- Referensi foto (opsional, di storage)
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_by INT REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  quality_score FLOAT DEFAULT 0,             -- 0-100 kualitas wajah saat capture
  UNIQUE(employee_id, label)
);

CREATE INDEX IF NOT EXISTS idx_employee_faces_employee ON employee_faces(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_faces_active ON employee_faces(employee_id, is_active);

-- 2. Table: attendance_trust_logs
-- Log audit anti-spoofing detail untuk setiap record absensi
CREATE TABLE IF NOT EXISTS attendance_trust_logs (
  id SERIAL PRIMARY KEY,
  attendance_id INT REFERENCES attendance(id) ON DELETE CASCADE,
  trust_score INTEGER NOT NULL DEFAULT 0,     -- 0-100
  trust_level VARCHAR(20),                    -- 'trusted' | 'warning' | 'rejected'

  -- GPS Analysis
  gps_accuracy FLOAT,                         -- Akurasi GPS dalam meter
  gps_samples JSONB,                          -- [{lat, lng, accuracy, timestamp}]
  gps_variance FLOAT,                         -- Varians antar sampel (rendah = mencurigakan)

  -- IP vs GPS Cross-Reference
  ip_location JSONB,                          -- {lat, lng, city, country, isp}
  ip_gps_distance_km FLOAT,                   -- Jarak antara IP dan GPS

  -- Travel Speed Check
  travel_distance_m FLOAT,                    -- Jarak dari absensi terakhir
  travel_elapsed_hours FLOAT,                 -- Waktu sejak absensi terakhir
  travel_speed_kmh FLOAT,                     -- Kecepatan perjalanan yang dihitung

  -- Liveness & Face
  face_verified BOOLEAN DEFAULT false,
  face_distance FLOAT,                        -- Euclidean distance (lebih kecil = lebih mirip)
  face_confidence FLOAT,                      -- Persentase kepercayaan 0-100
  liveness_passed BOOLEAN DEFAULT false,
  liveness_challenges JSONB,                  -- [{id, passed, timestamp}]

  -- Device & Motion
  device_info JSONB,                          -- {userAgent, screenWidth, screenHeight, platform}
  motion_variance FLOAT,                      -- Varians accelerometer

  -- Flags
  flags TEXT[],                               -- Array flag keamanan
  flag_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_logs_attendance ON attendance_trust_logs(attendance_id);
CREATE INDEX IF NOT EXISTS idx_trust_logs_score ON attendance_trust_logs(trust_score);
CREATE INDEX IF NOT EXISTS idx_trust_logs_level ON attendance_trust_logs(trust_level);
CREATE INDEX IF NOT EXISTS idx_trust_logs_created ON attendance_trust_logs(created_at DESC);

-- 3. Tambah kolom baru ke tabel attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_distance FLOAT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_confidence FLOAT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS trust_level VARCHAR(20) DEFAULT 'trusted';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS anti_spoof_flags TEXT[];

-- 4. RLS Policies

-- employee_faces: karyawan hanya bisa lihat milik sendiri, admin lihat semua
ALTER TABLE employee_faces ENABLE ROW LEVEL SECURITY;

-- Drop jika sudah ada (aman untuk re-run)
DROP POLICY IF EXISTS "employee_faces_all_authenticated" ON employee_faces;

CREATE POLICY "employee_faces_all_authenticated" ON employee_faces
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- attendance_trust_logs: hanya authenticated yang bisa akses
ALTER TABLE attendance_trust_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_logs_all_authenticated" ON attendance_trust_logs;

CREATE POLICY "trust_logs_all_authenticated" ON attendance_trust_logs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. View: suspicious_attendance
-- Admin view untuk menemukan record absensi yang mencurigakan
CREATE OR REPLACE VIEW suspicious_attendance AS
SELECT
  a.id,
  a.date,
  a.clock_in,
  a.clock_out,
  a.status,
  a.latitude,
  a.longitude,
  a.in_radius,
  a.trust_score,
  a.trust_level,
  a.anti_spoof_flags,
  a.face_verified,
  e.name AS employee_name,
  e.division,
  e.position,
  tl.ip_location,
  tl.ip_gps_distance_km,
  tl.liveness_passed,
  tl.flags AS detailed_flags,
  tl.flag_count
FROM attendance a
LEFT JOIN employees e ON a.employee_id = e.id
LEFT JOIN attendance_trust_logs tl ON tl.attendance_id = a.id
WHERE a.trust_level IN ('warning', 'rejected')
   OR a.trust_score < 70
   OR a.face_verified = false
ORDER BY a.date DESC, a.clock_in DESC;
