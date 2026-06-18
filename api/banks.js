/**
 * /api/banks.js — Vercel Serverless Function
 * Returns available Indonesian bank list via api.co.id
 * Bank API key stays server-side (process.env.BANK_VALIDATION_API_KEY)
 */

const ALLOWED_ORIGINS = [
  'https://hrisloka.id',
  'https://www.hrisloka.id',
  'https://hrisloka.com',
  'https://www.hrisloka.com',
];

// Simple in-memory rate limit: max 30 req/min per IP
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 30;
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
  // CORS — allowlist only (no wildcard)
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ is_success: false, message: 'Too many requests. Try again later.' });
  }

  try {
    const apiKey = process.env.BANK_VALIDATION_API_KEY || '';
    const response = await fetch('https://use.api.co.id/validation/bank/available', {
      method: 'GET',
      headers: { 'x-api-co-id': apiKey },
    });

    const data = await response.json();
    // Cache for 1 hour — bank list rarely changes
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ is_success: false, message: 'Bank service unavailable' });
  }
}
