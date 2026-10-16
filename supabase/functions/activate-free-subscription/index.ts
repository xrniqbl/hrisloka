// @ts-nocheck
// Supabase Edge Function: activate-free-subscription
// Deploy: supabase functions deploy activate-free-subscription
//
// Server-side activation for FREE plan or 100%-voucher checkouts.
// Replaces the old client-side direct write to `subscriptions`.
// Paid Midtrans flows still activate via midtrans-webhook.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Fail-fast: missing secrets crash at boot (loud deploy error). */
function requireEnv(name) {
  const v = Deno.env.get(name);
  if (!v) throw new Error('[activate-free] CONFIG ERROR: ' + name + ' is not set');
  return v;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

// KEEP IN SYNC with src/lib/plans.js (YEARLY_DISCOUNT_PERCENT) and
// supabase/migrations/sync_plan_prices_149k_299k.sql — checked at audit 2026-09.
const YEARLY_DISCOUNT = 0.15;

/** Fail-fast: missing secrets crash at boot (loud deploy error), never run with empty fallbacks. */
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error('[activate-free] CONFIG ERROR: ' + name + ' is not set');
  return v;
}
requireEnv('SUPABASE_URL');
requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Origin allowlist — mirrors api/_shared/cors.js. Extra origins can be added
// via the ALLOWED_ORIGINS / SITE_URL secrets. Never reflect unknown origins.
// Localhost entries only apply when ALLOW_LOCALHOST=true (local dev).
const PROD_ORIGINS = [
  'https://kinikerja.id',
  'https://www.kinikerja.id',
  'https://kinikerja.com',
  'https://www.kinikerja.com',
];
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
const ALLOWED_ORIGINS = [
  ...PROD_ORIGINS,
  ...(Deno.env.get('ALLOW_LOCALHOST') === 'true' ? DEV_ORIGINS : []),
  ...(Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
  ...(Deno.env.get('SITE_URL') ? [Deno.env.get('SITE_URL')!.trim().replace(/\/$/, '')] : []),
];

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const base = ALLOWED_ORIGINS.includes(origin)
    ? { ...corsHeaders, 'Access-Control-Allow-Origin': origin }
    : corsHeaders;
  return { ...base, 'Vary': 'Origin' };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

function expectedBasePrice(priceMonthly: number, billingCycle: string): number {
  if (billingCycle === 'yearly') {
    return Math.round(priceMonthly * 12 * (1 - YEARLY_DISCOUNT));
  }
  return priceMonthly;
}

/** Compute expires_at: 30 days (monthly) or 365 days (yearly) after baseMs (UTC midnight) */
function computeExpiry(baseMs: number, billingCycle: string): string {
  const durationMs = billingCycle === 'yearly'
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  return new Date(baseMs + durationMs).toISOString();
}

/** UTC-midnight ms of today */
function todayUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Early renewal support: if the user still has an active subscription,
 * extend from its current expires_at instead of resetting to today.
 */
function resolveRenewalBase(currentSub: Record<string, unknown> | null | undefined): number {
  if (
    currentSub
    && ['active', 'trial'].includes(String(currentSub.status))
    && currentSub.expires_at
  ) {
    const exp = new Date(String(currentSub.expires_at));
    const expMs = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());
    if (expMs > todayUtcMs()) return expMs;
  }
  return todayUtcMs();
}

/** Ensure paying user has an active super_admin employee row (+ company shell).
 * Anti-hijack rules:
 * - Only touch rows owned by this auth user (auth_user_id match), or
 *   unclaimed rows (auth_user_id IS NULL) with the same email (e.g. HR import).
 * - Never reassign auth_user_id on a row owned by someone else.
 * - Never promote the role of an already-claimed row (no self-promotion
 *   from employee → super_admin via payment).
 */
async function ensureAdminEmployee(
  supabase,
  userId: string,
  email: string | undefined,
  profile: Record<string, unknown> | null,
): Promise<string | null> {
  if (!email) return null;

  const fullName = (profile?.full_name as string) || email.split('@')[0] || 'User';
  const companyName = (profile?.company_name as string) || null;

  // 1) Row already owned by this auth user — just ensure active, keep role.
  const { data: owned } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (owned?.id) {
    await supabase
      .from('employees')
      .update({ status: 'active', name: fullName })
      .eq('id', owned.id);
    return owned.company_id || null;
  }

  // 2) Unclaimed row with same email (no auth owner yet) — safe to claim.
  const { data: unclaimed } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('email', email)
    .is('auth_user_id', null)
    .maybeSingle();

  if (unclaimed?.id) {
    await supabase
      .from('employees')
      .update({
        role: 'super_admin',
        status: 'active',
        auth_user_id: userId,
        name: fullName,
      })
      .eq('id', unclaimed.id);
    return unclaimed.company_id || null;
  }

  let companyId = null;
  if (companyName) {
    try {
      const code = `KK-${Date.now().toString(36).toUpperCase()}`;
      const { data: company } = await supabase
        .from('companies')
        .insert({ name: companyName, company_code: code, is_active: true })
        .select('id')
        .maybeSingle();
      companyId = company?.id || null;
    } catch (e) {
      console.warn('[activate-free] company create skipped:', e?.message || e);
    }
  }

  try {
    await supabase.from('employees').insert({
      email,
      name: fullName,
      role: 'super_admin',
      auth_user_id: userId,
      status: 'active',
      company_id: companyId,
      join_date: new Date().toISOString().split('T')[0],
    });
  } catch (e) {
    console.error('[activate-free] employee insert failed:', e?.message || e);
  }

  return companyId;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }
  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(req, { error: 'Unauthorized' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return json(req, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      plan_slug,
      plan_name,
      billing_cycle = 'monthly',
      voucher_code,
    } = body;

    if (!plan_slug) return json(req, { error: 'Missing plan_slug' }, 400);

    // ── Resolve plan price ──────────────────────────────────────────────
    let plan: Record<string, unknown> | null = null;
    const { data: dbPlan } = await supabase
      .from('subscription_plans')
      .select('slug, name, price_monthly, is_active')
      .eq('slug', plan_slug)
      .eq('is_active', true)
      .maybeSingle();
    if (dbPlan) plan = dbPlan;

    // Free plan fallback (price 0). Enterprise (custom pricing) must go via sales.
    if (!plan && plan_slug === 'free') {
      plan = { slug: 'free', name: 'Free', price_monthly: 0 };
    }
    if (!plan) return json(req, { error: 'Paket tidak ditemukan atau tidak aktif' }, 400);
    if (plan_slug === 'enterprise') {
      return json(req, { error: 'Paket Enterprise memerlukan kontak sales' }, 400);
    }

    const cycle = billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const base = expectedBasePrice(Number(plan.price_monthly) || 0, cycle);

    // ── Voucher validation (must reduce price to exactly 0) ────────────
    let discount = 0;
    let voucherCode: string | null = null;
    if (voucher_code) {
      voucherCode = String(voucher_code).trim().toUpperCase();
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode)
        .eq('is_active', true)
        .maybeSingle();

      if (!voucher) return json(req, { error: 'Voucher tidak valid' }, 400);
      if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
        return json(req, { error: 'Voucher kadaluarsa' }, 400);
      }
      const plans = voucher.applicable_plans || [];
      if (Array.isArray(plans) && plans.length > 0 && !plans.includes(plan_slug)) {
        return json(req, { error: 'Voucher tidak berlaku untuk paket ini' }, 400);
      }
      if (voucher.plan_slug && voucher.plan_slug !== plan_slug) {
        return json(req, { error: 'Voucher tidak berlaku untuk paket ini' }, 400);
      }
      const used = voucher.used_count ?? voucher.current_uses ?? 0;
      if (voucher.max_uses !== null && voucher.max_uses !== undefined && used >= voucher.max_uses) {
        return json(req, { error: 'Voucher habis dipakai' }, 400);
      }

      // Schema declares discount_type VARCHAR 'percent'|'fixed'; 'percentage'
      // is accepted defensively because legacy rows were written with it.
      if (voucher.discount_type === 'percentage' || voucher.discount_type === 'percent') {
        discount = Math.round(base * Number(voucher.discount_value) / 100);
      } else {
        discount = Math.min(Number(voucher.discount_value), base);
      }
    }

    const finalAmount = Math.max(0, base - discount);

    // Only zero-amount activations belong here — anything else must pay via Midtrans.
    if (base > 0 && finalAmount > 0) {
      return json(req, { error: 'Paket ini memerlukan pembayaran — gunakan checkout Midtrans' }, 400);
    }
    if (voucherCode && discount < base) {
      return json(req, { error: 'Voucher tidak mencakup 100% harga paket' }, 400);
    }

    // ── Onboarding profile (name / company) ─────────────────────────────
    const { data: profile } = await supabase
      .from('onboarding_profiles')
      .select('full_name, company_name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    // ── Claim voucher FIRST (atomic) — before creating the subscription ────
    // Otherwise a failed/exhausted claim leaves an active free subscription.
    let voucherId: string | null = null;
    if (voucherCode) {
      const { data: claimed, error: claimErr } = await supabase.rpc('claim_voucher', {
        p_code: voucherCode,
      });
      if (claimErr || claimed !== true) {
        console.warn('[activate-free] voucher claim rejected:', claimErr?.message || 'exhausted');
        return json(req, { error: 'Voucher habis dipakai atau tidak valid.' }, 400);
      }
      const { data: v } = await supabase
        .from('vouchers')
        .select('id')
        .eq('code', voucherCode)
        .maybeSingle();
      voucherId = v?.id || null;
    }

    const companyId = await ensureAdminEmployee(supabase, user.id, user.email, profile);

    // ── Upsert subscription (source of truth, server-side) ──────────────
    // Early renewal: extend from current expiry when still active
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const baseMs = resolveRenewalBase(currentSub);
    const startsAt = new Date(baseMs).toISOString();
    const expiresAt = computeExpiry(baseMs, cycle);

    const subPayload: Record<string, unknown> = {
      user_id: user.id,
      plan_slug,
      plan_name: plan.name || plan_slug,
      status: 'active',
      billing_cycle: cycle,
      price_monthly: Number(plan.price_monthly) || 0,
      price_paid: 0,
      discount_amount: discount,
      voucher_code: voucherCode,
      payment_method: voucherCode ? 'voucher' : 'free',
      starts_at: startsAt,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (companyId) subPayload.company_id = companyId;

    const { error: subErr } = await supabase
      .from('subscriptions')
      .upsert(subPayload, { onConflict: 'user_id' });

    if (subErr) {
      console.error('[activate-free] subscription upsert error:', subErr.message);
      return json(req, { error: 'Gagal mengaktifkan langganan. Coba lagi.' }, 500);
    }

    // ── Voucher usage bookkeeping (already claimed atomically above) ──────
    if (voucherCode && voucherId) {
      try {
        await supabase.from('voucher_usage').insert({
          voucher_id: voucherId,
          company_id: companyId,
        });
      } catch (e) {
        console.warn('[activate-free] voucher usage update failed:', e?.message || e);
      }
    }

    console.log(
      `[activate-free] Activated: user=${user.id} plan=${plan_slug} cycle=${cycle} voucher=${voucherCode || '-'} expires=${expiresAt}`,
    );

    return json(req, {
      success: true,
      company_id: companyId,
      needs_setup: !companyId,
      expires_at: expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[activate-free] Error:', message);
    // Pesan generik ke client — detail sudah tercatat di log server-side.
    return json(req, { error: 'Internal error' }, 500);
  }
});
