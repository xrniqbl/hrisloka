-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: Subscription Precision System                                  ║
-- ║  - Adds billing_cycle, starts_at, expires_at precision columns             ║
-- ║  - Auto-expire function (pg_cron compatible)                               ║
-- ║  - Expiry notification insert trigger                                      ║
-- ║  - Days remaining computed view                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure subscriptions table has all required precision columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle   VARCHAR(10) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS starts_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS days_total      INT,
  ADD COLUMN IF NOT EXISTS plan_name       TEXT,
  ADD COLUMN IF NOT EXISTS price_paid      BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_monthly   BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_code    TEXT,
  ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan_slug       TEXT;

-- Add unique constraint on user_id if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill days_total from billing_cycle for existing rows
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE subscriptions
SET days_total = CASE
  WHEN billing_cycle = 'yearly'  THEN 365
  WHEN billing_cycle = 'monthly' THEN 30
  ELSE 30
END
WHERE days_total IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Precise expires_at backfill using UTC midnight arithmetic
--    (no setMonth() drift — adds exact seconds)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE subscriptions
SET expires_at = (
  DATE_TRUNC('day', COALESCE(starts_at, created_at) AT TIME ZONE 'UTC')
  + (CASE
      WHEN billing_cycle = 'yearly'  THEN INTERVAL '365 days'
      WHEN billing_cycle = 'monthly' THEN INTERVAL '30 days'
      ELSE INTERVAL '30 days'
    END)
)
WHERE expires_at IS NULL
  AND plan_slug IS DISTINCT FROM 'free'
  AND status NOT IN ('cancelled', 'expired');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. View: subscription_status_view (real-time days_remaining)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW subscription_status_view AS
SELECT
  s.*,
  sp.name              AS plan_label,
  sp.price_monthly     AS plan_price_monthly,
  sp.price_yearly      AS plan_price_yearly,
  sp.max_employees,
  -- Days remaining (integer, UTC midnight comparison)
  CASE
    WHEN s.plan_slug = 'free' OR s.expires_at IS NULL THEN NULL
    ELSE GREATEST(0,
      CEIL(EXTRACT(EPOCH FROM (
        DATE_TRUNC('day', s.expires_at AT TIME ZONE 'UTC')
        - DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
      )) / 86400)::INT
    )
  END                  AS days_remaining,
  -- Computed status
  CASE
    WHEN s.status = 'cancelled'                    THEN 'cancelled'
    WHEN s.plan_slug = 'free'                      THEN 'free'
    WHEN s.expires_at < NOW()                      THEN 'expired'
    WHEN s.expires_at < NOW() + INTERVAL '1 day'   THEN 'critical'
    WHEN s.expires_at < NOW() + INTERVAL '3 days'  THEN 'warning_3'
    WHEN s.expires_at < NOW() + INTERVAL '7 days'  THEN 'warning_7'
    ELSE 'active'
  END                  AS computed_status,
  -- Percentage remaining
  CASE
    WHEN s.plan_slug = 'free' OR s.expires_at IS NULL OR s.starts_at IS NULL THEN 100
    ELSE GREATEST(0, LEAST(100, ROUND(
      100.0 * EXTRACT(EPOCH FROM (s.expires_at - NOW()))
      / NULLIF(EXTRACT(EPOCH FROM (s.expires_at - s.starts_at)), 0)
    )))
  END                  AS percent_remaining
FROM subscriptions s
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id OR sp.slug = s.plan_slug;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Function: auto_expire_subscriptions()
--    Called daily by pg_cron or Edge Function scheduler
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_expire_subscriptions()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  expired_count INT;
BEGIN
  -- Mark expired subscriptions
  UPDATE subscriptions
  SET
    status     = 'expired',
    updated_at = NOW()
  WHERE
    status NOT IN ('expired', 'cancelled', 'free')
    AND plan_slug != 'free'
    AND expires_at IS NOT NULL
    AND DATE_TRUNC('day', expires_at AT TIME ZONE 'UTC')
        < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RAISE NOTICE 'auto_expire_subscriptions: % subscriptions expired', expired_count;
  RETURN expired_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Function: notify_expiring_subscriptions()
--    Inserts warning notifications into the notifications table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_expiring_subscriptions()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  notif_count INT := 0;
  sub_rec     RECORD;
  days_left   INT;
  notif_key   TEXT;
  today_str   TEXT;
BEGIN
  today_str := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');

  FOR sub_rec IN
    SELECT
      s.id,
      s.user_id,
      s.company_id,
      s.plan_slug,
      s.plan_name,
      s.expires_at,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
        DATE_TRUNC('day', s.expires_at AT TIME ZONE 'UTC')
        - DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
      )) / 86400))::INT AS days_remaining
    FROM subscriptions s
    WHERE s.status = 'active'
      AND s.plan_slug != 'free'
      AND s.expires_at IS NOT NULL
      AND s.expires_at >= NOW()
  LOOP
    days_left := sub_rec.days_remaining;
    -- Only notify at 7, 3, 1 days
    IF days_left IN (7, 3, 1) THEN
      notif_key := 'sub_expiry_' || sub_rec.id || '_' || days_left || '_' || today_str;

      -- Insert for each employee in the company (HR admins)
      INSERT INTO notifications (employee_id, title, message, type, reference_id, created_at)
      SELECT
        e.id,
        CASE days_left
          WHEN 1 THEN 'Langganan Berakhir Hari Ini!'
          WHEN 3 THEN 'Langganan Berakhir dalam 3 Hari'
          WHEN 7 THEN 'Langganan Berakhir dalam 7 Hari'
        END,
        'Paket ' || COALESCE(sub_rec.plan_name, sub_rec.plan_slug) ||
        ' Anda akan berakhir pada ' ||
        TO_CHAR(sub_rec.expires_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY') ||
        '. Segera perpanjang untuk menghindari gangguan layanan.',
        'system',
        sub_rec.id::TEXT,
        NOW()
      FROM employees e
      WHERE e.company_id = sub_rec.company_id
        AND e.role IN ('super_admin', 'hr_admin', 'hr')
        AND e.status = 'active'
      ON CONFLICT DO NOTHING;

      notif_count := notif_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'notify_expiring_subscriptions: % notifications sent', notif_count;
  RETURN notif_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Trigger: auto-set expires_at on INSERT/UPDATE with exact precision
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_subscription_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Always compute expires_at from starts_at + exact days (no drift)
  IF NEW.plan_slug = 'free' THEN
    NEW.expires_at := NULL;
    NEW.days_total := NULL;
  ELSIF NEW.starts_at IS NOT NULL THEN
    -- Normalize starts_at to UTC midnight
    NEW.starts_at := DATE_TRUNC('day', NEW.starts_at AT TIME ZONE 'UTC');
    -- Set exact duration
    NEW.days_total := CASE
      WHEN NEW.billing_cycle = 'yearly'  THEN 365
      WHEN NEW.billing_cycle = 'monthly' THEN 30
      ELSE 30
    END;
    -- Compute expires_at as starts_at + exact days (in seconds, no month ambiguity)
    NEW.expires_at := NEW.starts_at + (NEW.days_total * INTERVAL '1 day');
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_expiry ON subscriptions;
CREATE TRIGGER trg_subscription_expiry
  BEFORE INSERT OR UPDATE OF starts_at, billing_cycle, plan_slug
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_subscription_expiry();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Scheduled job instructions (pg_cron — run in Supabase Dashboard)
-- ─────────────────────────────────────────────────────────────────────────────
-- Enable pg_cron extension first:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- Then schedule daily jobs at midnight UTC:
--   SELECT cron.schedule('auto-expire-subscriptions', '0 0 * * *', $$SELECT auto_expire_subscriptions()$$);
--   SELECT cron.schedule('notify-expiring-subs', '0 8 * * *', $$SELECT notify_expiring_subscriptions()$$);
--
-- Or use Supabase Edge Function with cron trigger if pg_cron not available.

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  sub_count INT;
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO sub_count FROM subscriptions;
  SELECT COUNT(*) INTO active_count FROM subscriptions WHERE status = 'active';
  RAISE NOTICE '✅ Subscription migration complete: % total, % active', sub_count, active_count;
END $$;
