/**
 * Sentry error tracking — optional via VITE_SENTRY_DSN.
 * Install: @sentry/react (already in package.json)
 */
import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !String(dsn).trim()) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No VITE_SENTRY_DSN — error tracking disabled');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: String(dsn).trim(),
      environment: import.meta.env.MODE || (import.meta.env.PROD ? 'production' : 'development'),
      release: import.meta.env.VITE_APP_VERSION || 'dev',
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'NetworkError when attempting to fetch resource',
        'Non-Error promise rejection captured',
        'Load failed',
        'Failed to fetch',
      ],
      allowUrls: [
        /kinikerja\.com/,
        /kinikerja\.id/,
        /localhost/,
        /127\.0\.0\.1/,
      ],
      beforeSend(event) {
        // Drop extension noise
        const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
        if (frames.some((f) => /chrome-extension:|moz-extension:/.test(f.filename || ''))) {
          return null;
        }
        // Scrub tokens/PII from URLs and headers before upload.
        try {
          const scrubUrl = (u) => typeof u === 'string'
            ? u
              .replace(/([?&](access_token|id_token|refresh_token|token|code|secret)[^&]*)/gi, '$1=[REDACTED]')
              .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/=]+/gi, '$1[REDACTED]')
            : u;
          if (event.request?.url) event.request.url = scrubUrl(event.request.url);
          const hdrs = event.request?.headers;
          if (hdrs) {
            for (const k of Object.keys(hdrs)) {
              if (/authorization|cookie|token|secret|api[-_]?key/i.test(k)) hdrs[k] = '[REDACTED]';
            }
          }
          for (const b of event.breadcrumbs || []) {
            if (b.data?.url) b.data.url = scrubUrl(b.data.url);
          }
        } catch { /* scrub is best-effort */ }
        return event;
      },
    });

    // Expose for ErrorBoundary fallback
    if (typeof window !== 'undefined') {
      window.Sentry = Sentry;
    }
    initialized = true;
    if (import.meta.env.DEV) console.log('[Sentry] initialized');
  } catch (err) {
    console.warn('[Sentry] init failed:', err?.message || err);
  }
}

export function captureException(error, context = {}) {
  try {
    if (!initialized) return;
    Sentry.captureException(error, context);
  } catch {
    /* ignore */
  }
}

export function captureMessage(message, level = 'info') {
  try {
    if (!initialized) return;
    Sentry.captureMessage(message, level);
  } catch {
    /* ignore */
  }
}

export { Sentry };
export default { initSentry, captureException, captureMessage };
