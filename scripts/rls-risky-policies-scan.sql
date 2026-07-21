-- ============================================================
-- Scan ALL public RLS policies for high-risk patterns
-- Run in Supabase SQL Editor after employees fix.
-- ============================================================

-- 1) Policies that allow everything (USING true / WITH CHECK true)
SELECT
  tablename,
  policyname,
  cmd,
  'USING true / permissive' AS risk,
  qual::text AS using_expr,
  with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text ILIKE '%true%'
    OR with_check::text ILIKE '%true%'
  )
  -- exclude founder-style email equality that may contain the word true elsewhere
  AND (
    qual::text ~* '\(\s*true\s*\)'
    OR with_check::text ~* '\(\s*true\s*\)'
    OR qual::text = 'true'
    OR with_check::text = 'true'
  )
ORDER BY tablename, policyname;

-- 2) is_admin() without company scope (common legacy leak)
SELECT
  tablename,
  policyname,
  cmd,
  'is_admin without company' AS risk,
  qual::text AS using_expr,
  with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text ILIKE '%is_admin()%'
    OR with_check::text ILIKE '%is_admin()%'
  )
  AND (
    (qual::text NOT ILIKE '%get_my_company_id%' AND with_check::text IS DISTINCT FROM NULL AND with_check::text NOT ILIKE '%get_my_company_id%')
    OR (qual::text ILIKE '%is_admin()%' AND qual::text NOT ILIKE '%get_my_company_id%')
  )
ORDER BY tablename, policyname;

-- 3) super_admin role check without get_my_company_id (global super_admin)
SELECT
  tablename,
  policyname,
  cmd,
  'super_admin without company scope' AS risk,
  qual::text AS using_expr,
  with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual::text ILIKE '%super_admin%' AND qual::text NOT ILIKE '%get_my_company_id%')
    OR (with_check::text ILIKE '%super_admin%' AND with_check::text NOT ILIKE '%get_my_company_id%')
  )
ORDER BY tablename, policyname;

-- 4) Core tables: RLS on + has any policy?
SELECT t.tablename,
       COALESCE((
         SELECT relrowsecurity FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = t.tablename
       ), false) AS rls_enabled,
       EXISTS (
         SELECT 1 FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t.tablename
       ) AS has_policy
FROM (VALUES
  ('employees'),('attendance'),('leave_requests'),('overtime_requests'),
  ('reimbursements'),('departments'),('documents'),('companies'),
  ('subscriptions'),('announcements'),('job_postings'),('candidates'),
  ('notifications'),('company_settings'),('payroll_records'),('payroll_config'),
  ('branches'),('shifts'),('tickets'),
  ('employee_contracts'),('contract_templates'), -- real names (not "contracts")
  ('assets'),('projects'),('timesheets'),('loans'),('appraisals')
) AS t(tablename)
ORDER BY t.tablename;

-- Target:
--   Query 1–3: 0 rows (or only intentional founder bypasses — review manually)
--   Query 4: rls_enabled=true and has_policy=true for tables that exist
