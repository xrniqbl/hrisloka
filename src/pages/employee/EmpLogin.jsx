import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { DEMO_EMAIL, DEMO_PASSWORD, activateDemo, isDemoMode } from '../../lib/demoGuard';
import './EmpLogin.css';

function IconMail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function EmpLogin() {
  const { user, employee, loading: authLoading, signInWithPassword, signInWithGoogle, setIsDemo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });

  const enterDemo = () => {
    setDemoLoading(true);
    activateDemo();
    setIsDemo(true);
    window.location.replace('/app/home');
  };

  if (isDemoMode()) {
    return <Navigate to="/app/home" replace />;
  }

  if (!authLoading && user) {
    const status = employee?.account_status;
    if (status === 'pending_verification') return <Navigate to="/app/pending" replace />;
    if (status === 'rejected') return <Navigate to="/app/rejected" replace />;
    return <Navigate to="/app/home" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    if (email.trim().toLowerCase() === DEMO_EMAIL) {
      enterDemo();
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

    if (remember) {
      try { localStorage.setItem('hrisync_login_time', Date.now().toString()); } catch { /* ignore */ }
    }

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

    if (emp && ['super_admin', 'hr_admin', 'manager'].includes(emp.role)) {
      navigate('/dashboard');
      setLoading(false);
      return;
    }

    if (emp?.account_status === 'pending_verification') {
      navigate('/app/pending', { replace: true });
    } else if (emp?.account_status === 'rejected') {
      navigate('/app/rejected', { replace: true });
    } else if (!emp) {
      setError('Data karyawan tidak ditemukan. Daftar dengan kode perusahaan atau hubungi HR.');
    } else if (!emp?.company_id) {
      setError('Akun belum terhubung ke perusahaan. Hubungi HR atau daftar dengan kode perusahaan.');
    } else if (emp.account_status && emp.account_status !== 'active' && emp.account_status !== 'approved') {
      // Treat unknown non-active statuses carefully
      if (String(emp.account_status).includes('pending')) {
        navigate('/app/pending', { replace: true });
      } else {
        setError(`Status akun: ${emp.account_status}. Hubungi HR.`);
      }
    } else {
      try { sessionStorage.setItem('hrisloka_splash_seen', '1'); } catch { /* */ }
      navigate('/app/home', { replace: true });
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      // Prefer PWA home after OAuth for employee flow
      localStorage.setItem('hrisync_last_path', '/app/home');
      const { error: gErr } = await signInWithGoogle();
      if (gErr) {
        setError(gErr.message || 'Gagal masuk dengan Google.');
        setGoogleLoading(false);
      }
      // On success browser redirects away
    } catch (err) {
      setError(err?.message || 'Gagal masuk dengan Google.');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg({ text: '', type: '' });

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: window.location.origin + '/app/reset-password',
    });

    setForgotLoading(false);
    if (resetErr) {
      setForgotMsg({ text: 'Gagal mengirim email: ' + resetErr.message, type: 'error' });
    } else {
      setForgotMsg({
        text: 'Link reset password telah dikirim ke email Anda. Cek inbox atau folder spam.',
        type: 'success',
      });
    }
  };

  const busy = loading || googleLoading || demoLoading;

  return (
    <div className="emp-login">
      <div className="emp-login__blob emp-login__blob--tl" aria-hidden />
      <div className="emp-login__blob emp-login__blob--br" aria-hidden />

      <main className="emp-login__main">
        <header className="emp-login__header">
          <Link
            to="/app/welcome"
            style={{
              display: 'inline-block',
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 600,
              color: '#493ee5',
              textDecoration: 'none',
            }}
          >
            ← Kembali
          </Link>
          <div className="emp-login__brand-icon" aria-hidden>
            <img src="/landing/hrislokalogo.jpeg" alt="" />
          </div>
          <h1 className="emp-login__title">HRIS Loka</h1>
          <p className="emp-login__subtitle">
            {forgotMode
              ? 'Reset password akun karyawan Anda'
              : 'Masuk ke workspace karyawan Anda'}
          </p>
        </header>

        <div className="emp-login__card">
          <div className="emp-login__card-edge" aria-hidden />

          {forgotMode ? (
            <form className="emp-login__form" onSubmit={handleForgotPassword} noValidate>
              {forgotMsg.text && (
                <div
                  className={`emp-login__alert emp-login__alert--${forgotMsg.type === 'success' ? 'success' : 'error'}`}
                  role="status"
                >
                  {forgotMsg.text}
                </div>
              )}

              {forgotMsg.type !== 'success' && (
                <>
                  <div className="emp-login__field">
                    <label className="emp-login__label" htmlFor="forgot-email">Email Address</label>
                    <div className="emp-login__input-wrap">
                      <span className="emp-login__input-icon"><IconMail /></span>
                      <input
                        id="forgot-email"
                        className="emp-login__input"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="emp-login__btn-primary"
                    disabled={forgotLoading || !forgotEmail}
                  >
                    {forgotLoading ? (
                      <><span className="emp-login__spinner" /> Mengirim...</>
                    ) : (
                      'Kirim Link Reset'
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                className="emp-login__link"
                style={{ alignSelf: 'center', marginTop: 4 }}
                onClick={() => {
                  setForgotMode(false);
                  setForgotMsg({ text: '', type: '' });
                  setForgotEmail('');
                }}
              >
                ← Kembali ke Login
              </button>
            </form>
          ) : (
            <>
              <form className="emp-login__form" onSubmit={handleLogin} noValidate>
                {error && (
                  <div className="emp-login__alert emp-login__alert--error" role="alert">
                    {error}
                  </div>
                )}

                <div className="emp-login__field">
                  <label className="emp-login__label" htmlFor="email">Email Address</label>
                  <div className="emp-login__input-wrap">
                    <span className="emp-login__input-icon"><IconMail /></span>
                    <input
                      id="email"
                      className="emp-login__input"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="emp-login__field">
                  <label className="emp-login__label" htmlFor="password">Password</label>
                  <div className="emp-login__input-wrap">
                    <span className="emp-login__input-icon"><IconLock /></span>
                    <input
                      id="password"
                      className="emp-login__input emp-login__input--pass"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="emp-login__eye"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      <IconEye open={showPass} />
                    </button>
                  </div>
                </div>

                <div className="emp-login__row">
                  <div className="emp-login__remember">
                    <input
                      id="remember-me"
                      className="emp-login__checkbox"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <label className="emp-login__remember-label" htmlFor="remember-me">
                      Ingat saya
                    </label>
                  </div>
                  <button
                    type="button"
                    className="emp-login__link"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotEmail(email);
                      setError('');
                    }}
                  >
                    Lupa password?
                  </button>
                </div>

                <button type="submit" className="emp-login__btn-primary" disabled={busy}>
                  {loading ? (
                    <><span className="emp-login__spinner" /> Masuk...</>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="emp-login__divider">
                <span>Atau lanjutkan dengan</span>
              </div>

              <div className="emp-login__sso">
                <button
                  type="button"
                  className="emp-login__btn-sso"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <GoogleMark />
                  {googleLoading ? 'Mengalihkan…' : 'Google'}
                </button>
              </div>

              <div className="emp-login__meta">
                Belum punya akun?{' '}
                <Link to="/app/register">Daftar Sekarang</Link>
              </div>

              <button
                type="button"
                className="emp-login__demo"
                onClick={enterDemo}
                disabled={busy}
              >
                {demoLoading ? 'Membuka demo…' : 'Masuk Demo PWA'}
              </button>
              <p className="emp-login__demo-hint">
                {DEMO_EMAIL} · {DEMO_PASSWORD} · read-only
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="emp-login__footer">
        <Link to="/privacy">Butuh bantuan? Hubungi HR / Support</Link>
      </footer>
    </div>
  );
}
