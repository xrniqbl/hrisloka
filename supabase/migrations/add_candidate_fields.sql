-- ══════════════════════════════════════════════════════════
-- Migration: Extend candidates table + fix RLS for public apply
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- 1. Add missing columns to candidates table
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS gender        TEXT,
  ADD COLUMN IF NOT EXISTS birth_date    DATE,
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS education     JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skills        TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_url    TEXT,
  ADD COLUMN IF NOT EXISTS cover_letter  TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url  TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS expected_salary BIGINT,
  ADD COLUMN IF NOT EXISTS ref_number    TEXT;

-- 2. Allow public (unauthenticated) users to INSERT into candidates
--    (needed for career page apply form — public route, no login)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Drop existing public insert policy if any
DROP POLICY IF EXISTS "Public can insert candidates" ON candidates;
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON candidates;

-- Public can submit applications (insert only)
CREATE POLICY "Public can insert candidates"
  ON candidates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated HR/Admin can view all candidates
CREATE POLICY "Authenticated users can view candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated HR/Admin can update candidate stage etc
CREATE POLICY "Authenticated users can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated HR/Admin can delete
CREATE POLICY "Authenticated users can delete candidates"
  ON candidates FOR DELETE
  TO authenticated
  USING (true);

-- 3. Allow public to insert into audit_trails (for application submission log)
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert audit_trails" ON audit_trails;
CREATE POLICY "Public can insert audit_trails"
  ON audit_trails FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view audit_trails" ON audit_trails;
CREATE POLICY "Authenticated users can view audit_trails"
  ON audit_trails FOR SELECT
  TO authenticated
  USING (true);

-- 4. Allow public to insert website_analytics
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert analytics" ON website_analytics;
CREATE POLICY "Public can insert analytics"
  ON website_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Storage: allow public to upload to resumes bucket
-- Run this in Storage section: create bucket 'resumes' with public = true
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anonymous uploads to resumes
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
CREATE POLICY "Public can upload resumes"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Public can read resumes" ON storage.objects;
CREATE POLICY "Public can read resumes"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'resumes');

-- 6. Enable Realtime for candidates (safe - won't error if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
  END IF;
END $$;

-- Done!
-- After running, verify with:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'candidates';
