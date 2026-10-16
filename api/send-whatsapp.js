/**
 * /api/send-whatsapp.js — Serverless / VPS API handler
 *
 * Mengirim pesan WhatsApp via Fonnte API dari sisi server.
 * API key Fonnte tidak terekspos ke browser.
 *
 * POST /api/send-whatsapp
 * Headers: Authorization: Bearer <supabase_access_token>
 * Body: { to: "628xxx", message: "..." }
 */
import { applyCors } from './_shared/cors.js';
import { enforceJsonBodyLimit } from './_shared/securityHeaders.js';
import { resolveTenantCaller, checkUserRateLimit, normalizePhone } from './_shared/tenantAuth.js';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN; // Server-side (no VITE_ prefix)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Roles allowed to trigger WhatsApp sends (leave/payslip/loan/overtime/
// ticket/registration notifications are all HR-or-manager initiated;
// super_admin additionally may send to arbitrary numbers for the
// IntegrationHub connection test).
const ALLOWED_ROLES = new Set(['super_admin', 'hr_admin', 'admin', 'hr', 'manager']);

// Rate limit: max 10 WA requests per IP per minute
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

// Caller auth via resolveTenantCaller from _shared/tenantAuth.js
// (tenant-bound employee row + role check, fail-closed).

// Validate Indonesian/international phone number
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  return /^[0-9]{8,15}$/.test(cleaned);
}

export default async function handler(req, res) {
  const originOk = applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, Authorization' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.headers.origin && !originOk) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Reject oversized JSON bodies before auth (matches express 1mb limit)
  if (!enforceJsonBodyLimit(req, res)) return;
  // Authentication + tenant authorization
  const caller = await resolveTenantCaller(req);
  if (caller.error === 'unauthorized') {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }
  if (caller.error === 'no_employee' || !caller.employee?.company_id) {
    return res.status(403).json({ error: 'Forbidden — no employee record for this tenant' });
  }
  if (!ALLOWED_ROLES.has(caller.employee.role)) {
    return res.status(403).json({ error: 'Forbidden — HR/admin/manager role required' });
  }

  // Rate limiting (IP shared quota + per-user quota).
  // Socket address is the key — X-Forwarded-For is not trusted.
  const ip = req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  if (!checkUserRateLimit(`wa:${caller.user.id || caller.user.sub}`, 10, 60_000)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { to, message } = req.body || {};

  // Input validation
  if (!to || !isValidPhone(to)) {
    return res.status(400).json({ error: 'Invalid or missing phone number' });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty message' });
  }
  // Limit message length to prevent abuse
  if (message.length > 4096) {
    return res.status(400).json({ error: 'Message too long (max 4096 chars)' });
  }

  if (!FONNTE_TOKEN) {
    console.error('[send-whatsapp] FONNTE_TOKEN not set on server');
    return res.status(503).json({ success: false, error: 'WhatsApp service not configured' });
  }

  // Normalize number
  const phone = normalizePhone(to);

  // Recipient authorization: the normalized number must belong to an
  // employee of the caller's company. employees has two phone-ish columns
  // (`phone`, `whatsapp`), so query per-column exact matches — never a full
  // 500-row pull (which false-403s tenants with >500 employees).
  // Exception: super_admin may send to arbitrary numbers (IntegrationHub
  // connection test uses the configured sender number).
  if (caller.employee.role !== 'super_admin') {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(503).json({ success: false, error: 'Recipient check unavailable' });
    }
    const svcHeaders = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    };
    let owned = false;
    for (const col of ['phone', 'whatsapp']) {
      const lookup = await fetch(
        `${SUPABASE_URL}/rest/v1/employees?company_id=eq.${encodeURIComponent(caller.employee.company_id)}&${col}=eq.${encodeURIComponent(phone)}&select=id&limit=1`,
        { headers: svcHeaders },
      );
      if (!lookup.ok) {
        return res.status(503).json({ success: false, error: 'Recipient check unavailable' });
      }
      const rows = await lookup.json().catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) { owned = true; break; }
      // Numbers may be stored in local format (08xx) while `phone` is
      // normalized (62xx) — also try the 0-prefixed variant.
      if (phone.startsWith('62')) {
        const local = `0${phone.slice(2)}`;
        const alt = await fetch(
          `${SUPABASE_URL}/rest/v1/employees?company_id=eq.${encodeURIComponent(caller.employee.company_id)}&${col}=eq.${encodeURIComponent(local)}&select=id&limit=1`,
          { headers: svcHeaders },
        );
        if (!alt.ok) {
          return res.status(503).json({ success: false, error: 'Recipient check unavailable' });
        }
        const altRows = await alt.json().catch(() => []);
        if (Array.isArray(altRows) && altRows.length > 0) { owned = true; break; }
      }
    }
    if (!owned) {
      return res.status(403).json({ error: 'Forbidden — recipient not in company' });
    }
  }

  try {
    const apiRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
    });
    // Unified Fonnte shape (same as cron-check-subscriptions.js): JSON
    // Content-Type + explicit status check. Non-2xx or status:false = failure.
    if (!apiRes.ok) throw new Error(`Fonnte HTTP ${apiRes.status}`);
    const data = await apiRes.json().catch(() => null);
    if (!data || data.status === false) {
      throw new Error(
        (data && typeof data.reason === 'string' && data.reason) || 'Fonnte send failed',
      );
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-whatsapp] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp message' });
  }
}
