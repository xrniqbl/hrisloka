-- ---------------------------------------------------------------
-- HRIS Loka — RLS (Row Level Security) Audit Script
-- Run this in Supabase SQL Editor to verify tenant isolation
-- ---------------------------------------------------------------

-- 1) Tables without RLS (should be empty or only system helpers)
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 2) Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify RLS policies exist for multi-tenant tables
SELECT policyname, tablename, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'employees', 'attendance', 'leave_requests', 'overtime_requests',
    'reimbursements', 'departments', 'documents', 'payroll', 'payslips',
    'companies', 'subscriptions', 'trainings', 'onboarding', 'offboarding',
    'ai_capabilities', 'ai_certifications', 'office_locations',
    'holidays', 'job_postings', 'candidates', 'announcements'
  )
ORDER BY tablename, policyname;

-- Check for missing company_id columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN (
    'employees', 'attendance', 'leave_requests', 'reimbursements',
    'departments', 'documents', 'trainings', 'onboarding', 'ai_capabilities',
    'office_locations', 'holidays', 'job_postings', 'candidates', 'announcements'
  )
  AND column_name = 'company_id'
ORDER BY table_name;
