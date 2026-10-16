/**
 * Shared security headers for the VPS Express server (server/index.js).
 * Canonical source for production headers — vercel.json was removed
 * (VPS-only deploy); keep this file and deploy/nginx.kinikerja.conf in sync.
 */

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()',
  // COOP: allow-popups agar popup Midtrans Snap (window.opener callback
  // onSuccess/onPending) tidak terputus. Tetap blokir cross-origin embedding via CORP.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-DNS-Prefetch-Control': 'on',
  'X-Permitted-Cross-Domain-Policies': 'none',
  // HSTS only meaningful over HTTPS (nginx sets this at the edge)
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/**
 * Build CSP.
 * @param {{ nonce?: string, strictScripts?: boolean }} opts
 * - strictScripts: drop 'unsafe-inline' from script-src (requires no inline scripts in HTML)
 * - nonce: optional CSP nonce for remaining trusted inline (server-rendered)
 */
export function buildContentSecurityPolicy({ nonce = '', strictScripts = true } = {}) {
  // NOTE: no Google Tag Manager / Analytics in script-src or connect-src —
  // no code uses gtag/googletagmanager (grep 2026-10: zero hits in src/,
  // index.html, public/) and web-vitals is NOT installed. If analytics is
  // ever added, re-add https://www.googletagmanager.com + google-analytics
  // here AND in nginx. Sentry IS live (@sentry/react via npm bundle, no CDN
  // script) — sentry ingest hosts kept in connect-src. jsdelivr is unused as
  // a script/CDN source (no jsdelivr imports in src/ or index.html) and was
  // dropped from script-src/connect-src; leaflet marker images + OSM tiles
  // load via img-src https: and connect-src tile.openstreetmap.org.
  const scriptSrc = [
    "'self'",
    // Vite/React runtime may still need unsafe-inline in rare edge cases; prefer strict.
    ...(strictScripts ? [] : ["'unsafe-inline'"]),
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    'https://app.midtrans.com',
    'https://app.sandbox.midtrans.com',
  ].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",
    'upgrade-insecure-requests',
    `script-src ${scriptSrc}`,
    // React / StyleX / Tailwind often inject styles — keep unsafe-inline for styles only
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.fonnte.com https://api.brevo.com https://generativelanguage.googleapis.com https://app.midtrans.com https://app.sandbox.midtrans.com https://api.midtrans.com https://api.sandbox.midtrans.com https://*.sentry.io https://*.ingest.sentry.io https://ipapi.co https://www.emsifa.com https://tile.openstreetmap.org https://cdnjs.cloudflare.com",
    "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://www.youtube.com https://www.openstreetmap.org",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
  ].join('; ');
}

/** Default production CSP (strict scripts, no nonce required if no inline scripts) */
export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy({ strictScripts: true });

export function applySecurityHeaders(res, { csp = true, hsts = true, nonce = '' } = {}) {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => {
    if (!hsts && k === 'Strict-Transport-Security') return;
    res.setHeader(k, v);
  });
  if (csp) {
    res.setHeader(
      'Content-Security-Policy',
      buildContentSecurityPolicy({ nonce, strictScripts: true }),
    );
  }
}

/** Generate CSP nonce in Node (server only). */
export function createCspNonce() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let s = '';
    bytes.forEach((b) => {
      s += String.fromCharCode(b);
    });
    return btoa(s);
  }
  return '';
}

/** Paths that must never be indexed */
export function isPrivateSeoPath(pathname = '') {
  const p = String(pathname).split('?')[0];
  const prefixes = [
    '/app',
    '/dashboard',
    '/founder',
    '/employees',
    '/payroll',
    '/attendance',
    '/approvals',
    '/settings',
    '/audit-trail',
    '/helpdesk',
    '/analytics',
    '/api',
    '/maintenance',
    '/not-registered',
  ];
  return prefixes.some((pre) => p === pre || p.startsWith(`${pre}/`));
}

/**
 * JSON body size guard for api/* handlers (VPS: express 1mb limit).
 * Rejects Content-Length > 1_000_000 with 413 before JSON parsing / auth.
 * Also measures the already-parsed req.body (covers chunked requests with no
 * Content-Length).
 * Returns true when the request may proceed, false when it already responded.
 */
export const MAX_JSON_BODY_BYTES = 1_000_000;

export function enforceJsonBodyLimit(req, res, maxBytes = MAX_JSON_BODY_BYTES) {
  const raw = req.headers['content-length'];
  if (raw !== undefined) {
    const len = Number(raw);
    if (Number.isFinite(len) && len > maxBytes) {
      res.status(413).json({ error: 'Payload too large' });
      return false;
    }
  }
  // Chunked tanpa Content-Length kini tertutup: ukur byte aktual body yang
  // sudah terparse (object → JSON.stringify, string → .length, Buffer → byteLength).
  const body = req.body;
  if (body !== undefined && body !== null) {
    let size = 0;
    try {
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
        size = body.byteLength ?? body.length;
      } else if (typeof body === 'string') {
        size = body.length;
      } else if (typeof body === 'object') {
        size = JSON.stringify(body).length;
      }
    } catch {
      size = 0;
    }
    if (size > maxBytes) {
      res.status(413).json({ error: 'Payload too large' });
      return false;
    }
  }
  return true;
}
