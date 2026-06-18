-- ================================================
-- HRISync — Migration Batch 3
-- Training Materials, Career Settings, Candidate Extensions
-- Run in Supabase SQL Editor
-- ================================================

-- 1. Training Materials (link YouTube/materi untuk pelatihan)
CREATE TABLE IF NOT EXISTS training_materials (
  id SERIAL PRIMARY KEY,
  training_id INT REFERENCES trainings(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'link', -- 'youtube', 'link', 'document', 'video'
  url TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Career Settings (konfigurasi halaman karir publik)
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

-- Insert default career settings
INSERT INTO career_settings (slug, company_name, company_description, accent_color)
VALUES ('informasilowongan', 'HRISync', 'Platform HRIS Modern untuk Perusahaan Indonesia', '#0047AB')
ON CONFLICT (slug) DO NOTHING;

-- 3. Extend candidates table for full application form
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS expected_salary BIGINT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- 4. Add weight column to kpi_metrics for weighted calculation
ALTER TABLE kpi_metrics ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 1.0;

-- 5. Enable RLS
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_settings ENABLE ROW LEVEL SECURITY;

-- 6. Authenticated user policies
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['training_materials', 'career_settings']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_%s" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_full_%s" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');', tbl, tbl);
  END LOOP;
END $$;

-- 7. Public access policies (for career page — no login needed)
-- Allow anyone to read open job postings
DROP POLICY IF EXISTS "public_read_jobs" ON job_postings;
CREATE POLICY "public_read_jobs" ON job_postings
  FOR SELECT USING (true);

-- Allow anyone to read career settings
DROP POLICY IF EXISTS "public_read_career_settings" ON career_settings;
CREATE POLICY "public_read_career_settings" ON career_settings
  FOR SELECT USING (true);

-- Allow anyone to INSERT a candidate application
DROP POLICY IF EXISTS "public_insert_candidates" ON candidates;
CREATE POLICY "public_insert_candidates" ON candidates
  FOR INSERT WITH CHECK (true);

-- 8. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE training_materials;

-- 9. Supabase Storage bucket instructions
-- RUN THESE MANUALLY IN SUPABASE DASHBOARD:
-- 1. Go to Storage → New Bucket → Name: "resumes" → Public: OFF
-- 2. Add policy: Allow INSERT for anon role (so public can upload)
-- 3. Add policy: Allow SELECT for authenticated role (so admins can download)
