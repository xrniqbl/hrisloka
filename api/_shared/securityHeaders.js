/**
 * Shared security headers for Express (VPS) and optional API responses.
 * Keep in sync with vercel.json production headers.
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
  // HSTS only meaningful over HTTPS (nginx/Vercel usually already set this)
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/**
 * Build CSP.
 * @param {{ nonce?: string, strictScripts?: boolean }} opts
 * - strictScripts: drop 'unsafe-inline' from script-src (requires no inline scripts in HTML)
 * - nonce: optional CSP nonce for remaining trusted inline (server-rendered)
 */
export function buildContentSecurityPolicy({ nonce = '', strictScripts = true } = {}) {
  const scriptSrc = [
    "'self'",
    // Vite/React runtime may still need unsafe-inline in rare edge cases; prefer strict.
    ...(strictScripts ? [] : ["'unsafe-inline'"]),
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    'https://www.googletagmanager.com',
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
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.fonnte.com https://api.brevo.com https://generativelanguage.googleapis.com https://app.midtrans.com https://app.sandbox.midtrans.com https://api.midtrans.com https://api.sandbox.midtrans.com https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",
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
