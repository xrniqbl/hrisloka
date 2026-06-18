-- ══════════════════════════════════════════════════════════════════
-- HRIS LOKA — MISSING TABLES MIGRATION
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- Aman dijalankan berulang (CREATE TABLE IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. TRAININGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainings (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID, -- link ke companies, tanpa FK constraint (schema-safe)
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'technical' CHECK (category IN ('technical','soft_skill','compliance','leadership','certification')),
  status        TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  instructor    TEXT,
  location      TEXT,
  start_date    DATE,
  end_date      DATE,
  max_participants INT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
-- Safely add company_id if table already existed without it
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trainings' AND column_name='company_id'
  ) THEN
    ALTER TABLE trainings ADD COLUMN company_id UUID;
  END IF;
END $$;

-- ── 2. TRAINING PARTICIPANTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_participants (
  id          BIGSERIAL PRIMARY KEY,
  training_id BIGINT REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled','completed','cancelled')),
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, employee_id)
);

-- ── 3. TRAINING MATERIALS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_materials (
  id          BIGSERIAL PRIMARY KEY,
  training_id BIGINT REFERENCES trainings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  type        TEXT DEFAULT 'link' CHECK (type IN ('link','video','pdf','document')),
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. SELF ASSESSMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS self_assessments (
  id           BIGSERIAL PRIMARY KEY,
  employee_id  BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  period       TEXT, -- e.g. '2026-05'
  achievements TEXT,
  challenges   TEXT,
  goals        TEXT,
  strengths    TEXT,
  improvements TEXT,
  self_rating  INT DEFAULT 3 CHECK (self_rating BETWEEN 1 AND 5),
  status       TEXT DEFAULT 'submitted' CHECK (status IN ('draft','submitted','reviewed')),
  reviewer_notes TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. ONBOARDING TASKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id           BIGSERIAL PRIMARY KEY,
  employee_id  BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT DEFAULT 'general',
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  sort_order   INT DEFAULT 0,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. EMPLOYEE DOCUMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_documents (
  id            BIGSERIAL PRIMARY KEY,
  employee_id   BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- ktp, npwp, ijazah, skck, bpjs, bank, cv, contract, other
  file_url      TEXT,
  file_name     TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes         TEXT,
  reviewed_by   BIGINT REFERENCES employees(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- leave, payslip, announcement, approval, etc.
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. PUSH SUBSCRIPTIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT,
  auth        TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- ── 9. ONBOARDING CHECKLIST (alias untuk onboarding_tasks di admin) ─
-- Admin menggunakan tabel onboarding + onboarding_checklist, PWA pakai onboarding_tasks
-- Cek apakah onboarding_checklist sudah ada dan rename/create view jika perlu
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'general',
  sort_order  INT DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Safely add company_id if table already existed without it
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='onboarding_checklist' AND column_name='company_id'
  ) THEN
    ALTER TABLE onboarding_checklist ADD COLUMN company_id UUID;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- INDEX untuk performance
-- ══════════════════════════════════════════════════════════════════
-- Index company_id dibuat hanya jika kolom ada (via DO block di atas)
CREATE INDEX IF NOT EXISTS idx_training_participants_training ON training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_employee ON training_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_materials_training ON training_materials(training_id);
CREATE INDEX IF NOT EXISTS idx_self_assessments_employee ON self_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee ON onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(employee_id, read);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_employee ON push_subscriptions(employee_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS POLICIES (Row Level Security)
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Trainings: semua karyawan bisa baca
DROP POLICY IF EXISTS "trainings_select" ON trainings;
CREATE POLICY "trainings_select" ON trainings FOR SELECT USING (true);
DROP POLICY IF EXISTS "trainings_manage" ON trainings;
CREATE POLICY "trainings_manage" ON trainings FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','hr_admin','founder'))
);

-- Training participants: karyawan bisa baca semua, insert diri sendiri
DROP POLICY IF EXISTS "tp_select" ON training_participants;
CREATE POLICY "tp_select" ON training_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "tp_insert" ON training_participants;
CREATE POLICY "tp_insert" ON training_participants FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);

-- Training materials: semua bisa baca
DROP POLICY IF EXISTS "tm_select" ON training_materials;
CREATE POLICY "tm_select" ON training_materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "tm_manage" ON training_materials;
CREATE POLICY "tm_manage" ON training_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','hr_admin','founder'))
);

-- Self assessments: karyawan baca/tulis milik sendiri
DROP POLICY IF EXISTS "sa_select" ON self_assessments;
CREATE POLICY "sa_select" ON self_assessments FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','hr_admin','manager','founder'))
);
DROP POLICY IF EXISTS "sa_insert" ON self_assessments;
CREATE POLICY "sa_insert" ON self_assessments FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);

-- Onboarding tasks: karyawan baca/update milik sendiri
DROP POLICY IF EXISTS "ot_select" ON onboarding_tasks;
CREATE POLICY "ot_select" ON onboarding_tasks FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','hr_admin','founder'))
);
DROP POLICY IF EXISTS "ot_update" ON onboarding_tasks;
CREATE POLICY "ot_update" ON onboarding_tasks FOR UPDATE USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
DROP POLICY IF EXISTS "ot_manage" ON onboarding_tasks;
CREATE POLICY "ot_manage" ON onboarding_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','hr_admin','founder'))
);

-- Employee documents: karyawan baca/upload milik sendiri
DROP POLICY IF EXISTS "ed_select" ON employee_documents;
CREATE POLICY "ed_select" ON employee_documents FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','hr_admin','founder'))
);
DROP POLICY IF EXISTS "ed_insert" ON employee_documents;
CREATE POLICY "ed_insert" ON employee_documents FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);

-- Notifications: karyawan baca/update milik sendiri
DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);

-- Push subscriptions: karyawan manage milik sendiri
DROP POLICY IF EXISTS "ps_all" ON push_subscriptions;
CREATE POLICY "ps_all" ON push_subscriptions FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('super_admin','founder'))
);

-- ══════════════════════════════════════════════════════════════════
-- VERIFIKASI
-- ══════════════════════════════════════════════════════════════════
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'trainings','training_participants','training_materials',
    'self_assessments','onboarding_tasks','employee_documents',
    'notifications','push_subscriptions','onboarding_checklist'
  )
ORDER BY table_name;
