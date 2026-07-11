// @ts-nocheck
// Supabase Edge Function: create-payment
// Deploy: supabase functions deploy create-payment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') || '';
const MIDTRANS_BASE_URL = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';
const YEARLY_DISCOUNT = 0.15;

const FALLBACK_PLANS: Record<string, { name: string; price_monthly: number | null }> = {
  starter: { name: 'Starter', price_monthly: 149000 },
  pro: { name: 'Pro', price_monthly: 299000 },
  enterprise: { name: 'Enterprise', price_monthly: null },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function expectedBasePrice(priceMonthly: number | null, billingCycle: string): number | null {
  if (priceMonthly === null || priceMonthly === undefined) return null;
  if (billingCycle === 'yearly') {
    return Math.round(priceMonthly * 12 * (1 - YEARLY_DISCOUNT));
  }
  return priceMonthly;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Free / 100% voucher must not go through Midtrans
    if (amountNum === 0) {
      return new Response(JSON.stringify({ error: 'Use free activation path for zero amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base = expectedBasePrice(Number(plan.price_monthly), billing_cycle === 'yearly' ? 'yearly' : 'monthly');
    if (base === null) {
      return new Response(JSON.stringify({ error: 'Cannot price this plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        return new Response(JSON.stringify({ error: 'Voucher tidak valid' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
        return new Response(JSON.stringify({ error: 'Voucher kadaluarsa' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const plans = voucher.applicable_plans || [];
      if (Array.isArray(plans) && plans.length > 0 && !plans.includes(plan_slug)) {
        return new Response(JSON.stringify({ error: 'Voucher tidak berlaku untuk paket ini' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // single plan_slug column (older schema)
      if (voucher.plan_slug && voucher.plan_slug !== plan_slug) {
        return new Response(JSON.stringify({ error: 'Voucher tidak berlaku untuk paket ini' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const used = voucher.used_count ?? voucher.current_uses ?? 0;
      if (voucher.max_uses !== null && used >= voucher.max_uses) {
        return new Response(JSON.stringify({ error: 'Voucher habis dipakai' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (voucher.discount_type === 'percentage') {
        serverDiscount = Math.round(base * Number(voucher.discount_value) / 100);
      } else {
        serverDiscount = Math.min(Number(voucher.discount_value), base);
      }
    }

    const expectedAmount = Math.max(0, base - serverDiscount);
    // Allow 1 IDR tolerance for rounding
    if (Math.abs(amountNum - expectedAmount) > 1) {
      console.error('[create-payment] amount mismatch', { amountNum, expectedAmount, base, serverDiscount });
      return new Response(JSON.stringify({
        error: 'Harga tidak valid. Muat ulang halaman dan coba lagi.',
        expected: expectedAmount,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!MIDTRANS_SERVER_KEY) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order_id = `HRIS-${Date.now()}-${user.id.slice(0, 8).toUpperCase()}`;
    const resolvedName = plan_name || plan.name || plan_slug;

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
          name: `HRIS Loka — Paket ${resolvedName}`,
          brand: 'HRIS Loka',
          category: 'SaaS Subscription',
        },
      ],
      callbacks: {
        finish: `${Deno.env.get('SITE_URL') || 'https://hrisloka.id'}/checkout?status=success&order_id=${encodeURIComponent(order_id)}`,
        error: `${Deno.env.get('SITE_URL') || 'https://hrisloka.id'}/checkout?status=error&order_id=${encodeURIComponent(order_id)}`,
        pending: `${Deno.env.get('SITE_URL') || 'https://hrisloka.id'}/checkout?status=pending&order_id=${encodeURIComponent(order_id)}`,
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
      return new Response(JSON.stringify({ error: 'Failed to create payment', detail: midtransData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ error: 'Failed to save order' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      snap_token: midtransData.token,
      order_id,
      amount: expectedAmount,
      redirect_url: midtransData.redirect_url,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
