/**
 * /api/send-whatsapp.js — Vercel Serverless Function
 *
 * Mengirim pesan WhatsApp via Fonnte API dari sisi server.
 * API key Fonnte tidak terekspos ke browser.
 *
 * POST /api/send-whatsapp
 * Body: { to: "628xxx", message: "..." }
 */

const FONNTE_TOKEN = process.env.FONNTE_TOKEN; // Server-side (no VITE_ prefix)

const ALLOWED_ORIGINS = [
  'https://hrisloka.id',
  'https://www.hrisloka.id',
  'https://hrisloka.com',
  'https://www.hrisloka.com',
];

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

// Validate Indonesian/international phone number
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  return /^[0-9]{8,15}$/.test(cleaned);
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
  const phone = to.replace(/[\s\-\(\)]/g, '').replace(/^0/, '62').replace(/^\+/, '');

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

