/**
 * /api/cron-check-subscriptions.js — Vercel Cron Function
 *
 * Runs daily to:
 * 1. Find subscriptions that expired in the last 24 hours → mark as expired
 * 2. Send reminder WA/push to subscriptions expiring in 7 days, 3 days, and 1 day
 *
 * Configured in vercel.json under "crons"
 */

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FONNTE_TOKEN    = process.env.FONNTE_TOKEN;

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

export default async function handler(req, res) {
  // Vercel cron sends GET; protect with a secret header
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
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

      // Get subscriptions expiring on that date
      const { data: expiringSubs } = await supabaseRequest(
        `/subscriptions?status=eq.active&expires_at=gte.${dateStr}T00:00:00Z&expires_at=lt.${dateStr}T23:59:59Z&select=id,user_id,plan_name`,
      );

      for (const sub of expiringSubs || []) {
        // Get employee contact info
        const { data: empList } = await supabaseRequest(
          `/employees?auth_user_id=eq.${sub.user_id}&select=name,phone,email&limit=1`,
        );
        const emp = empList?.[0];
        if (!emp) continue;

        const message = `⏰ *HRIS Loka — Pengingat Berlangganan*\n\nHalo, *${emp.name}*!\n\nLangganan *${sub.plan_name || 'HRIS Loka'}* Anda akan berakhir dalam *${days} hari*.\n\nPerbarui berlangganan Anda agar tidak kehilangan akses ke fitur HR.\n\n👉 Kunjungi: https://hrisloka.id/checkout\n\n_HRIS Loka — Smart HR Platform_`;

        await sendWhatsApp(emp.phone, message);
        results.reminded++;
      }
    }

    console.log('[cron-subscriptions] Done:', results);
    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error('[cron-subscriptions] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
