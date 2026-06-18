-- ============================================================
-- Migration: Founder Portal
-- Tables: subscriptions, vouchers, broadcast, client_complaints, website_analytics
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Subscription Plans (managed by founder)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,           -- 'Free', 'Starter', 'Pro', 'Enterprise'
  slug VARCHAR(30) UNIQUE NOT NULL,
  price_monthly BIGINT DEFAULT 0,      -- IDR
  price_yearly BIGINT DEFAULT 0,
  max_employees INT DEFAULT 5,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(is_active);

-- 2. Company Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  plan_id INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended'
  billing_cycle VARCHAR(10) DEFAULT 'monthly', -- 'monthly' | 'yearly'
  start_date DATE NOT NULL,
  end_date DATE,
  trial_ends_at DATE,
  amount BIGINT DEFAULT 0,
  payment_method VARCHAR(50),
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 3. Subscription Payment History
CREATE TABLE IF NOT EXISTS subscription_payments (
  id SERIAL PRIMARY KEY,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  currency VARCHAR(5) DEFAULT 'IDR',
  payment_method VARCHAR(50),
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'paid',  -- 'paid' | 'failed' | 'refunded'
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON subscription_payments(company_id);

-- 4. Vouchers / Discount Codes
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(10) NOT NULL,  -- 'percent' | 'fixed'
  discount_value INT NOT NULL,         -- percent 0-100 or IDR amount
  max_uses INT DEFAULT NULL,           -- NULL = unlimited
  used_count INT DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  applicable_plans JSONB DEFAULT '[]', -- [] = all plans
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active);

-- 5. Voucher Usage Tracking
CREATE TABLE IF NOT EXISTS voucher_usage (
  id SERIAL PRIMARY KEY,
  voucher_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Founder Broadcast Notifications
CREATE TABLE IF NOT EXISTS founder_broadcasts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',     -- 'info' | 'warning' | 'success' | 'promo'
  target VARCHAR(20) DEFAULT 'all',   -- 'all' | 'plan' | 'company'
  target_plan_id INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
  target_company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  action_url TEXT,
  action_label VARCHAR(100),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_sent ON founder_broadcasts(sent_at);

-- 7. Client Complaints (from subscribing companies TO founder)
CREATE TABLE IF NOT EXISTS client_complaints (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  contact_name VARCHAR(100),
  contact_email VARCHAR(150),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general', -- 'billing' | 'technical' | 'feature' | 'general'
  priority VARCHAR(20) DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'urgent'
  status VARCHAR(20) DEFAULT 'open',      -- 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_company ON client_complaints(company_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON client_complaints(status);

-- 8. Complaint Replies (thread)
CREATE TABLE IF NOT EXISTS complaint_replies (
  id SERIAL PRIMARY KEY,
  complaint_id INT REFERENCES client_complaints(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL,    -- 'founder' | 'client'
  sender_name VARCHAR(100),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_complaint ON complaint_replies(complaint_id);

-- 9. Website Analytics Events (lightweight, client-side reported)
CREATE TABLE IF NOT EXISTS website_analytics (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,     -- 'page_view' | 'feature_use' | 'login' | 'signup'
  page_path VARCHAR(200),
  feature_name VARCHAR(100),
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  device_type VARCHAR(20),             -- 'desktop' | 'mobile' | 'tablet'
  locale VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON website_analytics(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_company ON website_analytics(company_id);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Plans: public read (for landing page), authenticated write
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_read" ON subscription_plans;
CREATE POLICY "plans_read" ON subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "plans_write_auth" ON subscription_plans;
CREATE POLICY "plans_write_auth" ON subscription_plans FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Subscriptions: authenticated only
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_auth" ON subscriptions;
CREATE POLICY "subscriptions_auth" ON subscriptions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Payments: authenticated only
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_auth" ON subscription_payments;
CREATE POLICY "payments_auth" ON subscription_payments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Vouchers: public read (validation), authenticated write
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vouchers_read" ON vouchers;
CREATE POLICY "vouchers_read" ON vouchers FOR SELECT USING (true);
DROP POLICY IF EXISTS "vouchers_write_auth" ON vouchers;
CREATE POLICY "vouchers_write_auth" ON vouchers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Voucher usage: authenticated
ALTER TABLE voucher_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voucher_usage_auth" ON voucher_usage;
CREATE POLICY "voucher_usage_auth" ON voucher_usage FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Broadcasts: public read, authenticated write
ALTER TABLE founder_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "broadcasts_read" ON founder_broadcasts;
CREATE POLICY "broadcasts_read" ON founder_broadcasts FOR SELECT USING (true);
DROP POLICY IF EXISTS "broadcasts_write_auth" ON founder_broadcasts;
CREATE POLICY "broadcasts_write_auth" ON founder_broadcasts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Client complaints: authenticated
ALTER TABLE client_complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "complaints_auth" ON client_complaints;
CREATE POLICY "complaints_auth" ON client_complaints FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Complaint replies: authenticated
ALTER TABLE complaint_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "replies_auth" ON complaint_replies;
CREATE POLICY "replies_auth" ON complaint_replies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Analytics: authenticated
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_auth" ON website_analytics;
CREATE POLICY "analytics_auth" ON website_analytics FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Seed Data — Subscription Plans
-- ============================================================

INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_employees, features, sort_order)
VALUES
  ('Free', 'free', 0, 0, 5,
   '["Hingga 5 karyawan", "Absensi dasar", "Dashboard sederhana"]',
   1),
  ('Starter', 'starter', 149000, 1490000, 25,
   '["Hingga 25 karyawan", "Absensi & Cuti", "Payroll dasar", "PWA Karyawan", "Email support"]',
   2),
  ('Pro', 'pro', 299000, 2990000, 100,
   '["Hingga 100 karyawan", "Semua fitur Starter", "Perekrutan & KPI", "Geofence Attendance", "AI Expense OCR", "Laporan lanjutan", "Priority support"]',
   3),
  ('Enterprise', 'enterprise', 0, 0, 9999,
   '["Karyawan unlimited", "Semua fitur Pro", "Custom integration", "Dedicated support", "SLA 99.9%", "On-premise option"]',
   4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Update Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS vouchers_updated_at ON vouchers;
CREATE TRIGGER vouchers_updated_at BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS complaints_updated_at ON client_complaints;
CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON client_complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
