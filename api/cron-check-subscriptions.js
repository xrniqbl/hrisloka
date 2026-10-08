/**
 * /api/cron-check-subscriptions.js — Vercel Cron Function
 *
 * Runs daily to:
 * 1. Find subscriptions that expired in the last 24 hours → mark as expired
 * 2. Send reminder WA/push to subscriptions expiring in 7 days, 3 days, and 1 day
 *
 * Configured in vercel.json under "crons"
 */

import crypto from 'node:crypto';

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FONNTE_TOKEN    = process.env.FONNTE_TOKEN;
const MIDTRANS_SERVER_KEY  = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_API_BASE = MIDTRANS_IS_PRODUCTION
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

async function supabaseRequest(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method !== 'GET' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  return { data, ok: res.ok, status: res.status };
}

async function sendWhatsApp(phone, message) {
  if (!FONNTE_TOKEN || !phone) return;
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': FONNTE_TOKEN },
      body: new URLSearchParams({ target: phone, message, delay: '2', countryCode: '62' }),
    });
  } catch { /* non-critical */ }
}

/**
 * Reconcile payment_orders stuck in 'pending' > 2h against the Midtrans
 * status API. Settled/failed results are replayed into midtrans-webhook
 * with a recomputed SHA-512 signature so activation stays in one code path.
 */
async function reconcilePendingOrders(now) {
  if (!MIDTRANS_SERVER_KEY) {
    return { reconciled: 0, skipped: 'MIDTRANS_SERVER_KEY not set' };
  }

  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const { data: pendingOrders } = await supabaseRequest(
    `/payment_orders?status=eq.pending&created_at=lt.${cutoff.toISOString()}&select=order_id&limit=25`,
  );

  let reconciled = 0;
  for (const { order_id } of pendingOrders || []) {
    try {
      const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
      const statusRes = await fetch(`${MIDTRANS_API_BASE}/v2/${encodeURIComponent(order_id)}/status`, {
        headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
      });
      if (!statusRes.ok) continue;
      const mt = await statusRes.json();

      // Still pending at Midtrans (unpaid QRIS/VA etc.) — leave it alone
      if (!mt.transaction_status || mt.transaction_status === 'pending') continue;

      const statusCode = mt.status_code || '200';
      const grossAmount = mt.gross_amount || '0.00';
      const signature = crypto
        .createHash('sha512')
        .update(`${mt.order_id || order_id}${statusCode}${grossAmount}${MIDTRANS_SERVER_KEY}`)
        .digest('hex');

      const replay = await fetch(`${SUPABASE_URL}/functions/v1/midtrans-webhook`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: mt.order_id || order_id,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signature,
          transaction_status: mt.transaction_status,
          fraud_status: mt.fraud_status || 'accept',
        }),
      });
      if (replay.ok) reconciled++;
      else console.warn(`[cron-subscriptions] webhook replay failed for ${order_id}: HTTP ${replay.status}`);
    } catch (e) {
      console.warn(`[cron-subscriptions] reconcile error for ${order_id}:`, e?.message);
    }
  }
  return { reconciled };
}

export default async function handler(req, res) {
  // Vercel cron sends GET; protect with a secret header.
  // SECURITY: secret wajib dikonfigurasi — jika CRON_SECRET kosong endpoint
  // harus menolak semua request (fail-closed). Hanya terima via header
  // (query ?secret= bocor ke log akses).
  const configured = process.env.CRON_SECRET;
  const cronSecret = req.headers['x-cron-secret'];
  if (!configured || !cronSecret || cronSecret !== configured) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date();
  const results = { expired: 0, reminded: 0, errors: [] };

  try {
    // ── 1. Expire subscriptions that passed expires_at ─────────────────────
    const yesterday = new Date(now);
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: expiredSubs } = await supabaseRequest(
      `/subscriptions?status=eq.active&expires_at=lt.${now.toISOString()}&select=id,user_id`,
    );

    for (const sub of expiredSubs || []) {
      const { ok } = await supabaseRequest(
        `/subscriptions?id=eq.${sub.id}`,
        'PATCH',
        { status: 'expired', updated_at: now.toISOString() },
      );
      if (ok) results.expired++;
    }

    // ── 2. Send reminders for subscriptions expiring soon ──────────────────
    const reminderDays = [7, 3, 1];

    for (const days of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const dateStr = targetDate.toISOString().split('T')[0];
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextStr = nextDay.toISOString().split('T')[0];

      // Subscriptions whose expires_at falls in [targetDate 00:00, nextDay 00:00).
      // The previous lt.<date>T23:59:59Z window excluded the last minute of the
      // day (23:59:59–24:00:00) — a fence-post error that skipped reminders.
      // Join subscription_plans so plan_name is populated even for rows created
      // via the founder admin flow (which sets plan_id but not plan_name).
      const { data: expiringSubs } = await supabaseRequest(
        `/subscriptions?status=eq.active&expires_at=gte.${dateStr}T00:00:00Z&expires_at=lt.${nextStr}T00:00:00Z&select=id,user_id,plan_name,subscription_plans(name)`,
      );

      for (const sub of expiringSubs || []) {
        // Get employee contact info
        const { data: empList } = await supabaseRequest(
          `/employees?auth_user_id=eq.${sub.user_id}&select=name,phone,email&limit=1`,
        );
        const emp = empList?.[0];
        if (!emp) continue;

        const planName = sub.plan_name || sub.subscription_plans?.name || 'KiniKerja';
        const message = `⏰ *KiniKerja — Pengingat Berlangganan*\n\nHalo, *${emp.name}*!\n\nLangganan *${planName}* Anda akan berakhir dalam *${days} hari*.\n\nPerbarui berlangganan Anda agar tidak kehilangan akses ke fitur HR.\n\n👉 Kunjungi: https://kinikerja.id/checkout\n\n_KiniKerja — Smart HR Platform_`;

        await sendWhatsApp(emp.phone, message);
        results.reminded++;
      }
    }

    // ── 3. Reconcile stuck pending payment orders with Midtrans ────────
    const reconcile = await reconcilePendingOrders(now);
    results.reconciled = reconcile.reconciled;
    if (reconcile.skipped) results.reconcile_skipped = reconcile.skipped;

    console.log('[cron-subscriptions] Done:', results);
    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error('[cron-subscriptions] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}
