-- ============================================================
-- WARNING: DESTRUCTIVE — drops/recreates company_id columns, data loss
-- if run after data exists; prefer a backfill migration instead.
-- Fix company_id columns that were created as UUID by mistake
-- (companies.id is SERIAL/INTEGER in this project)
-- ============================================================
-- Safe: only runs when column exists as uuid
-- ============================================================

DO $$
BEGIN
  -- announcements.company_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='announcements'
      AND column_name='company_id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.announcements DROP COLUMN company_id;
    ALTER TABLE public.announcements
      ADD COLUMN company_id integer REFERENCES public.companies(id);
    RAISE NOTICE 'Fixed announcements.company_id → integer';
  END IF;

  -- office_locations.company_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='office_locations'
      AND column_name='company_id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.office_locations DROP COLUMN company_id;
    ALTER TABLE public.office_locations
      ADD COLUMN company_id integer REFERENCES public.companies(id);
    RAISE NOTICE 'Fixed office_locations.company_id → integer';
  END IF;

  -- trainings.company_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trainings'
      AND column_name='company_id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.trainings DROP COLUMN company_id;
    ALTER TABLE public.trainings ADD COLUMN company_id integer;
    RAISE NOTICE 'Fixed trainings.company_id → integer';
  END IF;
END $$;

-- Verify types
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'company_id'
  AND table_name IN ('companies','employees','announcements','office_locations','trainings','holidays')
ORDER BY table_name;
