/**
 * /api/banks.js — VPS API handler (server/index.js)
 * Returns available Indonesian bank list via api.co.id
 * Bank API key stays server-side (process.env.BANK_VALIDATION_API_KEY)
 */
import { applyCors } from './_shared/cors.js';
import { enforceJsonBodyLimit } from './_shared/securityHeaders.js';


// Simple in-memory rate limit: max 30 req/min per IP.
// NOTE: in-memory tidak efektif di serverless multi-instance — lapisan utama
// adalah cache server-side di bawah (upstream hanya dipanggil 1x/24 jam),
// sehingga kuota berbayar tidak bisa disedot publik.
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

// Cache server-side: daftar bank jarang berubah — upstream dipanggil maksimal
// 1x per 24 jam per instance (hemat kuota berbayar walau endpoint publik).
// SHORT-TTL NOTE: in-memory cache is per serverless instance, so cold starts
// each fetch upstream once — fan-out is bounded by the 24h TTL (not per
// request), and failures below use a 5-min negative cache to avoid retry
// storms draining paid quota. No new infra (no shared store) by design.
let bankCache = { data: null, fetchedAt: 0 };
const BANK_CACHE_TTL = 24 * 60 * 60 * 1000;
// Negative cache: suppress upstream retry for 5 min after a failure.
let bankFailureAt = 0;
const BANK_FAILURE_TTL = 5 * 60 * 1000;

export default async function handler(req, res) {
  const originOk = applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Browser requests must come from an allowlisted origin — the return value
  // was previously ignored, so disallowed origins were served anyway.
  if (req.headers.origin && !originOk) {
    return res.status(403).json({ is_success: false, message: 'Origin not allowed' });
  }
  // Reject oversized bodies even on GET (defensive; matches express 1mb limit)
  if (!enforceJsonBodyLimit(req, res)) return;
  // Rate limiting (socket address is the key — X-Forwarded-For is not trusted)
  const ip = req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ is_success: false, message: 'Too many requests. Try again later.' });
  }

  try {
    // Sajikan dari cache bila masih segar (tanpa menyentuh kuota upstream)
    if (bankCache.data && Date.now() - bankCache.fetchedAt < BANK_CACHE_TTL) {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.status(200).json({ is_success: true, data: bankCache.data, cached: true });
    }
    // Negative cache: recent upstream failure → serve stale cache or 502
    // without re-hitting paid quota.
    if (Date.now() - bankFailureAt < BANK_FAILURE_TTL) {
      if (bankCache.data) {
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
        return res.status(200).json({ is_success: true, data: bankCache.data, cached: true });
      }
      return res.status(502).json({ is_success: false, message: 'Bank service unavailable' });
    }

    const apiKey = process.env.BANK_VALIDATION_API_KEY || '';
    if (!apiKey) {
      return res.status(503).json({ is_success: false, message: 'Bank service not configured' });
    }
    const response = await fetch('https://use.api.co.id/validation/bank/available', {
      method: 'GET',
      headers: { 'x-api-co-id': apiKey },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      return res.status(502).json({ is_success: false, message: 'Bank service returned invalid response' });
    }
    if (!response.ok || data?.is_success === false) {
      // Normalisasi: jangan teruskan body/status upstream mentah (bisa bocorkan hint key)
      console.warn('[banks] upstream error:', response.status);
      bankFailureAt = Date.now();
      // Fallback ke cache basi bila ada, agar form tetap fungsi
      if (bankCache.data) {
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
        return res.status(200).json({ is_success: true, data: bankCache.data, cached: true });
      }
      return res.status(502).json({ is_success: false, message: 'Bank service unavailable' });
    }
    const banks = data?.data?.banks || data?.data || [];
    bankCache = { data: banks, fetchedAt: Date.now() };
    // Cache for 1 hour — bank list rarely changes
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).json({ is_success: true, data: banks });
  } catch {
    bankFailureAt = Date.now();
    res.status(500).json({ is_success: false, message: 'Bank service unavailable' });
  }
}
