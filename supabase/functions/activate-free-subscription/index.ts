// @ts-nocheck
// Supabase Edge Function: activate-free-subscription
// Deploy: supabase functions deploy activate-free-subscription
//
// Server-side activation for FREE plan or 100%-voucher checkouts.
// Replaces the old client-side direct write to `subscriptions`.
// Paid Midtrans flows still activate via midtrans-webhook.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YEARLY_DISCOUNT = 0.15;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

/** Ensure paying user has an active super_admin employee row (+ company shell). */
async function ensureAdminEmployee(
  supabase,
  userId: string,
  email: string | undefined,
  profile: Record<string, unknown> | null,
): Promise<string | null> {
  if (!email) return null;

  const fullName = (profile?.full_name as string) || email.split('@')[0] || 'User';
  const companyName = (profile?.company_name as string) || null;

  const { data: existing } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .or(`auth_user_id.eq.${userId},email.eq.${email}`)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('employees')
      .update({
        role: 'super_admin',
        status: 'active',
        auth_user_id: userId,
        name: fullName,
      })
      .eq('id', existing.id);
    return existing.company_id || null;
  }

  let companyId = null;
  if (companyName) {
    try {
      const code = `HRIS-${Date.now().toString(36).toUpperCase()}`;
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
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      plan_slug,
      plan_name,
      billing_cycle = 'monthly',
      voucher_code,
    } = body;

    if (!plan_slug) return json({ error: 'Missing plan_slug' }, 400);

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
    if (!plan) return json({ error: 'Paket tidak ditemukan atau tidak aktif' }, 400);
    if (plan_slug === 'enterprise') {
      return json({ error: 'Paket Enterprise memerlukan kontak sales' }, 400);
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

      if (!voucher) return json({ error: 'Voucher tidak valid' }, 400);
      if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
        return json({ error: 'Voucher kadaluarsa' }, 400);
      }
      const plans = voucher.applicable_plans || [];
      if (Array.isArray(plans) && plans.length > 0 && !plans.includes(plan_slug)) {
        return json({ error: 'Voucher tidak berlaku untuk paket ini' }, 400);
      }
      if (voucher.plan_slug && voucher.plan_slug !== plan_slug) {
        return json({ error: 'Voucher tidak berlaku untuk paket ini' }, 400);
      }
      const used = voucher.used_count ?? voucher.current_uses ?? 0;
      if (voucher.max_uses !== null && voucher.max_uses !== undefined && used >= voucher.max_uses) {
        return json({ error: 'Voucher habis dipakai' }, 400);
      }

      if (voucher.discount_type === 'percentage' || voucher.discount_type === 'percent') {
        discount = Math.round(base * Number(voucher.discount_value) / 100);
      } else {
        discount = Math.min(Number(voucher.discount_value), base);
      }
    }

    const finalAmount = Math.max(0, base - discount);

    // Only zero-amount activations belong here — anything else must pay via Midtrans.
    if (base > 0 && finalAmount > 0) {
      return json({ error: 'Paket ini memerlukan pembayaran — gunakan checkout Midtrans' }, 400);
    }
    if (voucherCode && discount < base) {
      return json({ error: 'Voucher tidak mencakup 100% harga paket' }, 400);
    }

    // ── Onboarding profile (name / company) ─────────────────────────────
    const { data: profile } = await supabase
      .from('onboarding_profiles')
      .select('full_name, company_name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

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
      plan_name: plan_name || plan.name || plan_slug,
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
      return json({ error: 'Gagal mengaktifkan langganan. Coba lagi.' }, 500);
    }

    // ── Voucher usage bookkeeping ───────────────────────────────────────
    if (voucherCode) {
      try {
        const { data: v } = await supabase
          .from('vouchers')
          .select('id, used_count, current_uses')
          .eq('code', voucherCode)
          .maybeSingle();
        if (v?.id) {
          const next = (v.used_count ?? v.current_uses ?? 0) + 1;
          const patch = v.used_count !== undefined && v.used_count !== null
            ? { used_count: next }
            : { current_uses: next };
          await supabase.from('vouchers').update(patch).eq('id', v.id);
          await supabase.from('voucher_usage').insert({
            voucher_id: v.id,
            company_id: companyId,
          });
        }
      } catch (e) {
        console.warn('[activate-free] voucher usage update failed:', e?.message || e);
      }
    }

    console.log(
      `[activate-free] Activated: user=${user.id} plan=${plan_slug} cycle=${cycle} voucher=${voucherCode || '-'} expires=${expiresAt}`,
    );

    return json({
      success: true,
      company_id: companyId,
      needs_setup: !companyId,
      expires_at: expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[activate-free] Error:', message);
    return json({ error: message }, 500);
  }
});
