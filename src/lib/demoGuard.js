/**
 * demoGuard.js
 * Utilitas untuk deteksi dan pembatasan mode demo.
 *
 * Demo credentials: Dikelola secara privat oleh admin.
 * - Login tidak memerlukan akun Supabase nyata
 * - Semua aksi write (tambah/edit/hapus) diblokir
 * - Data yang ditampilkan adalah data dummy read-only
 */

// Credentials dibaca dari env vars agar tidak terekspos di production bundle.
// Tambahkan VITE_DEMO_EMAIL dan VITE_DEMO_PASSWORD di .env
export const DEMO_EMAIL    = import.meta.env.VITE_DEMO_EMAIL    ?? 'demo@hrisloka.com';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? '';
export const DEMO_FLAG_KEY = 'hrisync_demo_mode';

/** Aktifkan mode demo di sessionStorage */
export function activateDemo() {
  sessionStorage.setItem(DEMO_FLAG_KEY, '1');
}

/** Nonaktifkan mode demo */
export function deactivateDemo() {
  sessionStorage.removeItem(DEMO_FLAG_KEY);
}

/** Cek apakah saat ini sedang dalam mode demo */
export function isDemoMode() {
  return sessionStorage.getItem(DEMO_FLAG_KEY) === '1';
}

/**
 * Guard untuk aksi write.
 * Gunakan ini menggantikan handler normal untuk tombol tambah/edit/hapus.
 *
 * @param {Function} originalHandler - handler asli yang ingin dijalankan
 * @returns {Function} - handler baru yang diblokir jika demo mode aktif
 *
 * Contoh:
 *   onClick={demoBlock(() => handleAdd())}
 */
export function demoBlock(originalHandler) {
  return (e) => {
    if (isDemoMode()) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      showDemoToast();
      return;
    }
    return originalHandler?.(e);
  };
}

/** Tampilkan notifikasi mode demo */
export function showDemoToast() {
  // Hindari duplikat toast
  if (document.getElementById('demo-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'demo-toast';
  toast.innerHTML = `
    <span style="font-size:18px">🔒</span>
    <div>
      <strong style="display:block;font-size:13px;margin-bottom:2px">Mode Demo — Akses Read-Only</strong>
      <span style="font-size:12px;opacity:0.85">Fitur ini tidak tersedia dalam mode demo.</span>
    </div>
  `;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '28px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
    color: '#fff',
    padding: '14px 20px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    zIndex: '99999',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: '13px',
    border: '1px solid rgba(255,255,255,0.1)',
    opacity: '0',
    transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)',
    minWidth: '280px',
    maxWidth: '360px',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}
