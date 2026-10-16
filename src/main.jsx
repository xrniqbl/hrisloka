import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './astryx-theme.css';
import { hrisNeutralTheme } from './themes/astryx-theme/hris-neutral';
import { Theme } from '@astryxdesign/core';
import './index.css'
import App from './App.jsx'
import './lib/autoTranslate.js'
import { initSentry } from './lib/sentry.js'
import { safeGetItem, safeSetItem, safeRemoveItem } from './lib/safeStorage.js'
import { requestPersistentStorage } from './lib/backgroundSync.js'

// Error tracking first (before React mount)
initSentry()

// Persistent storage grant — keeps SW caches + IndexedDB from eviction.
// Best-effort, non-blocking: must never delay first paint.
if (typeof window !== 'undefined') {
  requestPersistentStorage().catch(() => {});
}

// Listen for SW update events (register-sw.js dispatches these).
// UpdatePrompt.jsx consumes them; this listener is a no-op fallback log.
if (typeof window !== 'undefined') {
  window.addEventListener('sw:update-available', () => {
    if (import.meta.env.DEV) console.log('[App] SW update available');
  });
  window.addEventListener('sw:updated', () => {
    if (import.meta.env.DEV) console.log('[App] SW updated');
  });
}

// Apply saved theme before first paint (read both old + new key for migration)
// Storage access is wrapped — blocked storage (Safari private mode) must not
// crash the app before React mounts.
const savedTheme = safeGetItem('hrisync_theme') || safeGetItem('KiniKerja_theme') || safeGetItem('HRIS Loka_theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  // Migrate old key to new key
  safeSetItem('hrisync_theme', savedTheme);
  safeRemoveItem('KiniKerja_theme');
  safeRemoveItem('HRIS Loka_theme');
}

// Migrate locale key: hrisync_lang / KiniKerja_locale / HRIS Loka_locale (legacy) → hrisync_locale
const savedLocale = safeGetItem('hrisync_locale')
  || safeGetItem('KiniKerja_locale')
  || safeGetItem('HRIS Loka_locale')
  || safeGetItem('hrisync_lang');
if (savedLocale) {
  safeSetItem('hrisync_locale', savedLocale);
  safeSetItem('hrisync_lang', savedLocale);
  safeRemoveItem('KiniKerja_locale');
  safeRemoveItem('HRIS Loka_locale');
}

// Apply initial data-lang to <html> before React renders
const initLang = safeGetItem('hrisync_locale') || 'id';
document.documentElement.setAttribute('lang', initLang);
document.documentElement.setAttribute('data-lang', initLang);

// Strip stray # from first paint (e.g. /assets# leftover)
try {
  if (window.location.hash && !window.location.hash.startsWith('#access_token')) {
    // Keep OAuth/supabase hash tokens; remove empty or junk hashes
    const h = window.location.hash;
    if (h === '#' || h === '#/' || !h.includes('access_token') && !h.includes('type=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
} catch { /* ignore */ }

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <Theme theme={hrisNeutralTheme || undefined}>
        <App />
      </Theme>
    </StrictMode>,
  );
}
