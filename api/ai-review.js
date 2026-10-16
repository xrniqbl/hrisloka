/**
 * /api/ai-review.js — VPS API handler (server/index.js)
 *
 * Generate AI review via Gemini API dari sisi server.
 * API key Gemini tidak terekspos ke browser.
 *
 * H1 mitigation: free-form { prompt } DIHAPUS — endpoint ini adalah proxy
 * LLM berbayar. Hanya dua aksi bertemplate yang diizinkan, dengan input
 * tervalidasi ketat + kuota per-user. Prompt dirakit server-side.
 *
 * POST /api/ai-review
 * Body: { action: 'performance_review' | 'dept_insight', data: {...} }
 */
import { applyCors } from './_shared/cors.js';
import { enforceJsonBodyLimit } from './_shared/securityHeaders.js';
import { resolveTenantCaller, checkUserRateLimit } from './_shared/tenantAuth.js';


const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Server-side (no VITE_ prefix)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Caller auth now via resolveTenantCaller from _shared/tenantAuth.js
// (tenant-bound employee row + role check, fail-closed).

// ── Server-side prompt templates (H1) ─────────────────────────────────────
// Input fields are allowlisted + length-capped; the prompt is assembled
// here, never taken raw from the client.

function cleanStr(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

function cleanScore(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function buildReviewPrompt(data) {
  const name = cleanStr(data.name, 100) || 'Karyawan';
  const division = cleanStr(data.division, 100) || '-';
  const position = cleanStr(data.position, 100) || '-';
  const period = cleanStr(data.period, 40) || '';
  const avgScore = cleanScore(data.avgScore);
  const skills = Array.isArray(data.skills) ? data.skills.slice(0, 20).map((s) => ({
    name: cleanStr(s?.name, 100),
    level: cleanStr(s?.level, 30),
    score: cleanScore(s?.score),
  })).filter((s) => s.name) : [];
  const certs = Array.isArray(data.certs) ? data.certs.slice(0, 20).map((c) => cleanStr(c, 100)).filter(Boolean) : [];
  const kpi = cleanStr(data.kpi, 2000);

  const skillsText = skills.length
    ? skills.map((s) => `${s.name} (${s.level || '-'}, ${s.score}%)`).join(', ')
    : 'Belum ada data AI skills';
  const certsText = certs.length ? certs.join(', ') : 'Belum ada sertifikasi';

  return `Kamu adalah asisten HR profesional untuk perusahaan Indonesia.
Buat evaluasi kinerja bulanan yang personal, spesifik, dan konstruktif untuk karyawan berikut dalam Bahasa Indonesia:

**Data Karyawan:**
- Nama: ${name}
- Divisi: ${division}
- Posisi: ${position}
- Periode: ${period}

**AI Capability Score:** ${avgScore}/100
**Skills dikuasai:** ${skillsText}
**Sertifikasi AI:** ${certsText}
${kpi ? `**KPI:** ${kpi}` : ''}

Buat evaluasi yang mencakup:
1. Ringkasan performa (2-3 kalimat personal, bukan generik)
2. Kekuatan utama berdasarkan data di atas
3. Area pengembangan yang spesifik dan actionable
4. Rekomendasi program training yang relevan
5. Target kuartal berikutnya

Format sebagai teks terstruktur dengan judul section. Gunakan nada profesional tapi hangat. Maksimal 350 kata.`;
}

function buildDeptPrompt(data) {
  const division = cleanStr(data.division, 100) || '-';
  const avgScore = cleanScore(data.avgScore);
  const headcount = Math.max(1, Math.min(100000, parseInt(data.headcount, 10) || 1));
  return `Berikan insight singkat (2 kalimat dalam Bahasa Indonesia) untuk divisi ${division} dengan AI readiness score ${avgScore}/100 dan ${headcount} karyawan. Fokus pada rekomendasi spesifik.`;
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
  // Authentication + tenant authorization — AI review is an HR feature
  const caller = await resolveTenantCaller(req);
  if (caller.error === 'unauthorized') {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }
  if (caller.error === 'no_employee' || !caller.employee?.company_id) {
    return res.status(403).json({ error: 'Forbidden — no employee record for this tenant' });
  }
  if (!['super_admin', 'hr_admin', 'manager'].includes(caller.employee.role)) {
    return res.status(403).json({ error: 'Forbidden — HR/admin/manager role required' });
  }

  // Rate limiting — IP shared quota + per-user DAILY quota (50/day).
  // Socket address is the key — X-Forwarded-For is not trusted.
  const ip = req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!checkUserRateLimit(`ai:${caller.user.id || caller.user.sub}:${today}`, 50, 24 * 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Daily AI quota exceeded (50/day)' });
  }

  const { action, data } = req.body || {};

  // Legacy free-form prompt is rejected — use the action-based API.
  if (req.body?.prompt !== undefined) {
    return res.status(400).json({ error: 'Free-form prompt removed — use action-based API' });
  }
  if (action !== 'performance_review' && action !== 'dept_insight') {
    return res.status(400).json({ error: 'Invalid action (performance_review | dept_insight)' });
  }

  let prompt;
  try {
    prompt = action === 'performance_review'
      ? buildReviewPrompt(data || {})
      : buildDeptPrompt(data || {});
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid input' });
  }
  const safeMaxTokens = action === 'performance_review' ? 800 : 100;

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
    res.status(500).json({ success: false, error: 'Gagal memproses AI review. Coba lagi.' });
  }
}
