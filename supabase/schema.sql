-- ═══════════════════════════════════════════════════════════════
-- HRISync — Complete Database Schema + RLS Policies
-- Run this SQL in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 0: Add role column BEFORE creating helper functions
-- (is_admin() references this column, so it must exist first)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='role') THEN
    ALTER TABLE public.employees ADD COLUMN role text DEFAULT 'employee';
  END IF;
END $$;

-- ─── Helper: Admin check function ───
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'hr', 'finance')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Helper: Get current employee ID ───
CREATE OR REPLACE FUNCTION public.my_employee_id()
RETURNS bigint AS $$
  SELECT id FROM public.employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT USING (
  auth_user_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE USING (
  auth_user_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees FOR DELETE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- TABLE: attendance (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- TABLE: office_locations (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_locations_select" ON public.office_locations;
CREATE POLICY "office_locations_select" ON public.office_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "office_locations_manage" ON public.office_locations;
CREATE POLICY "office_locations_manage" ON public.office_locations FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- TABLE: leave_requests (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_select" ON public.leave_requests;
CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "leave_insert" ON public.leave_requests;
CREATE POLICY "leave_insert" ON public.leave_requests FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "leave_update" ON public.leave_requests;
CREATE POLICY "leave_update" ON public.leave_requests FOR UPDATE USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "leave_delete" ON public.leave_requests;
CREATE POLICY "leave_delete" ON public.leave_requests FOR DELETE USING (
  (employee_id = public.my_employee_id() AND status = 'pending') OR public.is_admin()
);


-- ═══════════════════════════════════════════════════════════════
-- TABLE: reimbursements (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reimb_select" ON public.reimbursements;
CREATE POLICY "reimb_select" ON public.reimbursements FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "reimb_insert" ON public.reimbursements;
CREATE POLICY "reimb_insert" ON public.reimbursements FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "reimb_update" ON public.reimbursements;
CREATE POLICY "reimb_update" ON public.reimbursements FOR UPDATE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- TABLE: tickets (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- TABLE: documents (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "docs_select" ON public.documents;
CREATE POLICY "docs_select" ON public.documents FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "docs_insert" ON public.documents;
CREATE POLICY "docs_insert" ON public.documents FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);

DROP POLICY IF EXISTS "docs_update" ON public.documents;
CREATE POLICY "docs_update" ON public.documents FOR UPDATE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- TABLE: audit_trails (already exists)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.audit_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON public.audit_trails;
CREATE POLICY "audit_select" ON public.audit_trails FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "audit_insert" ON public.audit_trails;
CREATE POLICY "audit_insert" ON public.audit_trails FOR INSERT WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════
-- TABLE: announcements (already exists or create)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.announcements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  created_by bigint REFERENCES public.employees(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announce_select" ON public.announcements;
CREATE POLICY "announce_select" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "announce_insert" ON public.announcements;
CREATE POLICY "announce_insert" ON public.announcements FOR INSERT WITH CHECK (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: divisions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.divisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  parent_id bigint REFERENCES public.divisions(id),
  head_id bigint REFERENCES public.employees(id),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "divisions_read" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "divisions_manage" ON public.divisions FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: shifts
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text DEFAULT '#6D8196',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_read" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "shifts_manage" ON public.shifts FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: shift_assignments
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id bigint NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, day_of_week, effective_date)
);

ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_assign_select" ON public.shift_assignments FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "shift_assign_manage" ON public.shift_assignments FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: holidays
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.holidays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  date date NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_read" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "holidays_manage" ON public.holidays FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: overtime_requests
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric(4,1) NOT NULL CHECK (hours > 0),
  rate numeric(3,1) DEFAULT 1.5,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by bigint REFERENCES public.employees(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overtime_select" ON public.overtime_requests FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "overtime_insert" ON public.overtime_requests FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "overtime_update" ON public.overtime_requests FOR UPDATE USING (public.is_admin());
CREATE POLICY "overtime_delete" ON public.overtime_requests FOR DELETE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: payroll_records
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period text NOT NULL,
  base_salary bigint NOT NULL,
  allowance bigint DEFAULT 0,
  overtime_pay bigint DEFAULT 0,
  overtime_hours numeric(5,1) DEFAULT 0,
  gross_income bigint NOT NULL,
  bpjs_kesehatan bigint DEFAULT 0,
  bpjs_jht bigint DEFAULT 0,
  bpjs_jp bigint DEFAULT 0,
  pph21 bigint DEFAULT 0,
  total_deductions bigint DEFAULT 0,
  take_home_pay bigint NOT NULL,
  status text DEFAULT 'generated' CHECK (status IN ('generated','paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period)
);

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_select" ON public.payroll_records FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "payroll_manage" ON public.payroll_records FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: loans
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.loans (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  remaining bigint NOT NULL,
  monthly_deduction bigint NOT NULL,
  reason text,
  status text DEFAULT 'active' CHECK (status IN ('pending','active','paid','rejected')),
  approved_by bigint REFERENCES public.employees(id),
  start_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select" ON public.loans FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "loans_insert" ON public.loans FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "loans_manage" ON public.loans FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: loan_payments
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_id bigint NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  method text DEFAULT 'salary_deduction',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_pay_select" ON public.loan_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_payments.loan_id AND loans.employee_id = public.my_employee_id())
  OR public.is_admin()
);
CREATE POLICY "loan_pay_manage" ON public.loan_payments FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: kpi_records
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.kpi_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period text NOT NULL,
  overall_score numeric(5,1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period)
);

ALTER TABLE public.kpi_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi_select" ON public.kpi_records FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "kpi_manage" ON public.kpi_records FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: kpi_metrics
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.kpi_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kpi_record_id bigint NOT NULL REFERENCES public.kpi_records(id) ON DELETE CASCADE,
  name text NOT NULL,
  target numeric(10,1),
  actual numeric(10,1),
  score numeric(5,1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi_metrics_select" ON public.kpi_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.kpi_records WHERE kpi_records.id = kpi_metrics.kpi_record_id AND (kpi_records.employee_id = public.my_employee_id() OR public.is_admin()))
);
CREATE POLICY "kpi_metrics_manage" ON public.kpi_metrics FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: appraisals
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.appraisals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id bigint REFERENCES public.employees(id),
  period text NOT NULL,
  rating numeric(3,1),
  status text DEFAULT 'in-progress' CHECK (status IN ('in-progress','completed')),
  comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appraisals_select" ON public.appraisals FOR SELECT USING (
  employee_id = public.my_employee_id() OR reviewer_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "appraisals_manage" ON public.appraisals FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: job_postings
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.job_postings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  department text,
  location text,
  type text DEFAULT 'Full-time',
  status text DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  description text,
  requirements text[],
  deadline date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_read" ON public.job_postings FOR SELECT USING (true);
CREATE POLICY "jobs_manage" ON public.job_postings FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: candidates
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.candidates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  job_id bigint NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  stage text DEFAULT 'applied' CHECK (stage IN ('applied','screening','interview','offered','hired','rejected')),
  source text,
  rating numeric(3,1),
  notes text,
  applied_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates_select" ON public.candidates FOR SELECT USING (public.is_admin());
CREATE POLICY "candidates_manage" ON public.candidates FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: assets
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assets (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text,
  brand text,
  serial text,
  purchase_date date,
  status text DEFAULT 'available' CHECK (status IN ('available','in-use','maintenance','retired')),
  assigned_to bigint REFERENCES public.employees(id),
  condition text DEFAULT 'Good',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_read" ON public.assets FOR SELECT USING (true);
CREATE POLICY "assets_manage" ON public.assets FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: offboarding
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.offboarding (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text CHECK (type IN ('resign','contract-end','termination')),
  status text DEFAULT 'initiated' CHECK (status IN ('initiated','in-progress','completed')),
  reason text,
  initiated_date date DEFAULT CURRENT_DATE,
  last_working_day date,
  pro_rata_salary bigint DEFAULT 0,
  severance_pay bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.offboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offboarding_select" ON public.offboarding FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "offboarding_manage" ON public.offboarding FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: offboarding_checklist
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.offboarding_checklist (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offboarding_id bigint NOT NULL REFERENCES public.offboarding(id) ON DELETE CASCADE,
  item text NOT NULL,
  completed boolean DEFAULT false,
  asset_id text REFERENCES public.assets(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.offboarding_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offb_checklist_select" ON public.offboarding_checklist FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.offboarding WHERE offboarding.id = offboarding_checklist.offboarding_id AND (offboarding.employee_id = public.my_employee_id() OR public.is_admin()))
);
CREATE POLICY "offb_checklist_manage" ON public.offboarding_checklist FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════
-- NEW TABLE: push_subscriptions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_select" ON public.push_subscriptions FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "push_insert" ON public.push_subscriptions FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id()
);
CREATE POLICY "push_delete" ON public.push_subscriptions FOR DELETE USING (
  employee_id = public.my_employee_id()
);


-- ═══════════════════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimb_employee ON public.reimbursements(employee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_employee ON public.tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_employee ON public.overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON public.payroll_records(period);
CREATE INDEX IF NOT EXISTS idx_loans_employee ON public.loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpi_employee ON public.kpi_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_employee ON public.appraisals(employee_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job ON public.candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned ON public.assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_offboarding_employee ON public.offboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_docs_employee ON public.documents(employee_id);
