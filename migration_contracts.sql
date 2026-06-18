-- ============================================================
-- Migration: Contract Management System
-- HRIS Loka — Kontrak Kerja & Offering Letter
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Ensure companies table has all fields needed for contracts
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address      TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city         VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone        VARCHAR(30);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS npwp         VARCHAR(30);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS director     VARCHAR(150);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pic_name     VARCHAR(150);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry     VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url     TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website      TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email        VARCHAR(150);

-- Step 2: Contract Templates Table
CREATE TABLE IF NOT EXISTS contract_templates (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER       REFERENCES companies(id) ON DELETE CASCADE,
  name         VARCHAR(150)  NOT NULL,
  type         VARCHAR(30)   NOT NULL CHECK (type IN ('pkwt','pkwtt','offering_letter','addendum','appointment')),
  html_content TEXT          NOT NULL DEFAULT '',
  is_default   BOOLEAN       DEFAULT false,
  description  TEXT,
  created_at   TIMESTAMPTZ   DEFAULT now(),
  updated_at   TIMESTAMPTZ   DEFAULT now()
);

-- Step 3: Employee Contracts Table
CREATE TABLE IF NOT EXISTS employee_contracts (
  id                  SERIAL        PRIMARY KEY,
  company_id          INTEGER       REFERENCES companies(id) ON DELETE CASCADE,
  employee_id         INTEGER       REFERENCES employees(id) ON DELETE CASCADE,
  template_id         INTEGER       REFERENCES contract_templates(id) ON DELETE SET NULL,
  contract_number     VARCHAR(100),
  type                VARCHAR(30)   NOT NULL CHECK (type IN ('pkwt','pkwtt','offering_letter','addendum','appointment')),
  html_content        TEXT          NOT NULL DEFAULT '',
  status              VARCHAR(20)   DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','expired','terminated')),
  -- Signatures (base64 PNG data URLs)
  employee_signature  TEXT,
  company_signature   TEXT,
  employee_signed_at  TIMESTAMPTZ,
  company_signed_at   TIMESTAMPTZ,
  signed_at           TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  pdf_url             TEXT,
  notes               TEXT,
  metadata            JSONB         DEFAULT '{}',
  created_by          UUID,
  created_at          TIMESTAMPTZ   DEFAULT now(),
  updated_at          TIMESTAMPTZ   DEFAULT now()
);

-- Step 4: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_employee   ON employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company    ON employee_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status     ON employee_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_type       ON employee_contracts(type);
CREATE INDEX IF NOT EXISTS idx_templates_type       ON contract_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_company    ON contract_templates(company_id);

-- Step 5: Enable Row Level Security
ALTER TABLE contract_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_contracts  ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies (idempotent — drop before create)
DROP POLICY IF EXISTS "templates_read"  ON contract_templates;
DROP POLICY IF EXISTS "templates_write" ON contract_templates;
DROP POLICY IF EXISTS "contracts_read"  ON employee_contracts;
DROP POLICY IF EXISTS "contracts_write" ON employee_contracts;

CREATE POLICY "templates_read"  ON contract_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "templates_write" ON contract_templates FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "contracts_read"  ON employee_contracts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "contracts_write" ON employee_contracts FOR ALL    USING (auth.role() = 'authenticated');

-- ============================================================
-- HOW DEFAULT TEMPLATES WORK
-- ============================================================
-- Default templates are seeded automatically by the frontend app
-- when first opening the Contract Management page (ContractManagement.jsx).
-- The app calls contractService.createTemplate() for each item in
-- src/data/contractTemplates.js (DEFAULT_TEMPLATES) if none exist.
--
-- No manual SQL insert needed — just run this migration and open
-- the app. Templates will appear automatically.
-- ============================================================
