-- ============================================================
-- HRISloka — Founder Portal + Platform Settings RLS Hardening
-- ============================================================
-- Fixes audit findings (2026-08-09):
--   1. migration_founder_portal.sql created blanket
--      FOR ALL USING (auth.role() = 'authenticated') policies on
--      subscriptions, subscription_plans, vouchers, voucher_usage,
--      subscription_payments, founder_broadcasts, client_complaints,
--      complaint_replies, website_analytics.
--      => ANY logged-in user could read/write ALL tenants' billing data.
--   2. 20260516_platform_settings.sql allowed ANY authenticated user
--      to write platform_settings (maintenance toggle, founder_email).
--
-- Replacement model:
--   - Billing/plan/voucher/broadcast writes: founder only
--     (server-side Edge Functions use service_role and bypass RLS).
--   - Owners can READ their own subscription/payments and manage
--     their own support tickets (client_complaints, complaint_replies).
--   - website_analytics: public insert (event tracking), founder-only read.
--   - platform_settings: public read, founder-only write.
--
-- Safe to run multiple times (DROP IF EXISTS + CREATE POLICY).
-- Run in Supabase SQL Editor AFTER migration_founder_portal.sql.
-- ============================================================

-- ── HELPER FUNCTIONS (idempotent — same as migration_rls_fix.sql) ──
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT get_my_role() = 'founder';
$$;

-- ============================================================
-- 1. subscription_plans — public read, founder-only write
-- ============================================================
DROP POLICY IF EXISTS "plans_write_auth" ON subscription_plans;
DROP POLICY IF EXISTS "plans_founder_write" ON subscription_plans;
CREATE POLICY "plans_founder_write" ON subscription_plans
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());
-- (plans_read public SELECT kept from migration_founder_portal.sql)

-- ============================================================
-- 2. subscriptions — owner/company read, founder-only write.
--    Client writes (free activation) now go through the
--    activate-free-subscription Edge Function (service_role).
-- ============================================================
DROP POLICY IF EXISTS "subscriptions_auth" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_owner_read" ON subscriptions;
CREATE POLICY "subscriptions_owner_read" ON subscriptions
  FOR SELECT USING (
    user_id = auth.uid()
    OR (company_id IS NOT NULL AND company_id = get_my_company_id())
    OR is_founder()
  );
DROP POLICY IF EXISTS "subscriptions_founder_write" ON subscriptions;
CREATE POLICY "subscriptions_founder_write" ON subscriptions
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());

-- ============================================================
-- 3. subscription_payments — own-company read, founder-only write
-- ============================================================
DROP POLICY IF EXISTS "payments_auth" ON subscription_payments;
DROP POLICY IF EXISTS "payments_owner_read" ON subscription_payments;
CREATE POLICY "payments_owner_read" ON subscription_payments
  FOR SELECT USING (
    (company_id IS NOT NULL AND company_id = get_my_company_id())
    OR is_founder()
  );
DROP POLICY IF EXISTS "payments_founder_write" ON subscription_payments;
CREATE POLICY "payments_founder_write" ON subscription_payments
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());

-- ============================================================
-- 4. vouchers — public read (checkout validation), founder-only write.
--    Usage increment moved server-side (Edge Functions, service_role).
-- ============================================================
DROP POLICY IF EXISTS "vouchers_write_auth" ON vouchers;
DROP POLICY IF EXISTS "vouchers_founder_write" ON vouchers;
CREATE POLICY "vouchers_founder_write" ON vouchers
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());
-- (vouchers_read public SELECT kept from migration_founder_portal.sql)

-- ============================================================
-- 5. voucher_usage — founder/server only
-- ============================================================
DROP POLICY IF EXISTS "voucher_usage_auth" ON voucher_usage;
DROP POLICY IF EXISTS "voucher_usage_founder" ON voucher_usage;
CREATE POLICY "voucher_usage_founder" ON voucher_usage
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());

-- ============================================================
-- 6. founder_broadcasts — public read, founder-only write
-- ============================================================
DROP POLICY IF EXISTS "broadcasts_write_auth" ON founder_broadcasts;
DROP POLICY IF EXISTS "broadcasts_founder_write" ON founder_broadcasts;
CREATE POLICY "broadcasts_founder_write" ON founder_broadcasts
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());
-- (broadcasts_read public SELECT kept from migration_founder_portal.sql)

-- ============================================================
-- 7. client_complaints — tenant-scoped support tickets
-- ============================================================
DROP POLICY IF EXISTS "complaints_auth" ON client_complaints;

DROP POLICY IF EXISTS "complaints_tenant_read" ON client_complaints;
CREATE POLICY "complaints_tenant_read" ON client_complaints
  FOR SELECT USING (
    (company_id IS NOT NULL AND company_id = get_my_company_id())
    OR is_founder()
  );

DROP POLICY IF EXISTS "complaints_tenant_insert" ON client_complaints;
CREATE POLICY "complaints_tenant_insert" ON client_complaints
  FOR INSERT WITH CHECK (
    company_id IS NOT NULL AND company_id = get_my_company_id()
  );

DROP POLICY IF EXISTS "complaints_founder_all" ON client_complaints;
CREATE POLICY "complaints_founder_all" ON client_complaints
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());

-- ============================================================
-- 8. complaint_replies — replies on own company's tickets
-- ============================================================
DROP POLICY IF EXISTS "replies_auth" ON complaint_replies;

DROP POLICY IF EXISTS "replies_tenant_read" ON complaint_replies;
CREATE POLICY "replies_tenant_read" ON complaint_replies
  FOR SELECT USING (
    is_founder()
    OR EXISTS (
      SELECT 1 FROM client_complaints c
      WHERE c.id = complaint_id
        AND c.company_id IS NOT NULL
        AND c.company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "replies_tenant_insert" ON complaint_replies;
CREATE POLICY "replies_tenant_insert" ON complaint_replies
  FOR INSERT WITH CHECK (
    is_founder()
    OR EXISTS (
      SELECT 1 FROM client_complaints c
      WHERE c.id = complaint_id
        AND c.company_id IS NOT NULL
        AND c.company_id = get_my_company_id()
    )
  );

-- ============================================================
-- 9. website_analytics — public insert (event tracking), founder read
-- ============================================================
DROP POLICY IF EXISTS "analytics_auth" ON website_analytics;

DROP POLICY IF EXISTS "analytics_public_insert" ON website_analytics;
CREATE POLICY "analytics_public_insert" ON website_analytics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_founder_read" ON website_analytics;
CREATE POLICY "analytics_founder_read" ON website_analytics
  FOR SELECT USING (is_founder());

-- ============================================================
-- 10. platform_settings — public read, FOUNDER-ONLY write
--     (was: any authenticated user could toggle maintenance mode
--      or overwrite founder_email)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_write_platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "platform_settings_founder_write" ON platform_settings;
CREATE POLICY "platform_settings_founder_write" ON platform_settings
  FOR ALL USING (is_founder()) WITH CHECK (is_founder());
-- (public_read_platform_settings SELECT kept — needed by MaintenanceGuard)

-- ============================================================
-- VERIFY (optional): inspect resulting policies
-- ============================================================
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN (
--   'subscriptions','subscription_plans','subscription_payments','vouchers',
--   'voucher_usage','founder_broadcasts','client_complaints',
--   'complaint_replies','website_analytics','platform_settings'
-- )
-- ORDER BY tablename, policyname;
