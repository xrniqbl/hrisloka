import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { DEMO_EMAIL, activateDemo } from '../../lib/demoGuard';
import '../../styles/admin.css';

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

  // Already logged in &rarr; check status
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
    if (email.trim().toLowerCase() === DEMO_EMAIL) {
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

    // Prefer auth_user_id (tenant-safe) over email-only lookup
    const { data: { user: loggedIn } } = await supabase.auth.getUser();
    let emp = null;
    if (loggedIn?.id) {
      const { data } = await supabase
        .from('employees')
        .select('account_status, role, company_id')
        .eq('auth_user_id', loggedIn.id)
        .maybeSingle();
      emp = data;
    }
    if (!emp) {
      const { data } = await supabase
        .from('employees')
        .select('account_status, role, company_id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      emp = data;
    }

    // HR / admin should use desktop portal, not employee PWA
    if (emp && ['super_admin', 'hr_admin', 'manager'].includes(emp.role)) {
      navigate('/dashboard');
      setLoading(false);
      return;
    }

    if (emp?.account_status === 'pending_verification') {
      navigate('/app/pending');
    } else if (emp?.account_status === 'rejected') {
      navigate('/app/rejected');
    } else if (!emp?.company_id) {
      setError('Akun belum terhubung ke perusahaan. Hubungi HR atau daftar dengan kode perusahaan.');
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
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-orbs">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="login-content">
        <div className="login-logo-wrap">
          <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="login-logo" />
        </div>

        {/* FORGOT PASSWORD FORM */}
        {forgotMode ? (
          <div className="login-card">
            {/* Icon */}
            <div className="login-card-icon-wrap">
              <div className="login-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#635BFF" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h1 className="login-card-title">Lupa Password</h1>
              <p className="login-card-subtitle">
                Masukkan email akun Anda. Kami akan mengirimkan link untuk reset password.
              </p>
            </div>

            {/* Message */}
            {forgotMsg.text && (
              <div className={`login-msg login-msg-${forgotMsg.type}`}>
                {forgotMsg.type === 'success' ? '✅ ' : '❌ '}{forgotMsg.text}
              </div>
            )}

            {forgotMsg.type !== 'success' && (
              <form onSubmit={handleForgotPassword} className="login-form">
                <div className="login-input-row">
                  <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="login-input-icon">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    type="email"
                    placeholder="Email akun Anda"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="login-btn-primary"
                  style={{ opacity: forgotLoading || !forgotEmail ? 0.7 : 1, cursor: forgotLoading || !forgotEmail ? 'not-allowed' : 'pointer' }}
                >
                  {forgotLoading ? (
                    <><span className="ep-spinner ep-spinner-sm" /> Mengirim...</>
                  ) : 'Kirim Link Reset'}
                </button>
              </form>
            )}

            <button
              onClick={() => { setForgotMode(false); setForgotMsg({ text: '', type: '' }); setForgotEmail(''); }}
              className="login-btn-secondary"
            >
              &larr; Kembali ke Login
            </button>
          </div>
        ) : (
          /* LOGIN FORM */
          <div className="login-card">
            <h1 className="login-card-title">Selamat Datang</h1>
            <p className="login-card-subtitle" style={{ marginBottom: 24 }}>Masuk ke akun karyawan Anda</p>

            {error && (
              <div className="login-msg login-msg-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              {/* Email */}
              <div className="login-input-row">
                <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="login-input-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  placeholder="Email perusahaan"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </div>

              {/* Password */}
              <div className="login-input-row">
                <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="login-input-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="login-input"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="login-eye-btn">
                  <EyeIcon open={showPass} />
                </button>
              </div>

              {/* Forgot password link */}
              <div className="login-forgot-row">
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setForgotEmail(email); }}
                  className="login-forgot-btn"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-btn-primary"
                style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <><span className="ep-spinner ep-spinner-sm" /> Masuk...</>
                ) : 'Masuk'}
              </button>
            </form>

            <div className="login-register-hint">
              Belum punya akun?{' '}
              <Link to="/app/register" className="login-register-link">
                Daftar Sekarang
              </Link>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="login-footer">
          Dengan masuk, Anda menyetujui{' '}
          <span className="login-footer-link">Kebijakan Privasi</span> HRIS Loka
        </p>
      </div>
    </div>
  );
}
