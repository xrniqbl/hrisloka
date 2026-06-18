import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRole, isFounder } from '../lib/rbac';
import { supabase } from '../lib/supabase';
import { updateSEOTags } from '../lib/seo';
import { DEMO_EMAIL, DEMO_PASSWORD, activateDemo } from '../lib/demoGuard';
import './AuthPage.css';

function GoogleIcon() {
 return (
 <svg viewBox="0 0 24 24" width="18" height="18">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
 </svg>
 );
}

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

export default function AuthPage() {
 const [isSignUp, setIsSignUp] = useState(false);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [fullName, setFullName] = useState('');
 const [forgotMode, setForgotMode] = useState(false);
 const [message, setMessage] = useState({ text: '', type: '' });
 const [loading, setLoading] = useState(false);
 const [showPass, setShowPass] = useState(false);
 const [countdown, setCountdown] = useState(5);
 const [showEmployeeWarning, setShowEmployeeWarning] = useState(false);
 const countdownRef = useRef(null);
 const navigate = useNavigate();
 const { user, employee, isPWA, loading: authLoading, signInWithPassword, resetPassword, signInWithGoogle, signUp, setIsDemo } = useAuth();

 // ── SEO ───────────────────────────────────────────────────────
 useEffect(() => {
  updateSEOTags({ page: 'login' });
 }, []);

 // Countdown timer — only runs when warning is visible
 useEffect(() => {
   if (!showEmployeeWarning) return;
   setCountdown(5);
   countdownRef.current = setInterval(() => {
     setCountdown(c => {
       if (c <= 1) {
         clearInterval(countdownRef.current);
         navigate('/install');
         return 0;
       }
       return c - 1;
     });
   }, 1000);
   return () => clearInterval(countdownRef.current);
 }, [showEmployeeWarning]);

 const passwordRules = [
 { key: 'length', label: 'Min 8 karakter', test: (p) => p.length >= 8 },
 { key: 'upper', label: 'Huruf kapital', test: (p) => /[A-Z]/.test(p) },
 { key: 'number', label: 'Angka', test: (p) => /[0-9]/.test(p) },
 { key: 'special', label: 'Karakter spesial', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(p) },
 ];
 const pwStrength = passwordRules.filter(r => r.test(password)).length;
 const isPasswordValid = pwStrength === 4;

 // Redirect after login — but only if warning is NOT showing
 if (!authLoading && user && !showEmployeeWarning) {
  const founderUser = isFounder(user, employee);
  if (founderUser) {
   // Founder always goes to founder portal
   const savedPath = localStorage.getItem('hrisync_last_path');
   const founderDest = savedPath?.startsWith('/founder') ? savedPath : '/founder/dashboard';
   return <Navigate to={founderDest} replace />;
  }
  const role = getRole(employee);
  const defaultDest = (role === 'employee') || isPWA ? '/app/home' : '/dashboard';
  const savedPath = localStorage.getItem('hrisync_last_path');
  const dest = savedPath || defaultDest;
  return <Navigate to={dest} replace />;
 }

 const handlePasswordLogin = async (e) => {
 e.preventDefault();
 if (!email || !password) return;

 // Demo mode: intercept sebelum Supabase
 if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
   activateDemo();
   setIsDemo(true);
   window.location.replace('/dashboard'); // hard nav
   return;
 }

 setLoading(true);
 setMessage({ text: '', type: '' });
 const { error } = await signInWithPassword(email, password);
 if (error) {
   setMessage({ text: error.message, type: 'error' });
   setLoading(false);
   return;
 }

 // Login berhasil — fetch role karyawan dari database
 const { data: emp } = await supabase
   .from('employees')
   .select('role, division, position')
   .eq('email', email.trim().toLowerCase())
   .maybeSingle();

 // role === 'employee' (atau tidak ada role) dan BUKAN di PWA → tampilkan warning
 const empRole = emp?.role || 'employee';
 const isRegularEmployee = empRole === 'employee';

 if (isRegularEmployee && !isPWA) {
   setShowEmployeeWarning(true);
   setLoading(false);
   return;
 }

  // Admin / HR / Manager / Founder → redirect normal
  const isFounderLogin = email.trim().toLowerCase() === 'hrisloka@gmail.com';
  if (isFounderLogin) {
   navigate('/founder/dashboard');
  } else {
   const savedPath = localStorage.getItem('hrisync_last_path');
   navigate(savedPath || '/dashboard');
  }
  setLoading(false);
 };


 const handleGoogleLogin = async () => {
 const { error } = await signInWithGoogle();
 if (error) setMessage({ text: error.message, type: 'error' });
 };

 const handleForgotPassword = async (e) => {
 e.preventDefault();
 if (!email) return;
 setLoading(true);
 setMessage({ text: '', type: '' });
 const { error } = await resetPassword(email);
 if (error) setMessage({ text: error.message, type: 'error' });
 else setMessage({ text: 'Link reset dikirim! Cek inbox email Anda.', type: 'success' });
 setLoading(false);
 };

 const handleSignUp = async (e) => {
  e.preventDefault();
  if (!email || !password || !fullName || !isPasswordValid) return;
  setLoading(true);
  setMessage({ text: '', type: '' });
  const { error } = await signUp(email, password, { full_name: fullName });
  if (error) {
    setMessage({ text: error.message, type: 'error' });
    setLoading(false);
    return;
  }
  // Signup berhasil — langsung ke checkout (email verifikasi menyusul)
  navigate('/checkout');
  setLoading(false);
  };

 const reset = () => { setMessage({ text: '', type: '' }); setForgotMode(false); setPassword(''); setShowPass(false); };

 return (
 <div className="auth-root">
 {/* Subtle grid bg */}
 <div className="auth-grid-bg" />

 {/* ── EMPLOYEE BROWSER WARNING ── */}
 {showEmployeeWarning && !isPWA && (
 <div style={{
 position: 'fixed', inset: 0, zIndex: 9999,
 background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 padding: 24, animation: 'fadeIn 0.3s ease',
 }}>
 <div style={{
 background: 'var(--auth-card, #fff)',
 borderRadius: 24, padding: 32,
 maxWidth: 420, width: '100%',
 textAlign: 'center',
 boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
 animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)',
 }}>
 {/* Icon */}
 <div style={{
 width: 72, height: 72, borderRadius: '50%',
 background: 'linear-gradient(135deg, #f59e0b, #d97706)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 margin: '0 auto 20px',
 boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
 }}>
 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
 <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
 <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/>
 </svg>
 </div>

 {/* Title */}
 <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#111' }}>
 ⚠️ Gunakan Aplikasi PWA
 </h2>
 <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
 Karyawan wajib mengakses HRIS Loka melalui <strong>aplikasi yang terinstall di HP</strong> (bukan browser biasa).
 <br /><br />
 Ini untuk memastikan keamanan absensi dengan Face ID dan GPS verification.
 </p>

 {/* Countdown */}
 <div style={{
 padding: '10px 20px', background: '#FEF3C7',
 borderRadius: 100, display: 'inline-flex',
 alignItems: 'center', gap: 8,
 color: '#92400E', fontWeight: 700, fontSize: 14,
 marginBottom: 20,
 }}>
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
 <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
 </svg>
 Dialihkan ke halaman install dalam {countdown} detik...
 </div>

 {/* Buttons */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 <button
 onClick={() => { clearInterval(countdownRef.current); navigate('/install'); }}
 style={{
 padding: '14px 24px', borderRadius: 12,
 background: 'linear-gradient(135deg,#0047AB,#2563eb)',
 color: '#fff', border: 'none', cursor: 'pointer',
 fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
 boxShadow: '0 4px 16px rgba(0,71,171,0.35)',
 }}
 >
  Install Aplikasi Sekarang
 </button>
 <button
 onClick={() => { clearInterval(countdownRef.current); setShowEmployeeWarning(false); }}
 style={{
 padding: '12px 24px', borderRadius: 12,
 background: 'transparent', color: '#666',
 border: '1px solid #e5e7eb', cursor: 'pointer',
 fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
 }}
 >
 Saya Admin — Lanjutkan Login
 </button>
 </div>
 </div>
 </div>
 )}

 <div className={`auth-card ${isSignUp ? 'signup-mode' : ''}`}>

 {/* ══ SIGN IN FORM ══ */}
 <div className="auth-panel form-panel signin-panel">
 <div className="auth-panel-inner">
 {/* Logo — light/dark mode aware */}
 <picture>
 <source media="(prefers-color-scheme: dark)" srcSet="/landing/hrislokawhitepanjang.png" />
 <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="auth-logo" />
 </picture>

 {!forgotMode ? (
 <>
 <h2>Selamat Datang</h2>
 <p className="auth-sub">Masuk ke akun HRIS Loka Anda</p>

 {message.text && !isSignUp && (
 <div className={`auth-msg ${message.type}`}>{message.text}</div>
 )}

 <form onSubmit={handlePasswordLogin} className="auth-form">
 <div className="auth-input-group">
 <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
 <input type="email" placeholder="Email perusahaan" value={email} onChange={e => setEmail(e.target.value)} required />
 </div>
 <div className="auth-input-group">
 <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
 <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
 <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)}><EyeIcon open={showPass} /></button>
 </div>

 <div className="auth-row">
 <button type="button" className="auth-link" onClick={() => { setForgotMode(true); setMessage({ text: '', type: '' }); }}>Lupa password?</button>
 </div>
 <button type="submit" className="auth-btn-main" disabled={loading}>
 {loading ? <span className="btn-spinner" /> : null}
 {loading ? 'Masuk...' : 'Masuk'}
 </button>
 </form>

 <div className="auth-divider"><span>atau</span></div>
 <button className="auth-btn-google" onClick={handleGoogleLogin}>
 <GoogleIcon /> Masuk dengan Google
 </button>

 <p className="auth-switch-mobile">
 Belum punya akun? <button onClick={() => { setIsSignUp(true); reset(); }}>Daftar</button>
 </p>
 </>
 ) : (
 <>
 <h2>Reset Password</h2>
 <p className="auth-sub">Masukkan email untuk menerima link reset.</p>
 {message.text && <div className={`auth-msg ${message.type}`}>{message.text}</div>}
 <form onSubmit={handleForgotPassword} className="auth-form">
 <div className="auth-input-group">
 <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
 <input type="email" placeholder="Email perusahaan" value={email} onChange={e => setEmail(e.target.value)} required />
 </div>
 <button type="submit" className="auth-btn-main" disabled={loading || !email}>
 {loading ? 'Mengirim...' : 'Kirim Link Reset'}
 </button>
 </form>
 <button className="auth-link" style={{ marginTop: 12 }} onClick={() => { setForgotMode(false); setMessage({ text: '', type: '' }); }}>← Kembali</button>
 </>
 )}
 </div>
 </div>

 {/* ══ SIGN UP FORM ══ */}
 <div className="auth-panel form-panel signup-panel">
 <div className="auth-panel-inner">
 {/* Logo — light/dark mode aware */}
 <picture>
 <source media="(prefers-color-scheme: dark)" srcSet="/landing/hrislokawhitepanjang.png" />
 <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="auth-logo" />
 </picture>
 <h2>Buat Akun</h2>
 <p className="auth-sub">Bergabung dengan tim HR Anda</p>

 {message.text && isSignUp && (
 <div className={`auth-msg ${message.type}`}>{message.text}</div>
 )}

 <form onSubmit={handleSignUp} className="auth-form">
 <div className="auth-input-group">
 <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
 <input type="text" placeholder="Nama lengkap" value={fullName} onChange={e => setFullName(e.target.value)} required />
 </div>
 <div className="auth-input-group">
 <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
 <input type="email" placeholder="Email perusahaan" value={email} onChange={e => setEmail(e.target.value)} required />
 </div>
 <div className="auth-input-group">
 <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
 <input type={showPass ? 'text' : 'password'} placeholder="Buat password" value={password} onChange={e => setPassword(e.target.value)} required />
 <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)}><EyeIcon open={showPass} /></button>
 </div>
 {/* Strength bar */}
 {password && (
 <div className="pw-strength">
 <div className="pw-bar"><div className="pw-fill" style={{ width: `${pwStrength * 25}%`, background: pwStrength <= 1 ? '#EF4444' : pwStrength <= 2 ? '#F59E0B' : pwStrength <= 3 ? '#3B82F6' : '#10B981' }} /></div>
 <span style={{ color: pwStrength <= 1 ? '#EF4444' : pwStrength <= 2 ? '#F59E0B' : pwStrength <= 3 ? '#3B82F6' : '#10B981' }}>
 {pwStrength <= 1 ? 'Lemah' : pwStrength <= 2 ? 'Cukup' : pwStrength <= 3 ? 'Kuat' : 'Sangat Kuat'}
 </span>
 </div>
 )}
 <button type="submit" className="auth-btn-main" disabled={loading || !isPasswordValid || !fullName || !email}>
 {loading ? <span className="btn-spinner" /> : null}
 {loading ? 'Membuat Akun...' : 'Daftar Sekarang'}
 </button>
 </form>

 <div className="auth-divider"><span>atau</span></div>
 <button className="auth-btn-google" onClick={handleGoogleLogin}>
 <GoogleIcon /> Daftar dengan Google
 </button>

 <p className="auth-switch-mobile">
 Sudah punya akun? <button onClick={() => { setIsSignUp(false); reset(); }}>Masuk</button>
 </p>
 </div>
 </div>

 {/* ══ OVERLAY PANEL ══ */}
 <div className="auth-overlay-wrap">
 {/* Left overlay (shown when signup) */}
 <div className="auth-overlay left-overlay">
 <div className="overlay-inner">
 <div className="overlay-brand">HRIS <span>Loka</span></div>
 <h3>Sudah punya akun?</h3>
 <p>Masuk untuk mengakses dashboard HR dan kelola data tim Anda.</p>
 <button className="overlay-btn" onClick={() => { setIsSignUp(false); reset(); }}>Masuk</button>
 </div>
 </div>
 {/* Right overlay (shown when signin) */}
 <div className="auth-overlay right-overlay">
 <div className="overlay-inner">
 <div className="overlay-brand">HRIS <span>Loka</span></div>
 <h3>Baru di HRIS Loka?</h3>
 <p>Daftar dan mulai kelola sumber daya manusia perusahaan Anda secara modern.</p>
 <button className="overlay-btn" onClick={() => { setIsSignUp(true); reset(); }}>Daftar Sekarang</button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
