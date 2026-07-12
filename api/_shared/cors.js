/**
 * Shared CORS allowlist for API handlers (VPS + any host).
 * Extra origins: ALLOWED_ORIGINS or SITE_URL (comma-separated).
 */

const DEFAULT_ORIGINS = [
  'https://hrisloka.id',
  'https://www.hrisloka.id',
  'https://hrisloka.com',
  'https://www.hrisloka.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export function getAllowedOrigins() {
  const extra = `${process.env.ALLOWED_ORIGINS || ''},${process.env.SITE_URL || ''}`
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

/**
 * Apply CORS headers. Returns true if preflight was handled (caller should return).
 */
export function applyCors(req, res, { methods = 'GET, POST, OPTIONS', headers = 'Content-Type, Authorization' } = {}) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // same-origin / server-to-server — no ACAO needed
  } else {
    // Reflect nothing sensitive; still set a default for simple tools
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
  res.setHeader('Vary', 'Origin');
}
