-- =============================================================
-- Project Management Module: Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date DATE NOT NULL,
  end_date DATE,
  hourly_rate NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Project Assignments (employee_id = BIGINT to match employees.id)
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member')),
  allocation_pct INT DEFAULT 100,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- 3. Timesheets (employee_id = BIGINT to match employees.id)
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours NUMERIC,
  description TEXT,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add project_id to overtime_requests (UUID → references projects.id which IS UUID)
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Projects: readable by all authenticated, writable by admin
CREATE POLICY "projects_select" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_manage" ON projects FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (public.is_admin());
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (public.is_admin());

-- Assignments: readable by all, writable by admin
CREATE POLICY "assignments_select" ON project_assignments FOR SELECT USING (true);
CREATE POLICY "assignments_manage" ON project_assignments FOR ALL USING (public.is_admin());

-- Timesheets: own data or admin
CREATE POLICY "timesheets_select" ON timesheets FOR SELECT USING (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "timesheets_insert" ON timesheets FOR INSERT WITH CHECK (
  employee_id = public.my_employee_id() OR public.is_admin()
);
CREATE POLICY "timesheets_update" ON timesheets FOR UPDATE USING (public.is_admin());
CREATE POLICY "timesheets_delete" ON timesheets FOR DELETE USING (public.is_admin());
