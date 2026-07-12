-- Production: scope announcements by company for HR web ↔ PWA employee
-- companies.id is SERIAL/INT (see migration_company_register.sql), NOT uuid.

-- 1) company_id as INTEGER (matches companies.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'announcements'
      AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.announcements
      ADD COLUMN company_id integer REFERENCES public.companies(id);
  ELSE
    -- If previously added as uuid by mistake, leave as-is and warn
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'announcements'
        AND column_name = 'company_id'
        AND data_type = 'uuid'
    ) THEN
      RAISE NOTICE 'announcements.company_id is uuid — drop & re-add as integer if companies.id is integer';
    END IF;
  END IF;
END $$;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';

-- created_by may be int (employees.id) or uuid depending on schema — use text-safe skip
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'announcements'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN created_by integer;
  END IF;
END $$;

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

-- office_locations.company_id as integer too (if missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'office_locations'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'office_locations'
      AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.office_locations
      ADD COLUMN company_id integer REFERENCES public.companies(id);
  END IF;
END $$;
