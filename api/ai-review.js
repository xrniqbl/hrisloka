/**
 * /api/ai-review.js — Vercel Serverless Function
 *
 * Generate AI review via Gemini API dari sisi server.
 * API key Gemini tidak terekspos ke browser.
 *
 * POST /api/ai-review
 * Body: { prompt: string, maxTokens?: number }
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Server-side (no VITE_ prefix)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGINS = [
  'https://hrisloka.id',
  'https://www.hrisloka.id',
  'https://hrisloka.com',
  'https://www.hrisloka.com',
];

// Rate limit: max 20 AI requests per IP per minute (prevent quota drain)
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 20;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= max;
}

// Verify Supabase JWT token
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  if (!SUPABASE_URL) return true; // Skip if not configured (dev mode)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY || token },
    });
    return res.ok;
  } catch {
    return false;
  }
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
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

  const { prompt, maxTokens = 800 } = req.body || {};

  // Input validation
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty prompt' });
  }
  // Limit prompt length to prevent token abuse (max 5000 chars)
  if (prompt.length > 5000) {
    return res.status(400).json({ error: 'Prompt too long (max 5000 characters)' });
  }
  // Limit maxTokens to prevent abuse
  const safeMaxTokens = Math.min(Math.max(100, parseInt(maxTokens) || 800), 2000);

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ success: false, error: 'AI service not configured' });
  }

  try {
    const apiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt.trim() }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: safeMaxTokens },
      }),
    });

    if (!apiRes.ok) {
      throw new Error(`Gemini API error: ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No content from Gemini');

    res.status(200).json({ success: true, text });
  } catch (err) {
    console.error('[ai-review] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
