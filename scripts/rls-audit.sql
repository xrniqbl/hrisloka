-- ---------------------------------------------------------------
-- KiniKerja — RLS Tenant Isolation Audit
-- Run in Supabase SQL Editor (Dashboard → SQL → New query).
-- NOTE: Do NOT use psql meta-commands (\echo, \i, etc.) — SQL Editor rejects them.
-- Expected: section 2 empty (no global super_admin leaks).
-- ---------------------------------------------------------------

-- === 1. Tables without RLS (review carefully) ===
SELECT tablename AS tables_without_rls
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

-- === 2. Policies that mention super_admin without company scope (RISK) ===
-- Expected: 0 rows after harden_tenant_rls / fix_employees_rls_super_admin_leak
SELECT tablename, policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual::text ILIKE '%super_admin%' AND qual::text NOT ILIKE '%get_my_company_id%')
    OR (with_check::text ILIKE '%super_admin%' AND with_check::text NOT ILIKE '%get_my_company_id%')
  )
ORDER BY tablename, policyname;

-- === 3. Core multi-tenant tables — policies present? ===
SELECT t.tablename,
       EXISTS (
         SELECT 1 FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t.tablename
       ) AS has_policy,
       (SELECT relrowsecurity FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = t.tablename) AS rls_enabled
FROM (VALUES
  ('employees'),('attendance'),('leave_requests'),('overtime_requests'),
  ('reimbursements'),('departments'),('documents'),('companies'),
  ('subscriptions'),('announcements'),('job_postings'),('candidates'),
  ('notifications'),('company_settings'),('client_complaints'),
  ('founder_broadcasts')
) AS t(tablename)
ORDER BY t.tablename;

-- === 4. get_my_company_id / get_my_role / is_founder exist? ===
SELECT proname, prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('get_my_company_id', 'get_my_role', 'is_founder');

-- === 5. Sample: employees policies ===
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'employees'
ORDER BY policyname;

-- Done. If section 2 has rows or core tables lack RLS, apply:
--   supabase/migrations/fix_employees_rls_super_admin_leak.sql
--   supabase/migrations/harden_notifications_company_settings_rls.sql
--   supabase/migrations/harden_tenant_rls_bcd_2026.sql
