// @ts-nocheck
// Supabase Edge Function: midtrans-webhook
// Deploy: supabase functions deploy midtrans-webhook
// Midtrans Dashboard → Settings → Configuration → Payment Notification URL:
//   https://<project-ref>.supabase.co/functions/v1/midtrans-webhook
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

/** Send subscription activation email via Resend */
async function sendActivationEmail(to: string, planName: string, expiresAt: string): Promise<void> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@hrisloka.id';
  const SITE_URL = Deno.env.get('SITE_URL') || 'https://hrisloka.id';

  if (!RESEND_API_KEY) {
    console.warn('[Webhook] RESEND_API_KEY not set, skipping email');
    return;
  }

  const expiryDate = new Date(expiresAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `
    <div style="font-family:'Inter Tight',Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#635BFF,#4F46E5);padding:24px;border-radius:16px 16px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">HRIS Loka</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Langganan Berhasil Diaktifkan</p>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
        <h2 style="margin:0 0 16px;color:#16A34A">Langganan Anda Sudah Aktif!</h2>
        <p>Halo,</p>
        <p>Pembayaran Anda telah berhasil diverifikasi. Langganan <strong>${planName}</strong> Anda sudah aktif.</p>
        <div style="background:#F0FDF4;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #16A34A">
          <div style="font-size:14px;font-weight:600;color:#16A34A;margin-bottom:8px">Detail Langganan:</div>
          <div style="font-size:13px;color:#374151;line-height:1.6">
            <div><strong>Paket:</strong> ${planName}</div>
            <div><strong>Status:</strong> Aktif</div>
            <div><strong>Berlaku hingga:</strong> ${expiryDate}</div>
          </div>
        </div>
        <p>Silakan login ke dashboard HRIS Loka untuk mulai menggunakan semua fitur.</p>
        <a href="${SITE_URL}/login" style="display:inline-block;background:#635BFF;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;margin-top:16px">Masuk ke Dashboard</a>
        <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email otomatis dari HRIS Loka.</p>
      </div>
    </div>
  `;

  const text = `Langganan ${planName} Anda sudah aktif! Berlaku hingga ${expiryDate}. Login: ${SITE_URL}/login`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `[HRIS Loka] Langganan ${planName} Berhasil Diaktifkan`,
        html,
        text,
      }),
    });

    if (res.ok) {
      console.log(`[Webhook] Activation email sent to ${to}`);
    } else {
      console.error(`[Webhook] Failed to send email: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[Webhook] Email error: ${err?.message || err}`);
  }
}

/** Increment voucher usage (supports used_count column) */
async function incrementVoucher(supabase, code: string) {
  if (!code) return;
  try {
    const { data } = await supabase
      .from('vouchers')
      .select('id, used_count, current_uses, max_uses')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();
    if (!data) return;

    const used = (data.used_count ?? data.current_uses ?? 0) + 1;
    const patch = data.used_count !== undefined && data.used_count !== null
      ? { used_count: used }
      : { current_uses: used };

    await supabase.from('vouchers').update(patch).eq('id', data.id);
    console.log(`[Webhook] Voucher ${code} usage → ${used}`);
  } catch (err) {
    console.warn('[Webhook] voucher increment failed:', err?.message || err);
  }
}

/**
 * Ensure the paying user has an active super_admin employee record
 * so SubscriptionGuard + dashboard access work after Midtrans pay.
 */
async function ensureAdminEmployee(supabase, userId: string, email: string | undefined, profile: Record<string, unknown> | null) {
  if (!email) return;

  const fullName = (profile?.full_name as string)
    || email.split('@')[0]
    || 'User';
  const companyName = (profile?.company_name as string) || null;

  // Prefer update existing employee by auth_user_id / email
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

  // Create company if onboarding provided a company name (best-effort)
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
      console.warn('[Webhook] company create skipped:', e?.message || e);
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
    console.error('[Webhook] employee insert failed:', e?.message || e);
  }

  return companyId;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const notification = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = notification;

    if (!order_id || !signature_key) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // Verify Midtrans signature (uses values from notification, incl. "149000.00")
    const expectedSignature = await sha512(
      `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`,
    );
    if (signature_key !== expectedSignature) {
      console.error('[Webhook] Invalid signature for order:', order_id);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Map Midtrans transaction → internal status
    let finalStatus = 'pending';
    let activate = false;

    if (transaction_status === 'capture') {
      finalStatus = fraud_status === 'accept' ? 'paid' : 'pending';
      activate = finalStatus === 'paid';
    } else if (transaction_status === 'settlement') {
      finalStatus = 'paid';
      activate = true;
    } else if (transaction_status === 'pending') {
      finalStatus = 'pending';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      finalStatus = transaction_status === 'expire' ? 'expired' : 'failed';
    }

    // Idempotent: load order first
    const { data: existingOrder } = await supabase
      .from('payment_orders')
      .select('user_id, plan_slug, plan_name, amount, billing_cycle, voucher_code, status')
      .eq('order_id', order_id)
      .maybeSingle();

    if (!existingOrder) {
      console.error('[Webhook] Order not found:', order_id);
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    // Already fully processed paid order → acknowledge (idempotent)
    if (existingOrder.status === 'paid' && finalStatus === 'paid') {
      return new Response(JSON.stringify({ ok: true, status: 'paid', already: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from('payment_orders')
      .update({
        status: finalStatus,
        midtrans_status: transaction_status,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id)
      .select('user_id, plan_slug, plan_name, amount, billing_cycle, voucher_code')
      .maybeSingle();

    if (orderErr || !order) {
      console.error('[Webhook] Order update failed:', order_id, orderErr?.message);
      return new Response(JSON.stringify({ error: 'Order update failed' }), { status: 500 });
    }

    // Paid → activate subscription + admin employee
    if (activate && order.user_id) {
      const billingCycle = order.billing_cycle || 'monthly';
      const startsAt = new Date().toISOString();
      const expiresAt = computeExpiry(billingCycle);

      // Onboarding profile (name / company)
      const { data: profile } = await supabase
        .from('onboarding_profiles')
        .select('full_name, company_name, phone')
        .eq('user_id', order.user_id)
        .maybeSingle();

      const { data: authUserData } = await supabase.auth.admin.getUserById(order.user_id);
      const userEmail = authUserData?.user?.email;

      const companyId = await ensureAdminEmployee(
        supabase,
        order.user_id,
        userEmail,
        profile,
      );

      const subPayload: Record<string, unknown> = {
        user_id: order.user_id,
        plan_slug: order.plan_slug,
        plan_name: order.plan_name,
        status: 'active',
        billing_cycle: billingCycle,
        price_paid: order.amount,
        payment_method: 'midtrans',
        starts_at: startsAt,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };
      if (companyId) subPayload.company_id = companyId;

      const { error: subErr } = await supabase
        .from('subscriptions')
        .upsert(subPayload, { onConflict: 'user_id' });

      if (subErr) {
        console.error('[Webhook] subscription upsert error:', subErr.message);
      } else {
        console.log(
          `[Webhook] Subscription activated: user=${order.user_id} plan=${order.plan_slug} cycle=${billingCycle} expires=${expiresAt}`,
        );
      }

      await incrementVoucher(supabase, order.voucher_code);

      if (userEmail) {
        await sendActivationEmail(userEmail, order.plan_name || 'HRIS Loka', expiresAt);
      }
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
