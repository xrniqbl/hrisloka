import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { DEMO_EMAIL, DEMO_PASSWORD, activateDemo } from '../../lib/demoGuard';

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

export default function EmpLogin() {
  const { user, employee, loading: authLoading, signInWithPassword, setIsDemo } = useAuth();
  const navigate = useNavigate();

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });

  // Already logged in → check status
  if (!authLoading && user) {
    const status = employee?.account_status;
    if (status === 'pending_verification') return <Navigate to="/app/pending" replace />;
    if (status === 'rejected') return <Navigate to="/app/rejected" replace />;
    return <Navigate to="/app/home" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    // Demo mode intercept
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      activateDemo();
      setIsDemo(true);
      window.location.replace('/app/home'); // hard nav - bypass EmployeeLayout guard race condition
      return;
    }

    setLoading(true);
    setError('');

    const { error: authErr } = await signInWithPassword(email, password);
    if (authErr) {
      setError('Email atau password salah. Silakan coba lagi.');
      setLoading(false);
      return;
    }

    // Fetch account status
    const { data: emp } = await supabase
      .from('employees')
      .select('account_status, role')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (emp?.account_status === 'pending_verification') {
      navigate('/app/pending');
    } else if (emp?.account_status === 'rejected') {
      navigate('/app/rejected');
    } else {
      navigate('/app/home');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg({ text: '', type: '' });

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: window.location.origin + '/app/reset-password',
    });

    setForgotLoading(false);
    if (error) {
      setForgotMsg({ text: 'Gagal mengirim email: ' + error.message, type: 'error' });
    } else {
      setForgotMsg({
        text: 'Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.',
        type: 'success',
      });
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

        {/* ── FORGOT PASSWORD FORM ── */}
        {forgotMode ? (
          <div style={{
            background: 'var(--surface, #fff)', borderRadius: 24,
            padding: '32px 28px',
            boxShadow: '0 20px 60px rgba(0,71,171,0.1), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid var(--border, #e5e7eb)',
          }}>
            {/* Icon */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(0,71,171,0.15), rgba(37,99,235,0.1))',
                border: '1.5px solid rgba(0,71,171,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Lupa Password</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                Masukkan email akun Anda. Kami akan mengirimkan link untuk reset password.
              </p>
            </div>

            {/* Message */}
            {forgotMsg.text && (
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 16,
                background: forgotMsg.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(220,38,38,0.08)',
                color: forgotMsg.type === 'success' ? '#16a34a' : '#DC2626',
                border: `1px solid ${forgotMsg.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(220,38,38,0.2)'}`,
                fontSize: 13, fontWeight: 500, lineHeight: 1.5,
              }}>
                {forgotMsg.type === 'success' ? '✅ ' : '❌ '}{forgotMsg.text}
              </div>
            )}

            {forgotMsg.type !== 'success' && (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
                  <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    type="email"
                    placeholder="Email akun Anda"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  style={{
                    padding: '14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#0047AB,#2563eb)',
                    color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                    cursor: forgotLoading || !forgotEmail ? 'not-allowed' : 'pointer',
                    opacity: forgotLoading || !forgotEmail ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {forgotLoading ? (
                    <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Mengirim...</>
                  ) : 'Kirim Link Reset'}
                </button>
              </form>
            )}

            <button
              onClick={() => { setForgotMode(false); setForgotMsg({ text: '', type: '' }); setForgotEmail(''); }}
              style={{
                marginTop: 16, width: '100%', padding: '12px', borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'transparent',
                color: 'var(--muted)', fontFamily: 'inherit', fontWeight: 600,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              ← Kembali ke Login
            </button>
          </div>
        ) : (
          /* ── LOGIN FORM ── */
          <div style={{
            background: 'var(--surface, #fff)', borderRadius: 24,
            padding: '32px 28px',
            boxShadow: '0 20px 60px rgba(0,71,171,0.1), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid var(--border, #e5e7eb)',
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Selamat Datang</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Masuk ke akun karyawan Anda</p>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(220,38,38,0.08)', color: '#DC2626',
                border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
                <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  placeholder="Email perusahaan"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
                <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                  <EyeIcon open={showPass} />
                </button>
              </div>

              {/* Forgot password link */}
              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setForgotEmail(email); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0047AB', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg,#0047AB,#2563eb)',
                  color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(0,71,171,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Masuk...</>
                ) : 'Masuk'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
              Belum punya akun?{' '}
              <Link to="/app/register" style={{ color: '#0047AB', fontWeight: 700, textDecoration: 'none' }}>
                Daftar Sekarang
              </Link>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>
          Dengan masuk, Anda menyetujui{' '}
          <span style={{ color: '#0047AB' }}>Kebijakan Privasi</span> HRIS Loka
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}