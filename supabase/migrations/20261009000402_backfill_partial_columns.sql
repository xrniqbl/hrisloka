-- ============================================================
-- Patch: backfill columns on partially-created remote tables.
-- The remote applied an early (partial) baseline before the full
-- baseline was finished, so some tables exist WITHOUT columns that
-- later migrations (00500+) reference. CREATE TABLE IF NOT EXISTS
-- never adds missing columns — these explicit ALTERs do.
-- Idempotent: every statement uses IF NOT EXISTS.
-- ============================================================

-- job_postings.company_id (used by 00500 candidate policies)
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON public.job_postings(company_id);

-- notifications.reference_id (used by 01500 notify_expiring_subscriptions)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- candidates: full extension columns (used by 00500 ALTER + policies)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS job_id INT REFERENCES public.job_postings(id) ON DELETE CASCADE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS stage VARCHAR(30) DEFAULT 'applied';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS rating INT DEFAULT 0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS applied_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS education JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS experience JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS expected_salary BIGINT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
