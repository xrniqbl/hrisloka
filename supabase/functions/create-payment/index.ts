// @ts-nocheck
// Supabase Edge Function: create-payment
// Deploy: supabase functions deploy create-payment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Fail-fast: missing secrets crash at boot (loud deploy error), never run with empty fallbacks. */
function requireEnv(name) {
  const v = Deno.env.get(name);
  if (!v) throw new Error('[create-payment] CONFIG ERROR: ' + name + ' is not set');
  return v;
}
function requireSiteUrl() {
  const v = (Deno.env.get('SITE_URL') || '').trim().replace(/\/$/, '');
  if (!v || !/^https?://[^/]+$/.test(v)) {
    throw new Error('[create-payment] CONFIG ERROR: SITE_URL must be a valid http(s) origin');
  }
  return v;
}

const MIDTRANS_SERVER_KEY = requireEnv('MIDTRANS_SERVER_KEY');
const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const SITE_URL = requireSiteUrl();
const MIDTRANS_BASE_URL = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';
// KEEP IN SYNC with src/lib/plans.js (YEARLY_DISCOUNT_PERCENT) and
// supabase/migrations/sync_plan_prices_149k_299k.sql — checked at audit 2026-09.
const YEARLY_DISCOUNT = 0.15;

const FALLBACK_PLANS: Record<string, { name: string; price_monthly: number | null }> = {
  starter: { name: 'Starter', price_monthly: 149000 },
  pro: { name: 'Pro', price_monthly: 299000 },
  enterprise: { name: 'Enterprise', price_monthly: null },
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const base = ALLOWED_ORIGINS.includes(origin)
    ? { ...corsHeaders, 'Access-Control-Allow-Origin': origin }
    : corsHeaders;
  return { ...base, 'Vary': 'Origin' };
}

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

function expectedBasePrice(priceMonthly: number | null, billingCycle: string): number | null {
  if (priceMonthly === null || priceMonthly === undefined) return null;
  if (billingCycle === 'yearly') {
    return Math.round(priceMonthly * 12 * (1 - YEARLY_DISCOUNT));
  }
  return priceMonthly;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      plan_slug,
      plan_name,
      amount,
      voucher_code,
      discount_amount = 0,
      billing_cycle = 'monthly',
    } = body;

    if (!plan_slug || amount === undefined || amount === null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    const amountNum = Number(body?.amount ?? amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    // Free / 100% voucher must not go through Midtrans
    if (amountNum === 0) {
      return new Response(JSON.stringify({ error: 'Use free activation path for zero amount' }), {
        status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    // Resolve plan from DB (fallback to hardcoded prices)
    let plan = FALLBACK_PLANS[plan_slug] || null;
    try {
      const { data: dbPlan } = await supabase
        .from('subscription_plans')
        .select('slug, name, price_monthly, is_active')
        .eq('slug', plan_slug)
        .eq('is_active', true)
        .maybeSingle();
      if (dbPlan) plan = dbPlan;
    } catch { /* table may not exist */ }

    if (!plan || plan.price_monthly === null) {
      return new Response(JSON.stringify({ error: 'Invalid or custom plan — contact sales' }), {
        status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    const base = expectedBasePrice(Number(plan.price_monthly), billing_cycle === 'yearly' ? 'yearly' : 'monthly');
    if (base === null) {
      return new Response(JSON.stringify({ error: 'Cannot price this plan' }), {
        status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    // Optional voucher re-validation server-side
    let serverDiscount = Number(discount_amount) || 0;
    let voucherCode = voucher_code ? String(voucher_code).trim().toUpperCase() : null;

    if (voucherCode) {
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode)
        .eq('is_active', true)
        .maybeSingle();

      if (!voucher) {
        console.warn('[create-payment] voucher rejected: not found', { voucherCode });
        return new Response(JSON.stringify({ error: 'Voucher tidak dapat digunakan' }), {
          status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        });
      }
      if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
        console.warn('[create-payment] voucher rejected: expired', { voucherCode });
        return new Response(JSON.stringify({ error: 'Voucher tidak dapat digunakan' }), {
          status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        });
      }

      const plans = voucher.applicable_plans || [];
      if (Array.isArray(plans) && plans.length > 0 && !plans.includes(plan_slug)) {
        console.warn('[create-payment] voucher rejected: plan mismatch', { voucherCode, plan_slug });
        return new Response(JSON.stringify({ error: 'Voucher tidak dapat digunakan' }), {
          status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        });
      }
      // single plan_slug column (older schema)
      if (voucher.plan_slug && voucher.plan_slug !== plan_slug) {
        console.warn('[create-payment] voucher rejected: plan mismatch (legacy column)', { voucherCode, plan_slug });
        return new Response(JSON.stringify({ error: 'Voucher tidak dapat digunakan' }), {
          status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        });
      }

      const used = voucher.used_count ?? voucher.current_uses ?? 0;
      if (voucher.max_uses !== null && used >= voucher.max_uses) {
        console.warn('[create-payment] voucher rejected: exhausted', { voucherCode, used });
        return new Response(JSON.stringify({ error: 'Voucher tidak dapat digunakan' }), {
          status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        });
      }

      if (voucher.discount_type === 'percentage' || voucher.discount_type === 'percent') {
        serverDiscount = Math.round(base * Number(voucher.discount_value) / 100);
      } else if (voucher.discount_type === 'fixed') {
        serverDiscount = Math.min(Number(voucher.discount_value), base);
      } else {
        console.warn('[create-payment] voucher rejected: unknown discount_type', { voucherCode, discount_type: voucher.discount_type });
        return new Response(JSON.stringify({ error: 'Voucher tidak dapat digunakan' }), {
          status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
        });
      }
    }

    const expectedAmount = Math.max(0, base - serverDiscount);
    // Allow 1 IDR tolerance for rounding
    if (!Number.isFinite(amountNum) || !Number.isFinite(Number(expectedAmount)) || Math.abs(Number(amountNum) - Number(expectedAmount)) > 1) {
      console.error('[create-payment] amount mismatch', { amountNum, expectedAmount, base, serverDiscount });
      return new Response(JSON.stringify({
        error: 'Harga tidak valid. Muat ulang halaman dan coba lagi.',
      }), {
        status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }


    // order_id acak (crypto UUID) — prediktabilitas + fragmen user id dihilangkan.
    // Idempotency: bila client double-click dalam 10 menit untuk plan+amount sama,
    // kembalikan order pending yang sudah ada alih-alih membuat order baru.
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: recent } = await supabase
      .from('payment_orders')
      .select('order_id, snap_token, amount')
      .eq('user_id', user.id)
      .eq('plan_slug', plan_slug)
      .eq('amount', expectedAmount)
      .eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.order_id && recent?.snap_token) {
      return new Response(JSON.stringify({
        snap_token: recent.snap_token,
        order_id: recent.order_id,
        amount: expectedAmount,
        deduped: true,
        midtrans_mode: Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true' ? 'production' : 'sandbox',
      }), { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } });
    }

    const order_id = `KK-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    // plan_name is server-resolved (DB/fallback) — never trust client input (XSS/spoofing).
    const resolvedName = plan.name || plan_slug;

    const { data: profile } = await supabase
      .from('onboarding_profiles')
      .select('full_name, phone, company_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const midtransPayload = {
      transaction_details: {
        order_id,
        gross_amount: expectedAmount,
      },
      customer_details: {
        first_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        phone: profile?.phone || '',
      },
      item_details: [
        {
          id: plan_slug,
          price: expectedAmount,
          quantity: 1,
          name: `KiniKerja — Paket ${resolvedName}`,
          brand: 'KiniKerja',
          category: 'SaaS Subscription',
        },
      ],
      callbacks: {
        finish: `${SITE_URL}/checkout?status=success&order_id=${encodeURIComponent(order_id)}`,
        error: `${SITE_URL}/checkout?status=error&order_id=${encodeURIComponent(order_id)}`,
        pending: `${SITE_URL}/checkout?status=pending&order_id=${encodeURIComponent(order_id)}`,
      },
    };

    const encoded = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const midtransRes = await fetch(`${MIDTRANS_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
      },
      body: JSON.stringify(midtransPayload),
    });

    const midtransData = await midtransRes.json();
    if (!midtransData.token) {
      console.error('[create-payment] midtrans error:', JSON.stringify(midtransData).slice(0, 500));
      return new Response(JSON.stringify({ error: 'Failed to create payment. Coba lagi.' }), {
        status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    const { error: insertErr } = await supabase.from('payment_orders').insert({
      order_id,
      user_id: user.id,
      plan_slug,
      plan_name: resolvedName,
      amount: expectedAmount,
      discount_amount: serverDiscount,
      voucher_code: voucherCode,
      snap_token: midtransData.token,
      billing_cycle: billing_cycle === 'yearly' ? 'yearly' : 'monthly',
      status: 'pending',
    });

    if (insertErr) {
      console.error('[create-payment] insert order error:', insertErr.message);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      snap_token: midtransData.token,
      order_id,
      amount: expectedAmount,
      redirect_url: midtransData.redirect_url,
      // Memberitahu frontend mode server agar bisa menolak mismatch sandbox/prod
      midtrans_mode: Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true' ? 'production' : 'sandbox',
    }), { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[create-payment] Error:', message);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
    });
  }
});
