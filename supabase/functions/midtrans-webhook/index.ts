// @ts-nocheck
// Supabase Edge Function: midtrans-webhook
// Deploy: supabase functions deploy midtrans-webhook
// Midtrans Dashboard → Settings → Payment → Notification URL:
//   https://gfimdkypxiflnmklfsnk.supabase.co/functions/v1/midtrans-webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') || '';

async function sha512(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Compute expires_at: 30 days (monthly) or 365 days (yearly) from UTC midnight today */
function computeExpiry(billingCycle: string): string {
  const now = new Date();
  const startUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const durationMs = billingCycle === 'yearly'
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  return new Date(startUTC + durationMs).toISOString();
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const notification = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = notification;

    // Verify Midtrans signature
    const expectedSignature = await sha512(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
    if (signature_key !== expectedSignature) {
      console.error('[Webhook] Invalid signature for order:', order_id);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Determine final payment status
    let finalStatus = 'pending';
    let activate = false;

    if (transaction_status === 'capture') {
      finalStatus = fraud_status === 'accept' ? 'paid' : 'pending';
      activate = finalStatus === 'paid';
    } else if (transaction_status === 'settlement') {
      finalStatus = 'paid';
      activate = true;
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      finalStatus = transaction_status === 'expire' ? 'expired' : 'failed';
    }

    // Update payment order status
    const { data: order, error: orderErr } = await supabase
      .from('payment_orders')
      .update({ status: finalStatus, midtrans_status: transaction_status, updated_at: new Date().toISOString() })
      .eq('order_id', order_id)
      .select('user_id, plan_slug, plan_name, amount, billing_cycle')
      .maybeSingle();

    if (orderErr || !order) {
      console.error('[Webhook] Order not found:', order_id);
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    // If paid → activate subscription with correct billing cycle expiry
    if (activate && order.user_id) {
      const billingCycle = order.billing_cycle || 'monthly';
      const startsAt = new Date().toISOString();
      const expiresAt = computeExpiry(billingCycle);

      await supabase.from('subscriptions').upsert({
        user_id:        order.user_id,
        plan_slug:      order.plan_slug,
        plan_name:      order.plan_name,
        status:         'active',
        billing_cycle:  billingCycle,
        price_paid:     order.amount,
        payment_method: 'midtrans',
        starts_at:      startsAt,
        expires_at:     expiresAt,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'user_id' });

      console.log(`[Webhook] Subscription activated: user=${order.user_id} cycle=${billingCycle} expires=${expiresAt}`);
    }

    return new Response(JSON.stringify({ ok: true, status: finalStatus }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Webhook] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
