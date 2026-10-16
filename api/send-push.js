/**
 * /api/send-push.js — VPS push sender (server/index.js)
 *
 * POST body:
 *   { employeeId, companyId?, title, body, url? }
 *   { broadcast: true, companyId, title, body, url? }  // companyId REQUIRED
 *
 * Auth (one of):
 *   Authorization: Bearer <user access_token>  — preferred (scoped by company)
 *   Authorization: Bearer <PUSH_API_SECRET>    — server/cron only
 */
import { applyCors } from './_shared/cors.js';
import { enforceJsonBodyLimit } from './_shared/securityHeaders.js';
import crypto from 'node:crypto';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:no-reply@kinikerja.id';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUSH_API_SECRET = process.env.PUSH_API_SECRET;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Fail-loud at module load: misconfigured VAPID means silent push failure
// (web-push throws deep in sendNotification otherwise). Startup logs name
// the missing variable explicitly.
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error(
    '[send-push] CONFIG ERROR: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must both be set. ' +
    'Push sends will return 503 until configured.',
  );
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!a || !b) return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 10;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= max;
}

async function resolveCaller(req, admin) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return { kind: 'none' };

  // Server secret (cron / internal) — timing-safe compare, no oracle
  if (PUSH_API_SECRET && safeEqual(token, PUSH_API_SECRET)) {
    return { kind: 'secret' };
  }

  // User JWT
  if (SUPABASE_URL && SUPABASE_ANON) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await userClient.auth.getUser(token);
    if (error || !user) return { kind: 'invalid' };

    const { data: emp } = await admin
      .from('employees')
      .select('id, company_id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    return {
      kind: 'user',
      user,
      employee: emp || null,
      companyId: emp?.company_id ?? null,
      role: emp?.role || null,
    };
  }

  return { kind: 'invalid' };
}

export default async function handler(req, res) {
  const originOk = applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, Authorization' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Reject oversized JSON bodies before auth (matches express 1mb limit)
  if (!enforceJsonBodyLimit(req, res)) return;
  // Browser requests must come from allowlisted Origin
  if (req.headers.origin && !originOk) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // Socket address is the key — X-Forwarded-For is not trusted.
  const ip = req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(503).json({ success: false, error: 'Push service not configured (VAPID)' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ success: false, error: 'Push service not configured (Supabase)' });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);
  const caller = await resolveCaller(req, admin);

  if (caller.kind === 'none' || caller.kind === 'invalid') {
    // Fail closed unless secret configured for legacy server-to-server
    if (!PUSH_API_SECRET) {
      return res.status(503).json({ error: 'Push auth not configured' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { employeeId, companyId: bodyCompanyId, broadcast, title, body, url } = req.body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Missing or invalid title' });
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Missing or invalid body' });
  }
  if (title.length > 100) return res.status(400).json({ error: 'Title too long (max 100 chars)' });
  if (body.length > 500) return res.status(400).json({ error: 'Body too long (max 500 chars)' });

  // Resolve target company — never broadcast globally
  let companyId = bodyCompanyId || null;
  if (caller.kind === 'user') {
    if (!caller.companyId) {
      return res.status(403).json({ error: 'Caller has no company_id' });
    }
    // User may only target their own company
    if (companyId && String(companyId) !== String(caller.companyId)) {
      return res.status(403).json({ error: 'tenant isolation: company mismatch' });
    }
    companyId = caller.companyId;

    // Only HR/admin can broadcast; managers included for single-push only
    const canBroadcast = ['super_admin', 'hr_admin'].includes(caller.role);
    const canPushOthers = ['super_admin', 'hr_admin', 'manager'].includes(caller.role);
    if (broadcast && !canBroadcast) {
      return res.status(403).json({ error: 'Forbidden: broadcast requires HR/admin' });
    }
    if (!broadcast && employeeId && String(employeeId) !== String(caller.employee?.id) && !canPushOthers) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else if (caller.kind === 'secret') {
    // Server secret must still pass companyId for broadcast
    if (broadcast && !companyId) {
      return res.status(400).json({ error: 'companyId required for broadcast' });
    }
  }

  if (broadcast && !companyId) {
    return res.status(400).json({ error: 'companyId required for broadcast (no global push)' });
  }

  // SECURITY: URL push diteruskan ke clients.openWindow() di SW — hanya path
  // relatif internal yang diizinkan (cegah open-redirect/phishing).
  const rawUrl = typeof url === 'string' && url ? url : '/app/home';
  const safeUrl = /^(\/app(\/|$|\?)|\/checkout(\/|$|\?)|\/login(\/|$|\?))/.test(rawUrl)
    ? rawUrl.slice(0, 200)
    : '/app/home';

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  try {
    let employeeIds = null;

    if (broadcast) {
      const { data: emps, error: empErr } = await admin
        .from('employees')
        .select('id')
        .eq('company_id', companyId);
      if (empErr) {
        console.error('[send-push] employee fetch error:', empErr.message);
        return res.status(500).json({ success: false, error: 'Gagal mengambil data karyawan' });
      }
      employeeIds = (emps || []).map((e) => e.id);
      if (employeeIds.length === 0) {
        return res.status(200).json({ success: true, sent: 0, message: 'No employees in company' });
      }
    } else if (employeeId) {
      // Verify employee belongs to company when known
      if (companyId) {
        const { data: emp } = await admin
          .from('employees')
          .select('id')
          .eq('id', employeeId)
          .eq('company_id', companyId)
          .maybeSingle();
        if (!emp) {
          return res.status(403).json({ error: 'tenant isolation: employee not in company' });
        }
      }
      employeeIds = [employeeId];
    } else {
      return res.status(400).json({ error: 'employeeId or broadcast+companyId required' });
    }

    const { data: subscriptions, error: fetchError } = await admin
      .from('push_subscriptions')
      .select('*')
      .in('employee_id', employeeIds);

    if (fetchError) {
      console.error('[send-push] Supabase fetch error:', fetchError.message);
      return res.status(500).json({ success: false, error: 'Gagal mengambil data langganan' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title.trim(),
      body: body.trim(),
      url: safeUrl,
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          }
          failed++;
        }
      }),
    );

    if (expiredEndpoints.length > 0) {
      // Tenant-scoped cleanup: only delete endpoints belonging to employees
      // of THIS company (endpoint strings are globally unique but a caller
      // must never delete another tenant's rows, even on collision/confusion).
      let cleanup = admin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
      if (companyId && employeeIds.length > 0) {
        cleanup = cleanup.in('employee_id', employeeIds);
      } else if (companyId) {
        // No employee scope resolvable — refuse cross-tenant delete.
        console.warn('[send-push] skipping expired-endpoint cleanup: no employee scope');
        expiredEndpoints.length = 0;
      } else {
        console.warn('[send-push] skipping expired-endpoint cleanup: no company scope');
        expiredEndpoints.length = 0;
      }
      if (expiredEndpoints.length > 0) {
        await cleanup;
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      failed,
      cleaned: expiredEndpoints.length,
      total: subscriptions.length,
      companyId,
    });
  } catch (err) {
    console.error('[send-push] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send push notification' });
  }
}
