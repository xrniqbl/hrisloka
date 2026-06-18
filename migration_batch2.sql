-- ================================================
-- HRISync — Migration Batch 2
-- Run in Supabase SQL Editor
-- ================================================

-- 1. Add role column to employees (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='role') THEN
    ALTER TABLE employees ADD COLUMN role VARCHAR(30) DEFAULT 'employee';
    COMMENT ON COLUMN employees.role IS 'super_admin, hr_admin, manager, employee';
  END IF;
END $$;

-- 2. Onboarding
CREATE TABLE IF NOT EXISTS onboarding (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'in-progress', -- 'in-progress', 'completed', 'cancelled'
  start_date DATE DEFAULT CURRENT_DATE,
  target_completion DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id SERIAL PRIMARY KEY,
  onboarding_id INT REFERENCES onboarding(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'documents', 'training', 'equipment', 'access', 'orientation'
  item VARCHAR(200) NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Training & Learning
CREATE TABLE IF NOT EXISTS trainings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50), -- 'technical', 'soft_skill', 'compliance', 'leadership', 'certification'
  instructor VARCHAR(100),
  location VARCHAR(200),
  start_date DATE,
  end_date DATE,
  max_participants INT DEFAULT 30,
  status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_participants (
  id SERIAL PRIMARY KEY,
  training_id INT REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attended', 'completed', 'absent'
  score INT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, employee_id)
);

-- 4. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- 'leave', 'approval', 'announcement', 'birthday', 'contract', 'system'
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link VARCHAR(200),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'onboarding', 'onboarding_checklist', 'trainings', 'training_participants', 'notifications'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_%s" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_full_%s" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');', tbl, tbl);
  END LOOP;
END $$;

-- Seed training data
INSERT INTO trainings (title, category, instructor, location, start_date, end_date, max_participants, status, description) VALUES
  ('Google AI Essentials', 'certification', 'Google Cloud Team', 'Online', '2026-04-15', '2026-04-17', 20, 'upcoming', 'Sertifikasi dasar AI dari Google, mencakup Prompt Engineering dan AI Ethics.'),
  ('Leadership Development Program', 'leadership', 'HR Academy', 'Jakarta', '2026-05-01', '2026-05-03', 15, 'upcoming', 'Program pengembangan kepemimpinan untuk level manager dan supervisor.'),
  ('Cybersecurity Awareness', 'compliance', 'IT Security Team', 'Online', '2026-04-10', '2026-04-10', 50, 'upcoming', 'Pelatihan keamanan siber dasar untuk seluruh karyawan.'),
  ('Effective Communication Skills', 'soft_skill', 'External Trainer', 'Bandung', '2026-03-20', '2026-03-21', 25, 'completed', 'Workshop komunikasi efektif untuk meningkatkan kolaborasi tim.');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE onboarding;
ALTER PUBLICATION supabase_realtime ADD TABLE trainings;
