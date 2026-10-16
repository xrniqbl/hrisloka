-- ============================================================
-- BASELINE SCHEMA — KiniKerja / HRISync
-- Consolidated baseline for an EMPTY remote database.
--
-- Derived from (read fully, merged — not pasted):
--   supabase_setup.sql
--     (employees, attendance, leave_requests, tickets,
--      reimbursements, office_locations + basic RLS + demo seeds)
--   migration_company_register.sql
--     (companies + employee tenant columns + demo company +
--      pending_employee_registrations view + trigger)
--   complete_migration.sql lines 1-280 ONLY
--     (kpi_records, kpi_metrics, appraisals, job_postings, candidates,
--      assets, offboarding, offboarding_checklist, projects,
--      project_assignments, timesheets, shifts, shift_assignments,
--      holidays, loans, loan_payments, overtime_requests,
--      ai_capabilities, ai_certifications, branches)
--     STOP before the blanket RLS DO block (~line 292) on purpose.
--   extra_setup.sql (documents, audit_trails, announcements)
--   migration_batch2.sql + migration_batch3.sql
--     (onboarding, onboarding_checklist, trainings,
--      training_participants, training_materials, notifications,
--      career_settings + candidates/kpi_metrics column extensions)
--   migration_contracts.sql (contract_templates, employee_contracts
--     + extra companies columns)
--   migration_face_attendance.sql (employee_faces,
--     attendance_trust_logs + attendance anti-spoof columns)
--   migration_push_subscriptions.sql (push_subscriptions)
--   migration_company_policies.sql (company_policies)
--   supabase/departments_setup.sql (departments + employees.department_id)
--   supabase/projects.sql (projects UUID, project_assignments UUID,
--     timesheets UUID, projects.company_id)
--   supabase/profile_update_setup.sql (employee profile columns +
--     profile_update_requests)
--   supabase/multi_branch_setup.sql (branches rich def +
--     employees.branch_id/role + branch_holidays)
--   scripts/create_missing_tables.sql (trainings company_id,
--     self_assessments, onboarding_tasks, employee_documents,
--     notifications BIGSERIAL, office_locations.company_id, ...)
--   migration_rls_enhanced.sql (company_settings key/value def)
--   supabase/migrations/migration_phase2_settings.sql
--     (company_settings tenant cols, notification_preferences,
--      payroll_config)
--   supabase/migrations/migration_phase5_backup_system.sql
--     (backup_logs, company_snapshots, deleted_records)
--   supabase/migrations/fix_audit_missing_schema_2026.sql (billing_info,
--     onboarding.company_id)
--   supabase/migrations/20260516_platform_settings.sql (platform_settings)
--   supabase/migrations/migration_subscription_precision.sql
--     (subscriptions precision columns)
--   supabase/migrations/announcements_company_id.sql
--     (announcements.company_id/priority/created_by,
--      office_locations.company_id)
--   supabase/schema.sql (payroll_records rich def)
--   migration_founder_portal.sql lines 1-155 ONLY
--     (subscription_plans, subscriptions, subscription_payments,
--      vouchers, voucher_usage, founder_broadcasts, client_complaints,
--      complaint_replies, website_analytics)
--     STOP before the RLS section on purpose.
--   supabase/migrations/migration_onboarding_payments.sql
--     (onboarding_profiles, payment_orders + vouchers UUID variant)
--
-- Rules followed here:
--   * Idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
--     everywhere, CREATE OR REPLACE for functions/views, DROP IF EXISTS
--     before triggers.
--   * NO seed / demo data (moved to 20261009000100_seed_reference.sql).
--   * NO blanket RLS policies ("auth_full_*", USING(auth.role()=
--     'authenticated') write policies, all-authenticated reads).
--     Hardening comes in later migrations. Every table gets ENABLE RLS
--     with NO policies here (locked by default; hardening migrations
--     add the real policies), so there is no policy-name drift.
--   * Tables in dependency order; circular refs (employees<->branches)
--     resolved by creating base tables first, FK columns after.
-- ============================================================

-- Extensions needed by UUID primary keys / defaults.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. COMPANIES (tenant root)
-- Richest def: migration_company_register.sql + extra address/legal
-- columns from migration_contracts.sql merged into one CREATE.
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  company_code VARCHAR(20) UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(30),
  website VARCHAR(200),
  email VARCHAR(150),
  industry VARCHAR(100),
  npwp VARCHAR(30),
  director VARCHAR(150),
  pic_name VARCHAR(150),
  employee_count_limit INT DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- ============================================================
-- 2. EMPLOYEES — base table (supabase_setup.sql, unchanged PK type:
-- SERIAL because every existing FK in the repo references INT).
-- ============================================================
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

-- ============================================================
-- 3. DEPARTMENTS + BRANCHES (before employee FK columns so the
-- ALTER ... REFERENCES targets already exist; branches.head_id /
-- manager_id can reference employees because the base table above
-- already exists — no circularity).
-- Richest branches def: supabase/multi_branch_setup.sql
-- (code/latlng/radius/timezone) + location_type + manager_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  location_type VARCHAR(30) DEFAULT 'branch_office',
  head_id INT REFERENCES employees(id) ON DELETE SET NULL,
  manager_id INT REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. EMPLOYEES — every extra column seen across sources, added
-- idempotently (migration_company_register, migration_batch2 role,
-- multi_branch_setup branch_id/role, profile_update_setup, enhanced
-- user_id, departments_setup department_id).
-- NOTE: gender VARCHAR(20) (profile_update_setup, wider than the
-- VARCHAR(10) in migration_company_register); marital_status
-- VARCHAR(30); both photo (base) and photo_url kept — sources use both.
-- user_id (nullable UUID, migration_rls_enhanced) is kept so later
-- RLS-hardening helpers that read employees.user_id keep working.
-- ============================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'employee';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS verified_by INT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
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
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_account_status ON employees(account_status);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- ============================================================
-- 5. CORE HR: attendance, leave_requests, tickets, reimbursements,
-- office_locations (+ company_id from create_missing_tables §13 and
-- announcements_company_id migration).
-- ============================================================
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
  -- Anti-spoof columns (migration_face_attendance.sql §3)
  face_verified BOOLEAN DEFAULT false,
  face_distance FLOAT,
  face_confidence FLOAT,
  trust_score INTEGER DEFAULT 100,
  trust_level VARCHAR(20) DEFAULT 'trusted',
  anti_spoof_flags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS office_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT DEFAULT 100,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. SHIFTS / HOLIDAYS (+ branch link, branch_holidays M2M)
-- ============================================================
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
  day_of_week INT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, day_of_week, effective_date)
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branch_holidays (
  id SERIAL PRIMARY KEY,
  branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
  holiday_id INT REFERENCES holidays(id) ON DELETE CASCADE,
  UNIQUE(branch_id, holiday_id)
);

-- ============================================================
-- 7. ANNOUNCEMENTS / DOCUMENTS / AUDIT
-- announcements merged with announcements_company_id migration
-- (company_id INT, priority, created_by INT).
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal',
  created_by INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_company_created
  ON announcements (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_trails (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. NOTIFICATIONS (merged richest def)
-- CHOICE: id BIGSERIAL per scripts/create_missing_tables.sql (over
-- SERIAL in migration_batch2.sql); keeps message+body+link+data
-- columns from both variants so old and new app code both work.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  body TEXT,
  link VARCHAR(200),
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(employee_id, read);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_leave BOOLEAN DEFAULT true,
  email_payroll BOOLEAN DEFAULT true,
  email_reimbursement BOOLEAN DEFAULT true,
  push_attendance BOOLEAN DEFAULT true,
  push_approval BOOLEAN DEFAULT true,
  push_announcement BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- 9. SETTINGS / PAYROLL CONFIG
-- company_settings merged: SERIAL key/value def from
-- migration_rls_enhanced.sql + tenant columns (company_id,
-- company_code, name, address, phone, website, logo_url) from
-- migration_phase2_settings.sql (which used UUID PK — SERIAL kept
-- here to match existing FK expectations).
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  company_code TEXT,
  name TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  updated_by INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Richest payroll_records def: supabase/schema.sql (IDENTITY PK,
-- BPJS/PPh21 breakdown, UNIQUE(employee_id, period)).
CREATE TABLE IF NOT EXISTS payroll_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  base_salary BIGINT NOT NULL,
  allowance BIGINT DEFAULT 0,
  overtime_pay BIGINT DEFAULT 0,
  overtime_hours NUMERIC(5,1) DEFAULT 0,
  gross_income BIGINT NOT NULL,
  bpjs_kesehatan BIGINT DEFAULT 0,
  bpjs_jht BIGINT DEFAULT 0,
  bpjs_jp BIGINT DEFAULT 0,
  pph21 BIGINT DEFAULT 0,
  total_deductions BIGINT DEFAULT 0,
  take_home_pay BIGINT NOT NULL,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated','paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, period)
);

-- ============================================================
-- 10. RECRUITMENT: job_postings + candidates (with batch3 extension
-- columns merged in: address, birth_date, education, experience,
-- skills, expected_salary, cover_letter, linkedin_url, portfolio_url,
-- resume_url, gender).
-- ============================================================
CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  location VARCHAR(100),
  type VARCHAR(30) DEFAULT 'Full-time',
  status VARCHAR(20) DEFAULT 'open',
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON job_postings(company_id);

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_postings(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(30),
  stage VARCHAR(30) DEFAULT 'applied',
  source VARCHAR(50),
  rating INT DEFAULT 0,
  notes TEXT,
  resume_url TEXT,
  applied_date DATE DEFAULT CURRENT_DATE,
  address TEXT,
  birth_date DATE,
  education JSONB,
  experience JSONB,
  skills TEXT[],
  expected_salary BIGINT,
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  gender VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ASSETS / APPRAISAL / KPI (kpi_metrics.weight from batch3)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(100),
  serial VARCHAR(100),
  purchase_date DATE,
  status VARCHAR(20) DEFAULT 'available',
  assigned_to INT REFERENCES employees(id) ON DELETE SET NULL,
  condition VARCHAR(20) DEFAULT 'Good',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appraisals (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id INT REFERENCES employees(id) ON DELETE SET NULL,
  period VARCHAR(30) NOT NULL,
  rating DECIMAL(3,1) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in-progress',
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_records (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL,
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
  weight DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. ONBOARDING (onboarding.company_id from
-- fix_audit_missing_schema_2026.sql) + onboarding_checklist MERGED:
-- batch2 defines per-onboarding items (onboarding_id/item/completed)
-- while create_missing_tables defines reusable template rows
-- (title/is_required/company_id). Both shapes merged, onboarding_id
-- nullable so template rows can exist without a parent.
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'in-progress',
  start_date DATE DEFAULT CURRENT_DATE,
  target_completion DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_company ON onboarding(company_id);

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id BIGSERIAL PRIMARY KEY,
  onboarding_id INT REFERENCES onboarding(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  category VARCHAR(50) DEFAULT 'general',
  item VARCHAR(200),
  title TEXT,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  sort_order INT DEFAULT 0,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee ON onboarding_tasks(employee_id);

-- ============================================================
-- 13. TRAINING SUITE (richest: create_missing_tables.sql —
-- BIGSERIAL + trainings.company_id — over batch2 SERIAL).
-- training_participants merged: score + certificate_url (batch2) +
-- completed_at (missing-tables); status union of both variants.
-- training_materials merged: url nullable (missing-tables, lenient
-- over batch2 NOT NULL) + type union incl. youtube/document/video.
-- ============================================================
CREATE TABLE IF NOT EXISTS trainings (
  id BIGSERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'technical' CHECK (category IN ('technical','soft_skill','compliance','leadership','certification')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  instructor TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  max_participants INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trainings ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS training_participants (
  id BIGSERIAL PRIMARY KEY,
  training_id BIGINT REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered','enrolled','attended','completed','absent','cancelled')),
  score INT,
  certificate_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_participants_training ON training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_employee ON training_participants(employee_id);

CREATE TABLE IF NOT EXISTS training_materials (
  id BIGSERIAL PRIMARY KEY,
  training_id BIGINT REFERENCES trainings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  type TEXT DEFAULT 'link' CHECK (type IN ('link','youtube','video','pdf','document')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_materials_training ON training_materials(training_id);

CREATE TABLE IF NOT EXISTS self_assessments (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  period TEXT,
  achievements TEXT,
  challenges TEXT,
  goals TEXT,
  strengths TEXT,
  improvements TEXT,
  self_rating INT DEFAULT 3 CHECK (self_rating BETWEEN 1 AND 5),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft','submitted','reviewed')),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_assessments_employee ON self_assessments(employee_id);

CREATE TABLE IF NOT EXISTS employee_documents (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes TEXT,
  reviewed_by BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);

-- ============================================================
-- 14. PROJECTS / TIMESHEETS
-- CHOICE: id UUID per supabase/projects.sql (over SERIAL in
-- complete_migration.sql and BIGSERIAL in create_missing_tables.sql).
-- project_assignments likewise UUID. timesheets merges the timer/text
-- columns (task, project, notes, description, updated_at) from
-- create_missing_tables.sql.
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  start_date DATE NOT NULL,
  end_date DATE,
  hourly_rate NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#2563EB',
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('lead','member')),
  allocation_pct INT DEFAULT 100,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours NUMERIC(6,2) DEFAULT 0,
  task TEXT,
  project TEXT,
  notes TEXT,
  description TEXT,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);

-- ============================================================
-- 15. LOANS / OVERTIME / OFFBOARDING / AI
-- overtime_requests.project_id UUID (supabase/projects.sql) merged in.
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  remaining BIGINT DEFAULT 0,
  monthly_deduction BIGINT DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
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

CREATE TABLE IF NOT EXISTS offboarding (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'initiated',
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

CREATE TABLE IF NOT EXISTS ai_capabilities (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  score INT DEFAULT 0,
  level VARCHAR(20) DEFAULT 'beginner',
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

-- ============================================================
-- 16. CONTRACTS (migration_contracts.sql, as-is)
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('pkwt','pkwtt','offering_letter','addendum','appointment')),
  html_content TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_contracts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES contract_templates(id) ON DELETE SET NULL,
  contract_number VARCHAR(100),
  type VARCHAR(30) NOT NULL CHECK (type IN ('pkwt','pkwtt','offering_letter','addendum','appointment')),
  html_content TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','expired','terminated')),
  employee_signature TEXT,
  company_signature TEXT,
  employee_signed_at TIMESTAMPTZ,
  company_signed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_employee ON employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON employee_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON employee_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON employee_contracts(type);
CREATE INDEX IF NOT EXISTS idx_templates_type ON contract_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_company ON contract_templates(company_id);

-- ============================================================
-- 17. COMPANY POLICIES (migration_company_policies.sql)
-- company_id added NULLABLE for future tenant scoping — no source
-- defines it, but every sibling table carries one and hardening
-- migrations filter policies per company.
-- ============================================================
CREATE TABLE IF NOT EXISTS company_policies (
  id BIGSERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sop', 'regulation', 'policy', 'guideline', 'template')),
  version TEXT DEFAULT '1.0',
  effective_date DATE,
  description TEXT,
  content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  is_mandatory BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. FACE ATTENDANCE (migration_face_attendance.sql)
-- CHOICE: descriptor FLOAT8[] (128-dim vector) kept over the JSONB
-- variant in create_missing_tables.sql; the wider column set
-- (capture_image_url, registered_at, registered_by, quality_score)
-- is kept. UNIQUE(employee_id, label) preserved.
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_faces (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  descriptor FLOAT8[] NOT NULL,
  label VARCHAR(100) DEFAULT 'face',
  capture_image_url TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_by INT REFERENCES employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  quality_score FLOAT DEFAULT 0,
  UNIQUE(employee_id, label)
);

CREATE INDEX IF NOT EXISTS idx_employee_faces_employee ON employee_faces(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_faces_active ON employee_faces(employee_id, is_active);

CREATE TABLE IF NOT EXISTS attendance_trust_logs (
  id SERIAL PRIMARY KEY,
  attendance_id INT REFERENCES attendance(id) ON DELETE CASCADE,
  trust_score INTEGER NOT NULL DEFAULT 0,
  trust_level VARCHAR(20),
  gps_accuracy FLOAT,
  gps_samples JSONB,
  gps_variance FLOAT,
  ip_location JSONB,
  ip_gps_distance_km FLOAT,
  travel_distance_m FLOAT,
  travel_elapsed_hours FLOAT,
  travel_speed_kmh FLOAT,
  face_verified BOOLEAN DEFAULT false,
  face_distance FLOAT,
  face_confidence FLOAT,
  liveness_passed BOOLEAN DEFAULT false,
  liveness_challenges JSONB,
  device_info JSONB,
  motion_variance FLOAT,
  flags TEXT[],
  flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_logs_attendance ON attendance_trust_logs(attendance_id);
CREATE INDEX IF NOT EXISTS idx_trust_logs_score ON attendance_trust_logs(trust_score);
CREATE INDEX IF NOT EXISTS idx_trust_logs_level ON attendance_trust_logs(trust_level);
CREATE INDEX IF NOT EXISTS idx_trust_logs_created ON attendance_trust_logs(created_at DESC);

-- ============================================================
-- 19. PUSH SUBSCRIPTIONS (merged: endpoint UNIQUE + user_agent from
-- create_missing_tables.sql, updated_at + trigger from
-- migration_push_subscriptions.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_employee ON push_subscriptions(employee_id);

-- ============================================================
-- 20. PROFILE UPDATE REQUESTS + CAREER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_update_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL,
  field_label VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INT REFERENCES employees(id),
  review_note TEXT
);

CREATE TABLE IF NOT EXISTS career_settings (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL DEFAULT 'informasilowongan',
  company_name VARCHAR(200) DEFAULT 'HRISync',
  company_description TEXT DEFAULT 'Platform HRIS Modern untuk Perusahaan Indonesia',
  logo_url TEXT,
  accent_color VARCHAR(10) DEFAULT '#0047AB',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 21. SUBSCRIPTIONS / FOUNDER PORTAL (founder_portal.sql 1-155 +
-- precision columns from migration_subscription_precision.sql:
-- starts_at, expires_at, days_total, plan_name, price_paid,
-- price_monthly, discount_amount, voucher_code, payment_method,
-- user_id, plan_slug).
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(30) UNIQUE NOT NULL,
  price_monthly BIGINT DEFAULT 0,
  price_yearly BIGINT DEFAULT 0,
  max_employees INT DEFAULT 5,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(is_active);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  plan_id INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
  plan_slug TEXT,
  plan_name TEXT,
  status VARCHAR(20) DEFAULT 'active',
  billing_cycle VARCHAR(10) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  starts_at TIMESTAMPTZ,
  end_date DATE,
  expires_at TIMESTAMPTZ,
  days_total INT,
  trial_ends_at DATE,
  amount BIGINT DEFAULT 0,
  price_paid BIGINT DEFAULT 0,
  price_monthly BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  voucher_code TEXT,
  payment_method VARCHAR(50) DEFAULT 'free',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Parity with migration_subscription_precision.sql: one active
-- subscription row per user.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key') THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscription_payments (
  id SERIAL PRIMARY KEY,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  currency VARCHAR(5) DEFAULT 'IDR',
  payment_method VARCHAR(50),
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'paid',
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON subscription_payments(company_id);

-- VOUCHERS merged.
-- CHOICE: SERIAL PK per migration_founder_portal.sql (over the UUID
-- variant in migration_onboarding_payments.sql); discount_value kept
-- NUMERIC, plus plan_slug + created_by from the onboarding-payments
-- variant so voucher checks in checkout code keep working.
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  applicable_plans JSONB DEFAULT '[]',
  plan_slug TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active);

CREATE TABLE IF NOT EXISTS voucher_usage (
  id SERIAL PRIMARY KEY,
  voucher_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS founder_broadcasts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  target VARCHAR(20) DEFAULT 'all',
  target_plan_id INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
  target_company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  action_url TEXT,
  action_label VARCHAR(100),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_sent ON founder_broadcasts(sent_at);

CREATE TABLE IF NOT EXISTS client_complaints (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  contact_name VARCHAR(100),
  contact_email VARCHAR(150),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_company ON client_complaints(company_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON client_complaints(status);

CREATE TABLE IF NOT EXISTS complaint_replies (
  id SERIAL PRIMARY KEY,
  complaint_id INT REFERENCES client_complaints(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL,
  sender_name VARCHAR(100),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_complaint ON complaint_replies(complaint_id);

CREATE TABLE IF NOT EXISTS website_analytics (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  page_path VARCHAR(200),
  feature_name VARCHAR(100),
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  device_type VARCHAR(20),
  locale VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON website_analytics(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_company ON website_analytics(company_id);

-- ============================================================
-- 22. ONBOARDING PROFILES + PAYMENT ORDERS
-- (migration_onboarding_payments.sql; RLS policies excluded here.)
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  employee_count TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_profiles(user_id);

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL,
  plan_name TEXT,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','expired','cancelled')),
  midtrans_status TEXT,
  snap_token TEXT,
  voucher_code TEXT,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);

-- ============================================================
-- 23. BACKUP / SOFT-DELETE / BILLING / PLATFORM
-- (phase5 backup system, fix_audit billing_info, platform_settings.
-- The phase5 auto-backup trigger function fn_soft_delete_backup is
-- NOT included: it belongs to the backup feature migration, not the
-- schema baseline.)
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_logs (
  id BIGSERIAL PRIMARY KEY,
  backup_type TEXT NOT NULL,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  table_name TEXT,
  row_count INT,
  backup_key TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS company_snapshots (
  id BIGSERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employees_json JSONB,
  departments_json JSONB,
  payroll_summary JSONB,
  attendance_count INT,
  leave_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS deleted_records (
  id BIGSERIAL PRIMARY KEY,
  company_id INT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_data JSONB NOT NULL,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restore_key TEXT,
  is_restored BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_company ON deleted_records(company_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_table ON deleted_records(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_deleted_at ON deleted_records(deleted_at);

CREATE TABLE IF NOT EXISTS billing_info (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  plan_name TEXT,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly') OR billing_cycle IS NULL),
  next_billing TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  payment_method TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_info_company ON billing_info(company_id);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 24. HELPER FUNCTIONS
-- Tenant helpers are defined HERE (baseline) so every later
-- migration can use them: get_my_company_id, get_my_employee_id,
-- get_my_role, is_admin, my_employee_id, is_founder.
-- (Same definitions as scripts/FIX_FOUNDER_PORTAL_RLS.sql.)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_admin', 'hr', 'finance')
  );
$$;

CREATE OR REPLACE FUNCTION my_employee_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Founder = JWT email matches platform_settings.founder_email
-- (set via 00200 seed or dashboard; NULL-safe: returns false when unset).
CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT value FROM platform_settings WHERE key = 'founder_email' LIMIT 1),
    ''
  ) <> ''
  AND LOWER(COALESCE((auth.jwt() ->> 'email'), '')) = LOWER(
    (SELECT value FROM platform_settings WHERE key = 'founder_email' LIMIT 1)
  );
$$;
CREATE OR REPLACE FUNCTION generate_company_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := 'KK-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS vouchers_updated_at ON vouchers;
CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS payment_orders_updated_at ON payment_orders;
CREATE TRIGGER payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_policies_updated_at ON company_policies;
CREATE TRIGGER update_company_policies_updated_at
  BEFORE UPDATE ON company_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 25. VIEWS (simple ones only)
-- ============================================================
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

-- Real-time subscription status (migration_subscription_precision.sql).
-- Included because every column it reads (plan_slug, expires_at,
-- starts_at, status) exists in the baseline subscriptions table above.
CREATE OR REPLACE VIEW subscription_status_view AS
SELECT
  s.*,
  sp.name              AS plan_label,
  sp.price_monthly     AS plan_price_monthly,
  sp.price_yearly      AS plan_price_yearly,
  sp.max_employees,
  CASE
    WHEN s.plan_slug = 'free' OR s.expires_at IS NULL THEN NULL
    ELSE GREATEST(0,
      CEIL(EXTRACT(EPOCH FROM (
        DATE_TRUNC('day', s.expires_at AT TIME ZONE 'UTC')
        - DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
      )) / 86400)::INT
    )
  END                  AS days_remaining,
  CASE
    WHEN s.status = 'cancelled'                    THEN 'cancelled'
    WHEN s.plan_slug = 'free'                      THEN 'free'
    WHEN s.expires_at < NOW()                      THEN 'expired'
    WHEN s.expires_at < NOW() + INTERVAL '1 day'   THEN 'critical'
    WHEN s.expires_at < NOW() + INTERVAL '3 days'  THEN 'warning_3'
    WHEN s.expires_at < NOW() + INTERVAL '7 days'  THEN 'warning_7'
    ELSE 'active'
  END                  AS computed_status,
  CASE
    WHEN s.plan_slug = 'free' OR s.expires_at IS NULL OR s.starts_at IS NULL THEN 100
    ELSE GREATEST(0, LEAST(100, ROUND(
      100.0 * EXTRACT(EPOCH FROM (s.expires_at - NOW()))
      / NULLIF(EXTRACT(EPOCH FROM (s.expires_at - s.starts_at)), 0)
    )))
  END                  AS percent_remaining
FROM subscriptions s
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id OR sp.slug = s.plan_slug;

-- ============================================================
-- 26. ENABLE RLS ON ALL BASELINE TABLES — NO POLICIES HERE.
-- Tables are locked by default; the later hardening migrations add
-- the real per-table policies. (Blanket USING(auth.role()=
-- 'authenticated') policies were deliberately left out.)
-- ============================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'companies','employees','departments','branches',
    'attendance','leave_requests','tickets','reimbursements',
    'office_locations','shifts','shift_assignments','holidays',
    'branch_holidays','announcements','documents','audit_trails',
    'notifications','notification_preferences','company_settings',
    'payroll_config','payroll_records','job_postings','candidates',
    'assets','appraisals','kpi_records','kpi_metrics',
    'onboarding','onboarding_checklist','onboarding_tasks',
    'trainings','training_participants','training_materials',
    'self_assessments','employee_documents','projects',
    'project_assignments','timesheets','loans','loan_payments',
    'overtime_requests','offboarding','offboarding_checklist',
    'ai_capabilities','ai_certifications','contract_templates',
    'employee_contracts','company_policies','employee_faces',
    'attendance_trust_logs','push_subscriptions',
    'profile_update_requests','career_settings','subscription_plans',
    'subscriptions','subscription_payments','vouchers','voucher_usage',
    'founder_broadcasts','client_complaints','complaint_replies',
    'website_analytics','onboarding_profiles','payment_orders',
    'backup_logs','company_snapshots','deleted_records',
    'billing_info','platform_settings'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- ============================================================
DO $$ BEGIN
  RAISE NOTICE 'baseline complete';
END $$;
