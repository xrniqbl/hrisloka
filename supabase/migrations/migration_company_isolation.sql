-- ============================================================
-- Migration: Add company_id to multi-tenant tables
-- Run this in Supabase SQL Editor
-- NOTE: companies.id is INTEGER, so company_id cols must be INTEGER
-- ============================================================

-- 1. departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);

-- 2. shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shifts_company_id ON shifts(company_id);

-- 3. holidays
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_holidays_company_id ON holidays(company_id);

-- 4. job_postings
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON job_postings(company_id);

-- 5. announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_announcements_company_id ON announcements(company_id);

-- 6. contract_templates
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contract_templates_company_id ON contract_templates(company_id);

-- 7. branches (may already exist)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);

-- 8. office_locations
ALTER TABLE office_locations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_office_locations_company_id ON office_locations(company_id);

-- ============================================================
-- Helper function: get current user's company_id
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS INTEGER AS $$
  SELECT company_id FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- Enable RLS on tables
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — company isolation
-- ============================================================

-- departments: own company only
DROP POLICY IF EXISTS "departments_company_isolation" ON departments;
CREATE POLICY "departments_company_isolation" ON departments
  USING (company_id = get_my_company_id() OR company_id IS NULL);

-- shifts: own company only
DROP POLICY IF EXISTS "shifts_company_isolation" ON shifts;
CREATE POLICY "shifts_company_isolation" ON shifts
  USING (company_id = get_my_company_id() OR company_id IS NULL);

-- holidays: national (NULL company_id) are shared; company-specific are isolated
DROP POLICY IF EXISTS "holidays_company_isolation" ON holidays;
CREATE POLICY "holidays_company_isolation" ON holidays
  USING (company_id IS NULL OR company_id = get_my_company_id());

-- job_postings: own company only
DROP POLICY IF EXISTS "job_postings_company_isolation" ON job_postings;
CREATE POLICY "job_postings_company_isolation" ON job_postings
  USING (company_id = get_my_company_id() OR company_id IS NULL);

-- announcements: own company only
DROP POLICY IF EXISTS "announcements_company_isolation" ON announcements;
CREATE POLICY "announcements_company_isolation" ON announcements
  USING (company_id = get_my_company_id() OR company_id IS NULL);

-- contract_templates: default (is_default=true) are shared, rest isolated
DROP POLICY IF EXISTS "contract_templates_company_isolation" ON contract_templates;
CREATE POLICY "contract_templates_company_isolation" ON contract_templates
  USING (is_default = true OR company_id = get_my_company_id() OR company_id IS NULL);

-- branches: own company only
DROP POLICY IF EXISTS "branches_company_isolation" ON branches;
CREATE POLICY "branches_company_isolation" ON branches
  USING (company_id = get_my_company_id() OR company_id IS NULL);

-- ============================================================
-- Back-fill: assign all orphan rows to the first company
-- Uncomment and run ONLY if you have a single company
-- ============================================================

-- DO $$
-- DECLARE first_company_id INTEGER;
-- BEGIN
--   SELECT id INTO first_company_id FROM companies ORDER BY id LIMIT 1;
--   UPDATE departments SET company_id = first_company_id WHERE company_id IS NULL;
--   UPDATE shifts SET company_id = first_company_id WHERE company_id IS NULL;
--   UPDATE holidays SET company_id = first_company_id WHERE company_id IS NULL;
--   UPDATE job_postings SET company_id = first_company_id WHERE company_id IS NULL;
--   UPDATE announcements SET company_id = first_company_id WHERE company_id IS NULL;
--   UPDATE branches SET company_id = first_company_id WHERE company_id IS NULL;
-- END $$;
