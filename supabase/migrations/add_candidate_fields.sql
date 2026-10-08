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

-- Public can submit applications (insert only, job harus open)
CREATE POLICY "Public can insert candidates"
  ON candidates FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = candidates.job_id
      AND job_postings.status = 'open'
    )
  );

-- HR/Admin hanya melihat kandidat perusahaannya sendiri (tenant-scoped).
-- Butuh get_my_company_id() dari migration_phase4b_rls_complete.sql.
CREATE POLICY "Company members can view candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE company_id = get_my_company_id()
    )
  );

-- HR/Admin hanya update kandidat perusahaannya sendiri
CREATE POLICY "Company members can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE company_id = get_my_company_id()
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT id FROM job_postings
      WHERE company_id = get_my_company_id()
    )
  );

-- HR/Admin hanya hapus kandidat perusahaannya sendiri
CREATE POLICY "Company members can delete candidates"
  ON candidates FOR DELETE
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE company_id = get_my_company_id()
    )
  );

-- 3. Allow public to insert into audit_trails (for application submission log)
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert audit_trails" ON audit_trails;
CREATE POLICY "Public can insert audit_trails"
  ON audit_trails FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view audit_trails" ON audit_trails;
-- SECURITY: audit_trails tidak punya company_id — hanya user yang punya baris
-- di tabel ini (user_id = dirinya) yang boleh baca. Jangan USING(true).
CREATE POLICY "Users can view own audit_trails"
  ON audit_trails FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Allow public to insert website_analytics
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert analytics" ON website_analytics;
CREATE POLICY "Public can insert analytics"
  ON website_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Storage: bucket resumes HARUS private (CV berisi PII).
-- Pelamar publik tetap bisa upload (INSERT), tapi baca (SELECT) hanya untuk
-- user login. Unduh CV dilakukan via signed URL dari server/HR.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Allow anonymous uploads to resumes (apply form publik, insert-only)
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
CREATE POLICY "Public can upload resumes"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Public can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Members can read resumes" ON storage.objects;
CREATE POLICY "Members can read resumes"
  ON storage.objects FOR SELECT
  TO authenticated
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
