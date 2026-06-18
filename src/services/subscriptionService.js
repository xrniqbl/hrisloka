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

// ─── 15% yearly discount constant ─────────────────────────────────────────────
export const YEARLY_DISCOUNT_PERCENT = 15;

// ─── Plan Definitions (NO Free plan) ──────────────────────────────────────────
export const MOCK_PLANS = [
  {
    id: 'starter', slug: 'starter', name: 'Starter', is_active: true, sort_order: 1,
    price_monthly: 75000, price_yearly: Math.round(75000 * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100)), max_employees: 50,
    description: 'Untuk bisnis yang mulai berkembang dengan kebutuhan HR lengkap.',
    features: ['Hingga 50 karyawan', 'Absensi & Cuti digital', 'Payroll dasar', 'PWA Karyawan', 'Email support'],
    badge: null, color: '#3B82F6',
    duration_days_monthly: 30,
    duration_days_yearly: 365,
  },
  {
    id: 'pro', slug: 'pro', name: 'Pro', is_active: true, sort_order: 2,
    price_monthly: 125000, price_yearly: Math.round(125000 * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100)), max_employees: 200,
    description: 'Solusi lengkap untuk perusahaan dengan kebutuhan HR profesional.',
    features: ['Hingga 200 karyawan', 'Semua fitur Starter', 'GPS Geofence Attendance', 'KPI & Penilaian Kinerja', 'Rekrutmen & Onboarding', 'AI Expense OCR', 'Laporan lanjutan', 'Priority support'],
    badge: 'Paling Populer', color: '#7C3AED',
    duration_days_monthly: 30,
    duration_days_yearly: 365,
  },
  {
    id: 'enterprise', slug: 'enterprise', name: 'Enterprise', is_active: true, sort_order: 3,
    price_monthly: null, price_yearly: null, max_employees: 9999,
    description: 'Solusi skala enterprise dengan kustomisasi penuh dan dedicated support.',
    features: ['Karyawan tidak terbatas', 'Semua fitur Pro', 'Custom integrasi API', 'Dedicated account manager', 'SLA 99.9% uptime', 'Pelatihan khusus tim'],
    badge: 'Hubungi Sales', color: '#D97706',
    duration_days_monthly: 30,
    duration_days_yearly: 365,
  },
];

// ─── Duration Constants (in MILLISECONDS — no drift) ──────────────────────────
export const DURATION_MS = {
  monthly: 30 * 24 * 60 * 60 * 1000,      // exactly 30 days
  yearly:  365 * 24 * 60 * 60 * 1000,     // exactly 365 days
  trial:   14 * 24 * 60 * 60 * 1000,      // exactly 14 days
};

// ─── Expiry Warning Thresholds ────────────────────────────────────────────────
export const WARNING_DAYS = [7, 3, 1];

// ─── Compute expires_at from start using exact milliseconds ───────────────────
export function computeExpiresAt(startDate, billingCycle, planSlug) {
  const start = new Date(startDate);
  // Use UTC midnight to prevent timezone drift
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const durationMs = billingCycle === 'yearly' ? DURATION_MS.yearly : DURATION_MS.monthly;
  return new Date(startUTC + durationMs).toISOString();
}

// ─── Get price for a plan + billing cycle (with 15% yearly discount) ──────────
export function getPlanPrice(plan, billingCycle) {
  if (!plan || plan.price_monthly === null) return null;
  if (billingCycle === 'yearly') {
    // Yearly: x12 months minus 15% discount
    return Math.round(plan.price_monthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
  }
  return plan.price_monthly;
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
  } catch { /* fall through */ }
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
    if (data.applicable_plans && data.applicable_plans.length > 0) {
      if (!data.applicable_plans.includes(planSlug)) {
        return { data: null, error: new Error(`Voucher tidak berlaku untuk paket ${planSlug}`) };
      }
    }
    if (data.max_uses !== null && data.current_uses >= data.max_uses) {
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

// ─── Create / upsert subscription (PRECISE day calculation) ───────────────────
export async function createSubscription({
  planSlug, planName, priceMonthly, pricePaid, discountAmount,
  voucherCode, paymentMethod, status = 'pending',
  billingCycle = 'monthly', companyId = null,
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  // Precise start/end using UTC midnight (no timezone drift)
  const startDate = new Date();
  const startUTC = new Date(Date.UTC(
    startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()
  ));
  const expiresAt = computeExpiresAt(startUTC, billingCycle, planSlug);

  const payload = {
    user_id: user.id,
    plan_slug: planSlug,
    plan_name: planName,
    status,
    billing_cycle: billingCycle,
    price_monthly: priceMonthly || 0,
    price_paid: pricePaid || 0,
    discount_amount: discountAmount || 0,
    voucher_code: voucherCode || null,
    payment_method: paymentMethod || 'midtrans',
    starts_at: startUTC.toISOString(),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  if (companyId) payload.company_id = companyId;

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  return { data, error };
}

// ─── Activate subscription + upgrade role to super_admin ─────────────────────
export async function activateSubscription({
  planSlug, planName, priceMonthly, pricePaid, discountAmount,
  voucherCode, paymentMethod, billingCycle = 'monthly',
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { error: subError } = await createSubscription({
    planSlug, planName, priceMonthly, pricePaid, discountAmount, voucherCode,
    paymentMethod: paymentMethod || (pricePaid === 0 ? 'free' : 'pending'),
    status: 'active',
    billingCycle,
  });

  if (subError) {
    console.warn('[subscriptionService] subscription table not ready:', subError.message);
  }

  if (voucherCode) {
    try {
      await supabase.rpc('increment_voucher_usage', { voucher_code: voucherCode });
    } catch { /* ignore */ }
  }

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const { error: empError } = await supabase
    .from('employees')
    .upsert({
      email: user.email,
      name: fullName,
      role: 'super_admin',
      auth_user_id: user.id,
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
    }, { onConflict: 'email' });

  return { data: { success: true }, error: empError };
}

// ─── Check and auto-expire subscriptions (run on app load) ───────────────────
export async function checkAndExpireSubscription() {
  const { data: sub } = await getMySubscription();
  if (!sub || sub.status === 'expired') return sub;

  const days = getDaysRemaining(sub.expires_at);
  if (days === 0 && sub.status !== 'expired') {
    // Mark as expired in DB
    await supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', sub.user_id);
    return { ...sub, status: 'expired', computed_status: 'expired', days_remaining: 0, is_active: false };
  }

  return sub;
}

// ─── Renew subscription (extend from current expires_at) ─────────────────────
export async function renewSubscription(planSlug, billingCycle = 'monthly') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data: current } = await getMySubscription();

  // Renew from EXACT current expiry (not from today) to prevent shortchanging
  const renewFrom = current?.expires_at && getDaysRemaining(current.expires_at) > 0
    ? new Date(current.expires_at)
    : new Date();

  const renewFromUTC = new Date(Date.UTC(
    renewFrom.getUTCFullYear(), renewFrom.getUTCMonth(), renewFrom.getUTCDate()
  ));
  const newExpiry = computeExpiresAt(renewFromUTC, billingCycle, planSlug);

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan_slug: planSlug,
      billing_cycle: billingCycle,
      status: 'active',
      starts_at: renewFromUTC.toISOString(),
      expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  return { data: data ? enrichSubscription(data) : null, error };
}

// ─── Format currency IDR ──────────────────────────────────────────────────────
export function formatIDR(amount) {
  if (amount === null || amount === undefined) return 'Custom';
  if (amount === 0) return 'Gratis';
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
