/**
 * safeUrl — scheme validation for user-supplied URLs rendered into href/src.
 * React JSX escaping does NOT neutralize `javascript:` hrefs — only scheme
 * validation does. Mirrors the NotificationCenter guard.
 *
 * Returns a safe URL string, or null when the input must not be linked.
 * Allowed: http(s) absolute, relative (/...), tel:, mailto:.
 * Rejected: javascript:, data:, vbscript:, protocol-relative (//evil).
 */

const SAFE_SCHEMES = /^(https?|tel|mailto):/i;
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function safeExternalUrl(raw) {
  if (raw == null) return null;
  const url = String(raw).trim();
  if (!url || url === '#') return null;
  if (url.startsWith('//')) return null;
  if (HAS_SCHEME.test(url)) {
    return SAFE_SCHEMES.test(url) ? url : null;
  }
  if (url.startsWith('/')) {
    const firstSlash = url.indexOf('/', 1);
    const head = firstSlash === -1 ? url : url.slice(0, firstSlash);
    if (head.includes(':')) return null;
    return url;
  }
  return null;
}

/** True when the URL is safe to render as <a href>. */
export function isSafeExternalUrl(raw) {
  return safeExternalUrl(raw) !== null;
}
