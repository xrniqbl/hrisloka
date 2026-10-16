-- ============================================================
-- HRISync Migration: Company Settings, Notification Prefs & Payroll Config
-- IDEMPOTENT version — aman dijalankan berulang kali
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. COMPANY SETTINGS TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code text UNIQUE,
  name         text,
  address      text,
  phone        text,
  website      text,
  logo_url     text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before re-creating (idempotent)
DROP POLICY IF EXISTS "company_settings_read"  ON company_settings;
DROP POLICY IF EXISTS "company_settings_write" ON company_settings;

CREATE POLICY "company_settings_read"
  ON company_settings FOR SELECT
  USING (true);

CREATE POLICY "company_settings_write"
  ON company_settings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 2. NOTIFICATION PREFERENCES TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_leave           boolean DEFAULT true,
  email_payroll         boolean DEFAULT true,
  email_reimbursement   boolean DEFAULT true,
  push_attendance       boolean DEFAULT true,
  push_approval         boolean DEFAULT true,
  push_announcement     boolean DEFAULT true,
  whatsapp_enabled      boolean DEFAULT false,
  whatsapp_number       text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_own" ON notification_preferences;

CREATE POLICY "notif_prefs_own"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 3. PAYROLL CONFIG TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_config (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code text UNIQUE,
  config       jsonb NOT NULL DEFAULT '{}',
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_config_read"  ON payroll_config;
DROP POLICY IF EXISTS "payroll_config_write" ON payroll_config;

CREATE POLICY "payroll_config_read"
  ON payroll_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "payroll_config_write"
  ON payroll_config FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------
-- 4. AUTO UPDATE updated_at TRIGGER
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers before re-creating (idempotent)
DROP TRIGGER IF EXISTS company_settings_updated_at ON company_settings;
DROP TRIGGER IF EXISTS notif_prefs_updated_at      ON notification_preferences;
DROP TRIGGER IF EXISTS payroll_config_updated_at   ON payroll_config;

CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notif_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payroll_config_updated_at
  BEFORE UPDATE ON payroll_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------
-- 5. AUDIT TRAIL VIEW (fix for broken employees:user_id join)
-- ---------------------------------------------------------------
DROP VIEW IF EXISTS audit_logs_view;

CREATE VIEW audit_logs_view AS
SELECT
  at.*,
  au.email AS user_email,
  e.name   AS user_name
FROM audit_trails at
LEFT JOIN auth.users au ON au.id = at.user_id
LEFT JOIN employees e   ON e.email = au.email
ORDER BY at.created_at DESC;

GRANT SELECT ON audit_logs_view TO authenticated;

-- ---------------------------------------------------------------
-- Done!
-- ---------------------------------------------------------------
SELECT 'Migration phase2 complete ✓' AS status;
