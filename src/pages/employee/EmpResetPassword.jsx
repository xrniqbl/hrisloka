import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

const pwRules = [
  { test: p => p.length >= 8,       label: 'Min 8 karakter' },
  { test: p => /[A-Z]/.test(p),     label: 'Huruf kapital' },
  { test: p => /[0-9]/.test(p),     label: 'Angka' },
  { test: p => /[!@#$%^&*]/.test(p), label: 'Karakter spesial' },
];

/**
 * EmpResetPassword — handles the password reset flow for PWA employees.
 * This page is reached via the "reset password" email link from Supabase.
 * Supabase passes the session in the URL hash (#access_token=...).
 */
export default function EmpResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | success | error | invalid
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  const pwStrength = pwRules.filter(r => r.test(newPassword)).length;
  const isPasswordValid = pwStrength >= 3 && newPassword.length >= 8;

  // Supabase sends the recovery session via URL hash (#access_token=...).
  // We need to detect the SIGNED_IN + PASSWORD_RECOVERY event to confirm.
  useEffect(() => {
    // Check if we came from a recovery link
    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery') || hash.includes('access_token');

    if (!isRecovery) {
      setStatus('invalid');
      return;
    }

    // Listen for auth state to confirm recovery session is valid
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    // Also try getting current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    if (newPassword !== confirmPassword) {
      setErrorMsg('Password tidak cocok.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setErrorMsg('Gagal mengubah password: ' + error.message);
      setStatus('error');
    } else {
      setStatus('success');
      // Sign out and redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/app/login', { replace: true });
      }, 3000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #f0f4ff)',
      padding: '24px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,71,171,0.12),transparent)', top: -100, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.1),transparent)', bottom: 80, left: -60 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" style={{ height: 36, objectFit: 'contain', maxWidth: '100%' }} />
        </div>

        <div style={{
          background: 'var(--surface, #fff)', borderRadius: 24,
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,71,171,0.1), 0 4px 16px rgba(0,0,0,0.06)',
          border: '1px solid var(--border, #e5e7eb)',
        }}>

          {/* ── INVALID LINK ── */}
          {status === 'invalid' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Link Tidak Valid</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
                Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru dari halaman login.
              </p>
              <button
                onClick={() => navigate('/app/login')}
                style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#0047AB,#2563eb)', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Kembali ke Login
              </button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Password Berhasil Diubah!</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Password Anda telah diperbarui. Anda akan diarahkan ke halaman login dalam 3 detik...
              </p>
            </div>
          )}

          {/* ── RESET FORM ── */}
          {(status === 'idle' || status === 'error') && (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,71,171,0.15), rgba(37,99,235,0.1))', border: '1.5px solid rgba(0,71,171,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Buat Password Baru</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Masukkan password baru untuk akun Anda</p>
              </div>

              {/* Session loading warning */}
              {!sessionReady && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'rgba(245,158,11,0.08)', color: '#92400E', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13 }}>
                  ⏳ Memverifikasi link reset... Mohon tunggu.
                </div>
              )}

              {/* Error message */}
              {errorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13 }}>
                  ❌ {errorMsg}
                </div>
              )}

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* New Password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password Baru *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
                    <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min 8 karakter"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      disabled={!sessionReady}
                      style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                      <EyeIcon open={showPass} />
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {newPassword && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pwStrength * 25}%`, background: pwStrength <= 1 ? '#ef4444' : pwStrength <= 2 ? '#f59e0b' : pwStrength <= 3 ? '#3b82f6' : '#22c55e', transition: 'all 0.3s', borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {pwRules.map((r, i) => (
                          <span key={i} style={{ fontSize: 11, color: r.test(newPassword) ? '#22c55e' : 'var(--muted)', fontWeight: 600 }}>
                            {r.test(newPassword) ? '✓' : '○'} {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Konfirmasi Password *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: `1.5px solid ${confirmPassword && confirmPassword !== newPassword ? '#ef4444' : 'var(--border)'}`, borderRadius: 12, background: 'var(--bg)' }}>
                    <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Ketik ulang password baru"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      disabled={!sessionReady}
                      style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Password tidak cocok</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPasswordValid || newPassword !== confirmPassword || !sessionReady}
                  style={{
                    padding: '14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#0047AB,#2563eb)',
                    color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                    cursor: 'pointer', opacity: loading || !isPasswordValid || newPassword !== confirmPassword || !sessionReady ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Menyimpan...</>
                  ) : '🔐 Simpan Password Baru'}
                </button>
              </form>

              <button
                onClick={() => navigate('/app/login')}
                style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                ← Kembali ke Login
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
