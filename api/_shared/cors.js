/**
 * Shared CORS allowlist for API handlers (VPS + any host).
 * Extra origins: ALLOWED_ORIGINS or SITE_URL (comma-separated).
 *
 * Security: never reflect arbitrary Origin. Disallowed origins get no ACAO.
 *
 * NOTE on rate limiting: the in-memory Map used by individual api/*.js
 * handlers is per-process. On the single-node VPS deployment (PM2) it works
 * as a basic throttle; it is not a shared store across processes/hosts.
 * See docs/ENVIRONMENT.md ("RATE LIMITING").
 */

const PROD_ORIGINS = [
  'https://kinikerja.id',
  'https://www.kinikerja.id',
  'https://kinikerja.com',
  'https://www.kinikerja.com',
];

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function defaultOrigins() {
  // Localhost hanya di non-production — di production origin tepercaya
  // dibatasi domain + ALLOWED_ORIGINS/SITE_URL.
  if (process.env.NODE_ENV === 'production') return PROD_ORIGINS;
  return [...PROD_ORIGINS, ...DEV_ORIGINS];
}

function isValidOriginValue(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  // Must be a bare http/https origin (scheme + host, optional port). Reject
  // wildcards, paths, query strings, and non-http schemes.
  if (s === '*' || s.includes('*')) return false;
  if (!/^https?:\/\/[^/]+$/.test(s)) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.pathname !== '/' || u.search || u.hash) return false;
    return true;
  } catch {
    return false;
  }
}

export function getAllowedOrigins() {
  const extra = `${process.env.ALLOWED_ORIGINS || ''},${process.env.SITE_URL || ''}`
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter((s) => s && isValidOriginValue(s));
  return [...new Set([...defaultOrigins(), ...extra])];
}

/**
 * Apply CORS headers. Returns true if origin is allowed (or no Origin).
 * Callers may reject disallowed browser origins with 403 if desired.
 * Access-Control-Allow-Methods/Headers/Max-Age are only emitted for
 * allowed origins (or non-browser requests without Origin) — disallowed
 * origins get no CORS affordances at all.
 */
export function applyCors(
  req,
  res,
  {
    methods = 'GET, POST, OPTIONS',
    headers = 'Content-Type, Authorization',
    credentials = false,
  } = {},
) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();

  if (origin) {
    if (allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', methods);
      res.setHeader('Access-Control-Allow-Headers', headers);
      res.setHeader('Access-Control-Max-Age', '600');
    }
    // Disallowed Origin: do NOT set ACAO (browser blocks). Do not echo origin.
  } else {
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Max-Age', '600');
  }

  res.setHeader('Vary', 'Origin');

  return !origin || allowed.includes(origin);
}

/** Reject browser requests from unknown origins (optional hard fail). */
export function rejectDisallowedOrigin(req, res) {
  const origin = req.headers.origin;
  if (!origin) return false;
  if (getAllowedOrigins().includes(origin)) return false;
  res.status(403).json({ error: 'Origin not allowed' });
  return true;
}
