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

const FONNTE_TOKEN = process.env.FONNTE_TOKEN; // Server-side (no VITE_ prefix)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Verify Supabase JWT — FAIL CLOSED (same pattern as send-email / ai-review).
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  if (!token) return false;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY },
    });
    if (!res.ok) return false;
    const user = await res.json();
    if (user?.email_confirmed_at || user?.confirmed_at) return true;
    return false;
  } catch {
    return false;
  }
}

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

  // Authentication check — verify Supabase JWT
  const isAuthed = await verifyAuth(req);
  if (!isAuthed) {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
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
  const phone = to.replace(/[\s\-()]/g, '').replace(/^0/, '62').replace(/^\+/, '');

  try {
    const apiRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
    });
    const data = await apiRes.json();
    if (!data.status) throw new Error(data.reason || 'Fonnte send failed');
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-whatsapp] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp message' });
  }
}
