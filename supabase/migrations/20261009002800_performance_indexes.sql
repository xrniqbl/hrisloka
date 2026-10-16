-- ============================================================
-- MIGRATION: Performance Indexes (Safe Version)
-- Each index wrapped in exception handler for missing columns
-- Run in Supabase SQL Editor
-- ============================================================

-- Employees
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_employees_company_status ON public.employees(company_id, account_status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_employees_company_status'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_employees_company_division ON public.employees(company_id, division);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_employees_company_division'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_employees_auth_user ON public.employees(auth_user_id) WHERE auth_user_id IS NOT NULL;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_employees_auth_user'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email) WHERE email IS NOT NULL;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_employees_email'; END $$;

-- Attendance
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, date DESC);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_attendance_employee_date'; END $$;

-- Leave Requests
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON public.leave_requests(employee_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_leave_requests_employee_status'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_leave_requests_status_created ON public.leave_requests(status, created_at DESC);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_leave_requests_status_created'; END $$;

-- Reimbursements
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_reimbursements_employee_status ON public.reimbursements(employee_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_reimbursements_employee_status'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_reimbursements_status_created ON public.reimbursements(status, created_at DESC);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_reimbursements_status_created'; END $$;

-- Overtime Requests
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_overtime_employee_status ON public.overtime_requests(employee_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_overtime_employee_status'; END $$;

-- Payment Orders
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_payment_orders_user_status ON public.payment_orders(user_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_payment_orders_user_status'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON public.payment_orders(order_id);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_payment_orders_order_id'; END $$;

-- Cron reconcile scans pending orders by (status, created_at), oldest first
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created ON public.payment_orders(status, created_at);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_payment_orders_status_created'; END $$;

-- Subscriptions
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id) WHERE user_id IS NOT NULL;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_subscriptions_user_id'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires ON public.subscriptions(status, expires_at) WHERE status = 'active';
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_subscriptions_status_expires'; END $$;

-- Documents
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_documents_employee_status ON public.documents(employee_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_documents_employee_status'; END $$;

-- Loans
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_loans_employee_status ON public.loans(employee_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_loans_employee_status'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_loans_company ON public.loans(company_id);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_loans_company - no company_id column'; END $$;

-- Offboarding
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_offboarding_employee_status ON public.offboarding(employee_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_offboarding_employee_status'; END $$;

-- KPI Records
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_kpi_employee_period ON public.kpi_records(employee_id, period DESC);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_kpi_employee_period'; END $$;

-- Appraisals
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_appraisals_employee ON public.appraisals(employee_id, created_at DESC);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_appraisals_employee'; END $$;

-- Candidates & Jobs
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_candidates_job_status ON public.candidates(job_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_candidates_job_status'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_job_postings_company_active ON public.job_postings(company_id, is_active) WHERE is_active = true;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_job_postings_company_active - no company_id column'; END $$;

-- Projects
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_projects_company_status ON public.projects(company_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_projects_company_status - no company_id column'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_project_assignments_employee ON public.project_assignments(employee_id);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_project_assignments_employee'; END $$;

-- Timesheets
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date ON public.timesheets(employee_id, date DESC);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_timesheets_employee_date'; END $$;

-- Announcements
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_announcements_company_created ON public.announcements(company_id, created_at DESC) WHERE company_id IS NOT NULL;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_announcements_company_created - no company_id column'; END $$;

-- Push Subscriptions
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_employee ON public.push_subscriptions(employee_id);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_push_subscriptions_employee'; END $$;

-- Audit Trails
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_audit_trails_company_created ON public.audit_trails(company_id, created_at DESC) WHERE company_id IS NOT NULL;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_audit_trails_company_created - no company_id column'; END $$;

-- Assets
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_assets_company_status ON public.assets(company_id, status);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_assets_company_status - no company_id column'; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_assets_assigned ON public.assets(assigned_to) WHERE assigned_to IS NOT NULL;
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_assets_assigned'; END $$;

-- Company Settings
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_company_settings_company_key ON public.company_settings(company_id, key);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_company_settings_company_key'; END $$;

-- Branches
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_branches_company'; END $$;

-- Departments
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
EXCEPTION WHEN undefined_column THEN RAISE NOTICE 'Skipped: idx_departments_company'; END $$;
