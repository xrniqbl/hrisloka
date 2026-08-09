/**
 * subscriptionService.js
 * ═══════════════════════════════════════════════════════════════════
 * Precision subscription management with:
 *  - Exact day calculation (30/365 days — no drift)
 *  - Monthly & Yearly billing cycle support
 *  - 15% discount for yearly subscriptions
 *  - Days remaining counter updated daily
 *  - Expiry warnings at 7, 3, 1 day thresholds
 *  - Auto-expiry detection on each app load
 * ═══════════════════════════════════════════════════════════════════
 */
import { supabase } from '../lib/supabase';
import {
  CANONICAL_PLANS,
  YEARLY_DISCOUNT_PERCENT,
  getPlanPrice as computePlanPrice,
  formatPlanIDR,
} from '../lib/plans';

// Re-export shared plan constants (single source of truth: src/lib/plans.js)
export { YEARLY_DISCOUNT_PERCENT };
export const MOCK_PLANS = CANONICAL_PLANS;

// ─── Duration Constants (in MILLISECONDS — no drift) ──────────────────────────
export const DURATION_MS = {
  monthly: 30 * 24 * 60 * 60 * 1000,      // exactly 30 days
  yearly:  365 * 24 * 60 * 60 * 1000,     // exactly 365 days
  trial:   14 * 24 * 60 * 60 * 1000,      // exactly 14 days
};

// ─── Expiry Warning Thresholds ────────────────────────────────────────────────
export const WARNING_DAYS = [7, 3, 1];

// ─── Compute expires_at from start using exact milliseconds ───────────────────
export function computeExpiresAt(startDate, billingCycle, _planSlug) {
  const start = new Date(startDate);
  // Use UTC midnight to prevent timezone drift
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const durationMs = billingCycle === 'yearly' ? DURATION_MS.yearly : DURATION_MS.monthly;
  return new Date(startUTC + durationMs).toISOString();
}

// ─── Get price for a plan + billing cycle (with 15% yearly discount) ──────────
export function getPlanPrice(plan, billingCycle) {
  return computePlanPrice(plan, billingCycle);
}

// ─── Days remaining (precise, integer) ───────────────────────────────────────
export function getDaysRemaining(expiresAt) {
  if (!expiresAt) return Infinity; // no expiry
  const now = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  const exp = new Date(expiresAt);
  const expUTC = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());
  return Math.max(0, Math.ceil((expUTC - now) / (24 * 60 * 60 * 1000)));
}

// ─── Subscription status from record ─────────────────────────────────────────
export function getSubscriptionStatus(sub) {
  if (!sub) return 'none';
  if (sub.status === 'cancelled') return 'cancelled';
  const days = getDaysRemaining(sub.expires_at);
  if (days === 0) return 'expired';
  if (days <= 1) return 'critical';
  if (days <= 3) return 'warning_3';
  if (days <= 7) return 'warning_7';
  return 'active';
}

// ─── Warning label for UI ─────────────────────────────────────────────────────
export function getExpiryWarning(sub, locale = 'id') {
  const status = getSubscriptionStatus(sub);
  const days = getDaysRemaining(sub?.expires_at);
  const en = locale === 'en';

  switch (status) {
    case 'expired':
      return { level: 'error',   message: en ? 'Subscription expired — please renew' : 'Langganan telah berakhir — silakan perpanjang' };
    case 'critical':
      return { level: 'error',   message: en ? 'Expires today! Renew immediately' : 'Berakhir hari ini! Segera perpanjang' };
    case 'warning_3':
      return { level: 'warning', message: en ? `Expires in ${days} day(s) — renew soon` : `Berakhir dalam ${days} hari — segera perpanjang` };
    case 'warning_7':
      return { level: 'info',    message: en ? `${days} days remaining` : `${days} hari tersisa` };
    case 'none':
      return { level: 'error',   message: en ? 'No active subscription' : 'Tidak ada langganan aktif' };
    default:
      return null;
  }
}

// ─── Get available plans ─────────────────────────────────────────────────────
export async function getAvailablePlans() {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .neq('slug', 'free')   // exclude free plan
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return {
        data: data.map(p => ({
          ...p,
          features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []),
          duration_days_monthly: 30,
          duration_days_yearly: 365,
          // compute yearly price with 15% discount if not stored
          price_yearly: p.price_yearly || (p.price_monthly
            ? Math.round(p.price_monthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100))
            : null),
        })),
        error: null,
      };
    }
  } catch (e) { console.warn('[subscriptionService] plans table not available, using mock plans:', e?.message); }
  return { data: MOCK_PLANS, error: null };
}

// ─── Get current company subscription (with plan details) ────────────────────
export async function getMySubscription() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  // Try company-based subscriptions table first
  const { data: empData } = await supabase
    .from('employees')
    .select('company_id, companies(id, name)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (empData?.company_id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(name, slug, price_monthly, price_yearly, max_employees)')
      .eq('company_id', empData.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) return { data: enrichSubscription(data), error: null };
  }

  // Fallback: user-based (for onboarding/checkout flow)
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return { data: data ? enrichSubscription(data) : null, error };
}

// ─── Enrich subscription record with computed fields ─────────────────────────
function enrichSubscription(sub) {
  if (!sub) return null;
  const daysRemaining = getDaysRemaining(sub.expires_at);
  const status = getSubscriptionStatus(sub);

  // Determine billing cycle from duration stored or field
  let billingCycle = sub.billing_cycle || 'monthly';
  if (!sub.billing_cycle && sub.starts_at && sub.expires_at) {
    const startMs = new Date(sub.starts_at).getTime();
    const expMs   = new Date(sub.expires_at).getTime();
    const diff    = expMs - startMs;
    billingCycle  = diff >= DURATION_MS.yearly * 0.95 ? 'yearly' : 'monthly';
  }

  return {
    ...sub,
    days_remaining: daysRemaining,
    billing_cycle: billingCycle,
    computed_status: status,
    is_active: ['active', 'trial', 'warning_7', 'warning_3', 'critical'].includes(status),
    is_expiring_soon: ['critical', 'warning_3', 'warning_7'].includes(status),
    plan_label: sub.plan_name || sub.subscription_plans?.name || sub.plan_slug || 'Unknown',
    billing_label: billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan',
  };
}

// ─── Validate voucher code ────────────────────────────────────────────────────
export async function validateVoucher(code, planSlug) {
  if (!code || !code.trim()) return { data: null, error: new Error('Kode voucher kosong') };

  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return { data: null, error: new Error('Voucher tidak ditemukan atau tidak aktif') };
    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      return { data: null, error: new Error('Voucher sudah kadaluarsa') };
    }
    // Support both schemas: applicable_plans[] and single plan_slug
    if (Array.isArray(data.applicable_plans) && data.applicable_plans.length > 0) {
      if (!data.applicable_plans.includes(planSlug)) {
        return { data: null, error: new Error(`Voucher tidak berlaku untuk paket ${planSlug}`) };
      }
    } else if (data.plan_slug && data.plan_slug !== planSlug) {
      return { data: null, error: new Error(`Voucher tidak berlaku untuk paket ${planSlug}`) };
    }
    const used = data.used_count ?? data.current_uses ?? 0;
    if (data.max_uses !== null && data.max_uses !== undefined && used >= data.max_uses) {
      return { data: null, error: new Error('Voucher sudah mencapai batas penggunaan') };
    }
    return { data, error: null };
  } catch {
    return { data: null, error: new Error('Gagal memvalidasi voucher. Silakan coba lagi.') };
  }
}

// ─── Calculate final price after voucher ──────────────────────────────────────
export function calculatePrice(originalPrice, voucher) {
  if (!voucher || !originalPrice) return { finalPrice: originalPrice || 0, discount: 0 };
  let discount = 0;
  if (voucher.discount_type === 'percentage') {
    discount = Math.round(originalPrice * voucher.discount_value / 100);
  } else if (voucher.discount_type === 'fixed') {
    discount = Math.min(voucher.discount_value, originalPrice);
  }
  return { finalPrice: Math.max(0, originalPrice - discount), discount };
}

// ─── Activate subscription + upgrade role to super_admin ─────────────────────
// Used for free / 100% voucher only. Paid Midtrans flows activate via webhook.
// All writes happen server-side in the activate-free-subscription Edge Function
// (service_role). The client never writes to `subscriptions` directly.
export async function activateSubscription({
  planSlug, planName, voucherCode, billingCycle = 'monthly',
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  try {
    const { data, error } = await supabase.functions.invoke('activate-free-subscription', {
      body: {
        plan_slug: planSlug,
        plan_name: planName,
        billing_cycle: billingCycle,
        voucher_code: voucherCode || null,
      },
    });

    if (error) {
      // ContextFunctionsError carries the function's JSON body in .context
      let message = 'Gagal mengaktifkan langganan. Coba lagi.';
      try {
        const body = error?.context && typeof error.context.json === 'function'
          ? await error.context.json()
          : null;
        if (body?.error) message = body.error;
      } catch { /* keep default message */ }
      return { data: null, error: new Error(message) };
    }

    if (!data?.success) {
      return { data: null, error: new Error(data?.error || 'Gagal mengaktifkan langganan.') };
    }

    return {
      data: {
        success: true,
        company_id: data.company_id || null,
        needs_setup: Boolean(data.needs_setup),
      },
      error: null,
    };
  } catch (e) {
    console.error('[subscriptionService] activateSubscription failed:', e?.message);
    return { data: null, error: new Error('Gagal menghubungi server aktivasi. Coba lagi.') };
  }
}

// ─── Check and auto-expire subscriptions (run on app load) ───────────────────
export async function checkAndExpireSubscription() {
  const { data: sub } = await getMySubscription();
  if (!sub || sub.status === 'expired') return sub;

  const days = getDaysRemaining(sub.expires_at);
  if (days === 0 && sub.status !== 'expired') {
    // Persisting the 'expired' status is handled by the daily cron
    // (service_role). The client no longer writes to subscriptions.
    return { ...sub, status: 'expired', computed_status: 'expired', days_remaining: 0, is_active: false };
  }

  return sub;
}

// ─── Format currency IDR ──────────────────────────────────────────────────────
export function formatIDR(amount) {
  return formatPlanIDR(amount);
}
