-- ============================================================
-- Migration: Fix audit RLS gaps + payment status values
-- Date: 2026-10-11
-- Idempotent: DROP POLICY IF EXISTS / IF NOT EXISTS guards throughout.
-- Validate: by eye only (no live DB in this environment).
-- ============================================================

-- ── 0. Harden helpers (search_path=public, SECURITY DEFINER) ──

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── 1. payment_orders.status: allow 'disputed' ────────────────
-- Current inline CHECK (20261009001100 + repair baseline §22) is
-- auto-named by Postgres: payment_orders_status_check.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_orders_status_check'
      AND conrelid = 'public.payment_orders'::regclass
  ) THEN
    ALTER TABLE public.payment_orders DROP CONSTRAINT payment_orders_status_check;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_orders_status_check'
      AND conrelid = 'public.payment_orders'::regclass
  ) THEN
    ALTER TABLE public.payment_orders ADD CONSTRAINT payment_orders_status_check
      CHECK (status IN ('pending','paid','failed','expired','cancelled','disputed'));
  END IF;
END $$;

-- ── 2. subscriptions.status: allow past_due (+ trialing etc.) ─
-- Baseline defines subscriptions.status as VARCHAR(20) DEFAULT 'active'
-- with NO check constraint, so this ADDs one (guarded, only if missing).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_status_check'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN ('active','trialing','past_due','cancelled','expired','suspended'));
  END IF;
END $$;
-- NOTE: if a differently-named status CHECK already exists on subscriptions,
-- drop it manually and re-run this block; the ADD above is skipped when
-- subscriptions_status_check is present.

-- ── 3. office_locations: enable RLS + tenant policies ─────────
-- Mirrors the departments pattern from 20261009001000 (same-company only;
-- tenant admins are inherently included since they share the company_id).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'office_locations'
  ) THEN
    ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "office_locations_company_isolation" ON public.office_locations;
    CREATE POLICY "office_locations_company_isolation" ON public.office_locations
      USING (company_id = get_my_company_id())
      WITH CHECK (company_id = get_my_company_id());
  END IF;
END $$;

-- ── 4a. subscriptions: enable RLS + tenant policies ───────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "subscriptions_tenant_all" ON public.subscriptions;
    -- Owner (by user_id) or anyone in the same company (by company_id).
    CREATE POLICY "subscriptions_tenant_all" ON public.subscriptions
      FOR ALL
      USING (
        user_id = auth.uid()
        OR company_id = get_my_company_id()
      )
      WITH CHECK (
        user_id = auth.uid()
        OR company_id = get_my_company_id()
      );
    DROP POLICY IF EXISTS "subscriptions_service_all" ON public.subscriptions;
    CREATE POLICY "subscriptions_service_all" ON public.subscriptions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4b. subscription_plans: shared catalog, public read-only ──
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_plans'
  ) THEN
    ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;
    CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans
      FOR SELECT TO public
      USING (is_active = true);
    DROP POLICY IF EXISTS "subscription_plans_auth_read" ON public.subscription_plans;
    CREATE POLICY "subscription_plans_auth_read" ON public.subscription_plans
      FOR SELECT TO authenticated
      USING (true);
    DROP POLICY IF EXISTS "subscription_plans_service_all" ON public.subscription_plans;
    CREATE POLICY "subscription_plans_service_all" ON public.subscription_plans
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4c. push_subscriptions: user/company scoped ───────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
  ) THEN
    ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "push_subscriptions_owner" ON public.push_subscriptions;
    -- Own push endpoint (via own employee row) or same-company admin.
    CREATE POLICY "push_subscriptions_owner" ON public.push_subscriptions
      FOR ALL
      USING (
        employee_id = get_my_employee_id()
        OR employee_id IN (
          SELECT id FROM employees WHERE company_id = get_my_company_id()
        ) AND get_my_role() IN ('hr_admin', 'super_admin')
      )
      WITH CHECK (
        employee_id = get_my_employee_id()
        OR employee_id IN (
          SELECT id FROM employees WHERE company_id = get_my_company_id()
        ) AND get_my_role() IN ('hr_admin', 'super_admin')
      );
    DROP POLICY IF EXISTS "push_subscriptions_service_all" ON public.push_subscriptions;
    CREATE POLICY "push_subscriptions_service_all" ON public.push_subscriptions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 5. employees self-read exception (fresh-signup lockout) ───
-- The tenant SELECT policy requires company_id = get_my_company_id(),
-- so a freshly-signed-up user whose employee row still has company_id NULL
-- cannot read their own row (and get_my_company_id() stays NULL forever).
-- This exception lets a user always read their OWN row.
DROP POLICY IF EXISTS "employees_self_read" ON public.employees;
CREATE POLICY "employees_self_read" ON public.employees
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- ── 6. storage.objects: object-level RLS for private buckets ──
-- NOTE: storage.objects is owned by Supabase (not the login role), so
-- direct ALTER/POLICY statements fail with "must be owner of table
-- objects" when pushed via `supabase db push`. This block therefore runs
-- best-effort inside a DO block that catches insufficient_privilege and
-- raises a NOTICE instead of aborting the migration. Apply
-- scripts/STORAGE_BUCKETS_SETUP.sql + scripts/STORAGE_LOCKDOWN.sql in the
-- Supabase Dashboard SQL Editor (as owner) if the NOTICE below appears.
DO $$
BEGIN
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'storage.objects not owned by login role — skipping storage RLS (apply scripts/STORAGE_LOCKDOWN.sql in Dashboard SQL Editor as owner)';
    RETURN;
  END;
END $$;

-- documents (private)
-- All storage.objects policy DDL below runs inside ONE best-effort DO
-- block: any statement can raise insufficient_privilege (not table owner),
-- which is caught once so the rest of the migration still applies.
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "documents_auth_all" ON storage.objects;
    DROP POLICY IF EXISTS "documents_select_owner" ON storage.objects;
    DROP POLICY IF EXISTS "documents_insert_owner" ON storage.objects;
    DROP POLICY IF EXISTS "documents_update_owner" ON storage.objects;
    DROP POLICY IF EXISTS "documents_delete_owner" ON storage.objects;
    CREATE POLICY "documents_select_owner" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "documents_insert_owner" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "documents_update_owner" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "documents_delete_owner" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

    DROP POLICY IF EXISTS "receipts_auth_all" ON storage.objects;
    DROP POLICY IF EXISTS "receipts_select_owner" ON storage.objects;
    DROP POLICY IF EXISTS "receipts_insert_owner" ON storage.objects;
    DROP POLICY IF EXISTS "receipts_update_owner" ON storage.objects;
    DROP POLICY IF EXISTS "receipts_delete_owner" ON storage.objects;
    CREATE POLICY "receipts_select_owner" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "receipts_insert_owner" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "receipts_update_owner" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "receipts_delete_owner" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

    DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;
    CREATE POLICY "resumes_public_read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'resumes');
    CREATE POLICY "resumes_auth_write" ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'resumes' AND name ~* '\.(pdf|doc|docx)$');

    DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "profile_photos_auth_write" ON storage.objects;
    DROP POLICY IF EXISTS "profile_photos_auth_update" ON storage.objects;
    DROP POLICY IF EXISTS "profile_photos_auth_delete" ON storage.objects;
    CREATE POLICY "profile_photos_public_read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id IN ('profile_photos', 'avatars'));
    CREATE POLICY "profile_photos_auth_write" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "profile_photos_auth_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "profile_photos_auth_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'storage.objects policies skipped (not table owner) — apply scripts/STORAGE_LOCKDOWN.sql in Dashboard SQL Editor as owner';
  END;
END $$;

-- TODO: full MIME-sniff + 10 MB server-side upload validation needs an Edge
-- Function before upload (see STORAGE_LOCKDOWN.sql H8 note); client-side
-- enforcement lives in PublicApplyForm.jsx. Anon has no policy on private
-- buckets and is therefore denied by default (restrictive default holds).
