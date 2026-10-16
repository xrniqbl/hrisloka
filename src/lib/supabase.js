import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingEnv = !supabaseUrl || !supabaseAnonKey;

if (!import.meta.env.TEST && missingEnv) {
  // Jangan throw saat import: throw di sini terjadi sebelum ErrorBoundary naik
  // → layar putih total tanpa pesan. Sebagai gantinya tampilkan overlay fatal
  // yang jelas agar tidak dikira bug aplikasi.
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add both variables to your .env file before starting the app.',
  );
  if (typeof document !== 'undefined') {
    const showFatal = () => {
      if (document.getElementById('env-fatal')) return;
      const el = document.createElement('div');
      el.id = 'env-fatal';
      el.style.cssText =
        'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f1f5f9;font-family:system-ui;padding:24px;text-align:center';
      el.innerHTML =
        '<div style="max-width:520px"><h1 style="font-size:20px;margin-bottom:12px">Konfigurasi belum lengkap</h1>' +
        '<p style="font-size:14px;color:#94a3b8">VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. Salin .env.example menjadi .env lalu isi nilainya, kemudian restart dev server.</p></div>';
      document.body.appendChild(el);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showFatal, { once: true });
    } else {
      showFatal();
    }
  }
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost',
  supabaseAnonKey || 'test-anon-key',
);

// Fail-fast in production builds: a misbuilt prod bundle must never silently
// talk to localhost. The fatal overlay above already covers dev; this throws
// only when a production bundle somehow ships without env.
if (missingEnv && typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
  throw new Error(
    '[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in production build.',
  );
}

export const supabaseConfigError = missingEnv
  ? 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum dikonfigurasi.'
  : null;
