/**
 * /api/send-push.js — Vercel Serverless Function
 *
 * Sends Web Push notifications to subscribed employees.
 * Uses the `web-push` library with VAPID keys stored server-side.
 *
 * POST /api/send-push
 * Body: { employeeId?: string, title: string, body: string, url?: string }
 *   OR  { broadcast: true, title: string, body: string, url?: string }
 *
 * Requires env vars:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:hrisloka@gmail.com';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGINS = [
  'https://hrisloka.id',
  'https://www.hrisloka.id',
  'https://hrisloka.com',
  'https://www.hrisloka.com',
];

// Rate limit: max 5 push requests per IP per minute (HR use case)
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 5;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= max;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── AUTHENTICATION ──────────────────────────────────────────────
  // Require Authorization: Bearer <PUSH_API_SECRET> from server-side callers only
  const PUSH_API_SECRET = process.env.PUSH_API_SECRET;
  if (PUSH_API_SECRET) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || token !== PUSH_API_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  // ────────────────────────────────────────────────────────────────

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { employeeId, broadcast, title, body, url } = req.body || {};


  // Input validation & length limits
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid title' });
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid body' });
  }
  if (title.length > 100) {
    return res.status(400).json({ error: 'Title too long (max 100 chars)' });
  }
  if (body.length > 500) {
    return res.status(400).json({ error: 'Body too long (max 500 chars)' });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('[send-push] VAPID keys not configured');
    return res.status(503).json({ success: false, error: 'Push service not configured' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[send-push] Supabase credentials not configured');
    return res.status(503).json({ success: false, error: 'Push service not configured' });
  }

  // Configure web-push
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Create Supabase admin client (service role bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Fetch subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    if (!broadcast && employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('[send-push] Supabase fetch error:', fetchError);
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    // Build notification payload
    const payload = JSON.stringify({
      title,
      body,
      url: url || '/app/home',
    });

    // Send to all subscriptions
    let sent = 0;
    let failed = 0;
    const expiredEndpoints = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (err) {
          // 410 Gone or 404 = subscription expired, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          }
          failed++;
          console.warn(`[send-push] Failed for ${sub.endpoint.slice(0, 50)}...:`, err.statusCode || err.message);
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
      console.log(`[send-push] Cleaned ${expiredEndpoints.length} expired subscriptions`);
    }

    res.status(200).json({
      success: true,
      sent,
      failed,
      cleaned: expiredEndpoints.length,
      total: subscriptions.length,
    });
  } catch (err) {
    console.error('[send-push] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send push notification' });
  }
}
