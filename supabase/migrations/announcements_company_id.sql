-- Production: scope announcements by company for HR web ↔ PWA employee
-- Run in Supabase SQL Editor if company_id is missing on announcements.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_announcements_company_created
  ON public.announcements (company_id, created_at DESC);

-- Prefer company-scoped read for authenticated employees of that company
DROP POLICY IF EXISTS "announce_select" ON public.announcements;
DROP POLICY IF EXISTS "Employees can read announcements" ON public.announcements;
DROP POLICY IF EXISTS "announce_select_company" ON public.announcements;

CREATE POLICY "announce_select_company" ON public.announcements
  FOR SELECT
  USING (
    company_id IS NULL
    OR company_id IN (
      SELECT e.company_id FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "announce_insert" ON public.announcements;
DROP POLICY IF EXISTS "Admin full access to announcements" ON public.announcements;
DROP POLICY IF EXISTS "announce_manage_company" ON public.announcements;

CREATE POLICY "announce_manage_company" ON public.announcements
  FOR ALL
  USING (
    public.is_admin()
    AND (
      company_id IS NULL
      OR company_id IN (
        SELECT e.company_id FROM public.employees e
        WHERE e.auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    AND (
      company_id IS NULL
      OR company_id IN (
        SELECT e.company_id FROM public.employees e
        WHERE e.auth_user_id = auth.uid()
      )
    )
  );
