
/**
 * /api/cron-check-subscriptions — cron harian (SQLite lokal)
 * 1. Expire subscription yang lewat expires_at
 * 2. Kirim pengingat WhatsApp H-7, H-3, H-1
 * 3. Rekonsiliasi order Midtrans yang pending
 */
import db from './_shared/db.js';
import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_API_BASE = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';

async function sendWhatsApp(phone, message) {
  if (!phone) return false;
  try {
    // pakai helper internal bila ada
    const { sendWA } = await import('./_shared/whatsapp.js').catch(() => ({}));
    if (sendWA) { await sendWA(phone, message); return true; }
    return false;
  } catch (e) { return false; }
}

async function reconcilePendingOrders(now) {
  if (!MIDTRANS_SERVER_KEY) {
    return { reconciled: 0, skipped: 'MIDTRANS_SERVER_KEY not set' };
  }
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const pending = db.prepare(
    `SELECT id, midtrans_order_id FROM subscriptions
     WHERE status = 'pending' AND midtrans_order_id IS NOT NULL AND created_at < ? LIMIT 25`
  ).all(cutoff);

  let reconciled = 0;
  for (const { id, midtrans_order_id } of pending) {
    try {
      const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
      const res = await fetch(`${MIDTRANS_API_BASE}/v2/${encodeURIComponent(midtrans_order_id)}/status`, {
        headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
      });
      if (!res.ok) continue;
      const mt = await res.json();
      if (!mt.transaction_status || mt.transaction_status === 'pending') continue;

      if (mt.transaction_status === 'settlement' || mt.transaction_status === 'capture') {
        // aktifkan 30 hari dari sekarang
        const exp = new Date(); exp.setDate(exp.getDate() + 30);
        db.prepare(`UPDATE subscriptions SET status='active', paid_at=datetime('now'), expires_at=? WHERE id=?`)
          .run(exp.toISOString(), id);
        reconciled++;
      } else if (['expire', 'cancel', 'deny'].includes(mt.transaction_status)) {
        db.prepare(`UPDATE subscriptions SET status='failed' WHERE id=?`).run(id);
        reconciled++;
      }
    } catch (e) {
      console.warn(`[cron-subscriptions] reconcile error ${midtrans_order_id}:`, e?.message);
    }
  }
  return { reconciled };
}

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret'] || req.query?.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const results = { expired: 0, reminded: 0, errors: [] };

  try {
    // 1. Expire yang lewat
    const r1 = db.prepare(
      `UPDATE subscriptions SET status='expired'
       WHERE status='active' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();
    results.expired = r1.changes || 0;

    // 2. Pengingat H-7, H-3, H-1
    for (const days of [7, 3, 1]) {
      const target = new Date(now); target.setDate(target.getDate() + days);
      const d0 = target.toISOString().split('T')[0];
      const rows = db.prepare(
        `SELECT s.id, s.plan, c.name as company_name,
                (SELECT phone FROM employees WHERE company_id = s.company_id AND role = 'admin' LIMIT 1) as phone,
                (SELECT name FROM employees WHERE company_id = s.company_id AND role = 'admin' LIMIT 1) as admin_name
         FROM subscriptions s
         JOIN companies c ON c.id = s.company_id
         WHERE s.status = 'active' AND date(s.expires_at) = date(?)`
      ).all(d0);
      for (const r of rows) {
        const msg = `Pengingat KiniKerja\n\nHalo ${r.admin_name || 'Admin'}!\n\nLangganan ${r.plan || 'KiniKerja'} untuk ${r.company_name} akan berakhir dalam ${days} hari.\n\nPerbarui di https://kinikerja.id/app/ agar tidak kehilangan akses.`;
        if (await sendWhatsApp(r.phone, msg)) results.reminded++;
      }
    }

    // 3. Rekonsiliasi Midtrans
    const rec = await reconcilePendingOrders(now);
    results.reconciled = rec.reconciled;
    if (rec.skipped) results.reconcile_skipped = rec.skipped;

    console.log('[cron-subscriptions] Done:', results);
    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error('[cron-subscriptions] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
