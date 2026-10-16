/**
 * /api/cron-check-subscriptions — VPS cron handler (server/index.js node-cron, localhost-only)
 * Supabase-backed. Keyset pagination. Header-only secret.
 */

import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_API_BASE = MIDTRANS_IS_PRODUCTION
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!a || !b) return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function wibDateStr(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const shifted = new Date(d.getTime() + 7 * 3_600_000);
    return shifted.toISOString().split('T')[0];
  }
}

function wibDayStartIso(dateStr) {
  return `${dateStr}T00:00:00+07:00`;
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split('T')[0];
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

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
  const data = await safeJson(res);
  return { data, ok: res.ok, status: res.status };
}

async function sendWhatsApp(phone, message) {
  if (!FONNTE_TOKEN || !phone) return false;
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
    });
    if (!res.ok) return false;
    const data = await safeJson(res);
    if (data && data.status === false) return false;
    return true;
  } catch { return false; }
}

async function reconcilePendingOrders(now) {
  if (!MIDTRANS_SERVER_KEY) {
    return { reconciled: 0, skipped: 'MIDTRANS_SERVER_KEY not set' };
  }
  const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const RECONCILE_PAGE = 500;
  let reconcileOffset = 0;
  const pendingOrders = [];
  for (;;) {
    const { data: page } = await supabaseRequest(
      `/payment_orders?status=eq.pending&created_at=lt.${cutoff.toISOString()}&select=order_id&order=created_at.asc&limit=${RECONCILE_PAGE}&offset=${reconcileOffset}`,
    );
    if (!page || page.length === 0) break;
    pendingOrders.push(...page);
    if (page.length < RECONCILE_PAGE) break;
    reconcileOffset += RECONCILE_PAGE;
  }

  let reconciled = 0;
  for (const { order_id } of pendingOrders || []) {
    try {
      const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
      const statusRes = await fetch(`${MIDTRANS_API_BASE}/v2/${encodeURIComponent(order_id)}/status`, {
        headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
      });
      if (!statusRes.ok) continue;
      const mt = await statusRes.json();
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
  // Header-only secret (fail-closed). Query/body ?secret= NOT accepted.
  const configured = process.env.CRON_SECRET;
  const headerSecret = req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'];
  const provided = typeof headerSecret === 'string' && headerSecret ? headerSecret : '';
  if (!configured || !safeEqual(provided, configured)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date();
  const results = { expired: 0, reminded: 0, remindFailed: 0, errors: [] };

  try {
    // 1. Expire — keyset pagination (NOT offset: PATCH drops rows from set).
    const todayWib = wibDateStr(now);
    const wibStartIso = wibDayStartIso(todayWib);
    const EXPIRE_PAGE = 500;
    let lastId = 0;
    for (;;) {
      const { data: expiredSubs } = await supabaseRequest(
        `/subscriptions?status=eq.active&expires_at=lt.${now.toISOString()}&updated_at=lt.${encodeURIComponent(wibStartIso)}&id=gt.${lastId}&select=id,user_id&order=id.asc&limit=${EXPIRE_PAGE}`,
      );
      if (!expiredSubs || expiredSubs.length === 0) break;

      for (const sub of expiredSubs) {
        const { ok } = await supabaseRequest(
          `/subscriptions?id=eq.${sub.id}`,
          'PATCH',
          { status: 'expired', updated_at: now.toISOString() },
        );
        if (ok) results.expired++;
        lastId = sub.id;
      }
      if (expiredSubs.length < EXPIRE_PAGE) break;
    }

    // 2. Reminders H-7/H-3/H-1.
    const reminderDays = [7, 3, 1];
    for (const days of reminderDays) {
      const targetWib = addDaysYmd(todayWib, days);
      const nextWib = addDaysYmd(todayWib, days + 1);
      const bucketStart = wibDayStartIso(targetWib);
      const bucketEnd = wibDayStartIso(nextWib);

      const { data: expiringSubs } = await supabaseRequest(
        `/subscriptions?status=eq.active&expires_at=gte.${encodeURIComponent(bucketStart)}&expires_at=lt.${encodeURIComponent(bucketEnd)}&select=id,user_id,plan_name,subscription_plans(name)`,
      );

      for (const sub of expiringSubs || []) {
        const { data: empList } = await supabaseRequest(
          `/employees?auth_user_id=eq.${sub.user_id}&select=name,phone,email&limit=1`,
        );
        const emp = empList?.[0];
        if (!emp) continue;

        const planName = sub.plan_name || sub.subscription_plans?.name || 'KiniKerja';
        const message = `KiniKerja — Pengingat Berlangganan\n\nHalo, ${emp.name}!\n\nLangganan ${planName} Anda akan berakhir dalam ${days} hari.\n\nPerbarui di https://kinikerja.id/checkout agar tidak kehilangan akses.`;

        const sent = await sendWhatsApp(emp.phone, message);
        if (sent) results.reminded++;
        else results.remindFailed++;
      }
    }

    // 3. Reconcile stuck pending orders.
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
