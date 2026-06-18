// @ts-nocheck
// Supabase Edge Function: create-payment
// Deploy: supabase functions deploy create-payment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') || '';
const MIDTRANS_BASE_URL   = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth guard
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { plan_slug, plan_name, amount, voucher_code, discount_amount, billing_cycle } = await req.json();

    if (!plan_slug || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    // Generate unique order_id
    const order_id = `HRIS-${Date.now()}-${user.id.slice(0, 8).toUpperCase()}`;

    // Get user profile from onboarding
    const { data: profile } = await supabase
      .from('onboarding_profiles')
      .select('full_name, phone, company_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // Create Midtrans transaction
    const midtransPayload = {
      transaction_details: {
        order_id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        phone: profile?.phone || '',
      },
      item_details: [
        {
          id: plan_slug,
          price: amount,
          quantity: 1,
          name: `HRIS Loka — Paket ${plan_name}`,
          brand: 'HRIS Loka',
          category: 'SaaS Subscription',
        },
      ],
      callbacks: {
        finish: `${Deno.env.get('SITE_URL')}/checkout?status=success`,
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
      return new Response(JSON.stringify({ error: 'Failed to create payment', detail: midtransData }), { status: 500, headers: corsHeaders });
    }

    // Save order to DB
    await supabase.from('payment_orders').insert({
      order_id,
      user_id: user.id,
      plan_slug,
      plan_name,
      amount,
      discount_amount: discount_amount || 0,
      voucher_code: voucher_code || null,
      snap_token: midtransData.token,
      billing_cycle: billing_cycle || 'monthly',
      status: 'pending',
    });

    return new Response(JSON.stringify({
      snap_token: midtransData.token,
      order_id,
      redirect_url: midtransData.redirect_url,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
