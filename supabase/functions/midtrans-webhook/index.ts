// @ts-nocheck
// Supabase Edge Function: midtrans-webhook
// Deploy: supabase functions deploy midtrans-webhook
// Midtrans Dashboard → Settings → Configuration → Payment Notification URL:
//   https://<project-ref>.supabase.co/functions/v1/midtrans-webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

/** Fail-fast env validation: missing secrets must crash the function at boot
 * (loud deploy-time error) rather than silently accepting every notification
 * with an empty-string signature key or sending broken login links. */
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) {
    throw new Error(`[midtrans-webhook] CONFIG ERROR: ${name} is not set`);
  }
  return v;
}

const MIDTRANS_SERVER_KEY = requireEnv('MIDTRANS_SERVER_KEY');
const SITE_URL = requireEnv('SITE_URL');
const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

async function sha512(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

/** Send subscription activation email via Brevo Transactional API */
async function sendActivationEmail(to: string, planName: string, expiresAt: string): Promise<void> {
  const BREVO_API_KEY =
    Deno.env.get('BREVO_API_KEY') ||
    Deno.env.get('BREVO_SMTP_KEY') ||
    Deno.env.get('RESEND_API_KEY'); // migration alias
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@kinikerja.id';
  const FROM_NAME = Deno.env.get('FROM_NAME') || Deno.env.get('BREVO_SENDER_NAME') || 'KiniKerja';

  if (!BREVO_API_KEY) {
    console.warn('[Webhook] BREVO_API_KEY not set, skipping email');
    return;
  }

  const expiryDate = new Date(expiresAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // planName comes from DB/client input — escape before HTML interpolation.
  const safePlanName = escapeHtml(planName);

  let senderEmail = FROM_EMAIL;
  let senderName = FROM_NAME;
  const nameEmail = String(FROM_EMAIL).match(/^(.*?)\s*<([^>]+)>$/);
  if (nameEmail) {
    senderName = nameEmail[1].trim() || FROM_NAME;
    senderEmail = nameEmail[2].trim();
  }

  const html = `
    <div style="font-family:'Inter Tight',Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#5654D4,#4543C0);padding:24px;border-radius:16px 16px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">KiniKerja</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Langganan Berhasil Diaktifkan</p>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
        <h2 style="margin:0 0 16px;color:#16A34A">Langganan Anda Sudah Aktif!</h2>
        <p>Halo,</p>
        <p>Pembayaran Anda telah berhasil diverifikasi. Langganan <strong>${safePlanName}</strong> Anda sudah aktif.</p>
        <div style="background:#F0FDF4;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #16A34A">
          <div style="font-size:14px;font-weight:600;color:#16A34A;margin-bottom:8px">Detail Langganan:</div>
          <div style="font-size:13px;color:#374151;line-height:1.6">
            <div><strong>Paket:</strong> ${safePlanName}</div>
            <div><strong>Status:</strong> Aktif</div>
            <div><strong>Berlaku hingga:</strong> ${expiryDate}</div>
          </div>
        </div>
        <p>Silakan login ke dashboard KiniKerja untuk mulai menggunakan semua fitur.</p>
        <a href="${SITE_URL}/login" style="display:inline-block;background:#5654D4;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;margin-top:16px">Masuk ke Dashboard</a>
        <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email otomatis dari KiniKerja.</p>
      </div>
    </div>
  `;

  const text = `Langganan ${safePlanName} Anda sudah aktif! Berlaku hingga ${expiryDate}. Login: ${SITE_URL}/login`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject: `[KiniKerja] Langganan ${safePlanName} Berhasil Diaktifkan`,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (res.ok) {
      console.log(`[Webhook] Activation email sent to ${to} via Brevo`);
    } else {
      console.error(`[Webhook] Failed to send email: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[Webhook] Email error: ${err?.message || err}`);
  }
}

/** Best-effort admin alert (amount mismatch / voucher dispute).
 * Recipient: ADMIN_ALERT_EMAIL, fallback to the sender address itself so the
 * flag is at least visible in Brevo logs. Never throws. */
async function sendAdminAlert(subject: string, text: string): Promise<void> {
  try {
    const BREVO_API_KEY =
      Deno.env.get('BREVO_API_KEY') ||
      Deno.env.get('BREVO_SMTP_KEY') ||
      Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@kinikerja.id';
    const ADMIN_EMAIL = Deno.env.get('ADMIN_ALERT_EMAIL') || FROM_EMAIL;
    if (!BREVO_API_KEY || !ADMIN_EMAIL) return;
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'KiniKerja Alert', email: FROM_EMAIL },
        to: [{ email: ADMIN_EMAIL }],
        subject: `[KiniKerja ALERT] ${subject}`,
        textContent: text,
      }),
    });
  } catch (err) {
    console.error('[Webhook] admin alert failed:', err?.message || err);
  }
}

/** Increment voucher usage — atomik via RPC claim_voucher (cegah double-spend).
 * Returns true when claimed, false when exhausted/invalid. Caller decides
 * whether a failed claim must block activation (single-use voucher). */
async function incrementVoucher(supabase, code: string): Promise<boolean> {
  if (!code) return true;
  try {
    const { data: claimed, error } = await supabase.rpc('claim_voucher', {
      p_code: code.trim().toUpperCase(),
    });
    if (error || claimed !== true) {
      console.error('[Webhook] voucher claim FAILED (blocking):', error?.message || 'exhausted');
      return false;
    }
    console.log(`[Webhook] Voucher ${code} claimed`);
    return true;
  } catch (err) {
    console.error('[Webhook] voucher increment failed:', err?.message || err);
    return false;
  }
}

/** Escape text interpolated into activation HTML (plan names are DB/client supplied). */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// In-memory per-IP rate limit (best-effort, self-contained Deno — same pattern
// as api/*): at most 60 requests/min per IP. Runs BEFORE signature verification
// so floods of forged signatures (expensive SHA-512) are held back.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const rateLimitMap = new Map<string, { count: number; start: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_MAX;
}

/**
 * Ensure the paying user has an active super_admin employee record
 * so SubscriptionGuard + dashboard access work after Midtrans pay.
 * Anti-hijack: only touch rows owned by this auth user, or unclaimed
 * rows (auth_user_id IS NULL) with the same email. Never reassign an
 * auth_user_id owned by someone else, never promote claimed rows.
 */
async function ensureAdminEmployee(supabase, userId: string, email: string | undefined, profile: Record<string, unknown> | null) {
  if (!email) return null;

  const fullName = (profile?.full_name as string)
    || email.split('@')[0]
    || 'User';
  const companyName = (profile?.company_name as string) || null;

  // 1) Row already owned by this auth user — keep role, just ensure active.
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

  // 2) Unclaimed row with same email — safe to claim as super_admin.
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

  // Create company if onboarding provided a company name (best-effort)
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

  // Rate-limit BEFORE signature verification (flood signature palsu ditahan).
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  if (!checkRateLimit(clientIp)) {
    console.warn('[Webhook] rate limited:', clientIp);
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
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
      // Generik (sama seperti order-not-found): hilangkan oracle enumerasi order_id.
      return new Response(JSON.stringify({ error: 'Invalid notification' }), { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      // Generik 401 (sama seperti signature salah): hilangkan oracle enumerasi order_id.
      return new Response(JSON.stringify({ error: 'Invalid notification' }), { status: 401 });
    }

    // Amount verification: notification gross_amount must match the stored order.
    // A valid signature only proves Midtrans sent it — not that it pays what we charged.
    // Robust compare: Number() on both sides with 1 IDR rounding tolerance,
    // and non-numeric values fail closed (dispute) instead of skipping the check.
    const notifiedAmount = Number(gross_amount);
    const storedAmount = Number(existingOrder.amount);
    if (
      !Number.isFinite(notifiedAmount) || !Number.isFinite(storedAmount)
      || Math.abs(notifiedAmount - storedAmount) > 1
    ) {
      console.error(
        `[Webhook] AMOUNT MISMATCH order=${order_id} notified=${gross_amount} stored=${storedAmount}`,
      );
      await supabase
        .from('payment_orders')
        .update({
          status: 'disputed',
          midtrans_status: `amount_mismatch:${transaction_status}`,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order_id);
      // Notify admin (best-effort) so money-received-but-wrong-amount is reviewed.
      await sendAdminAlert(
        `Amount mismatch ${order_id}`,
        `Order ${order_id}: notified=${gross_amount} stored=${storedAmount} status=${transaction_status}. Flagged 'disputed' — needs manual review.`,
      );
      // 200 so Midtrans stops retrying; order is flagged for manual review
      return new Response(JSON.stringify({ ok: false, error: 'Amount mismatch' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Already-seen order_id → acknowledge idempotently REGARDLESS of status.
    // A failed/expired order retried by Midtrans with a NEW transaction_status
    // must not re-run activation side-effects (voucher claim, subscription
    // upsert) a second time — this closes the voucher-fail re-activation loop.
    if (existingOrder.status !== 'pending' && existingOrder.status !== 'disputed') {
      return new Response(JSON.stringify({ ok: true, status: existingOrder.status, already: true }), {
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
      // Generic 500 — no table/column internals to the caller.
      return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
    }

    // Paid → activate subscription + admin employee
    if (activate && order.user_id) {
      const billingCycle = order.billing_cycle || 'monthly';

      // Early renewal: extend from current expiry when still active
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', order.user_id)
        .maybeSingle();
      const baseMs = resolveRenewalBase(currentSub);
      const startsAt = new Date(baseMs).toISOString();
      const expiresAt = computeExpiry(baseMs, billingCycle);

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

      // Guard: never create an orphan subscription with no company context.
      // Abort loudly (alert + 500) so the order stays paid-but-unactivated
      // and is visible for manual recovery instead of silently drifting.
      if (!companyId) {
        await sendAdminAlert(
          `Missing company ${order_id}`,
          `Order ${order_id} paid (user=${order.user_id}) but no company_id could be resolved. Subscription NOT created — manual recovery required.`,
        );
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

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
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };

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

      // Claim voucher BEFORE considering activation complete. A failed claim
      // (race / exhausted single-use) blocks activation instead of only
      // logging a warning — prevents discount double-spend.
      if (order.voucher_code) {
        const claimed = await incrementVoucher(supabase, order.voucher_code);
        if (!claimed) {
          await supabase
            .from('payment_orders')
            .update({
              status: 'disputed',
              midtrans_status: `voucher_claim_failed:${transaction_status}`,
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', order_id);
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('user_id', order.user_id);
          await sendAdminAlert(
            `Voucher claim failed ${order_id}`,
            `Order ${order_id} paid but voucher ${order.voucher_code} claim failed (race/exhausted). Flagged 'disputed' — needs manual review.`,
          );
          return new Response(JSON.stringify({ ok: false, error: 'Voucher claim failed — flagged for review' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (userEmail) {
        await sendActivationEmail(userEmail, order.plan_name || 'KiniKerja', expiresAt);
      }
    }

    return new Response(JSON.stringify({ ok: true, status: finalStatus }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Webhook] Error:', message);
    // Pesan generik ke client — detail sudah tercatat di log server-side.
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
