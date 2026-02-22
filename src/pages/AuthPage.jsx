import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export default function AuthPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [otpMode, setOtpMode] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signInWithPassword, signInWithOtp, resetPassword, verifyOtp, signInWithGoogle, signUp, demoLogin } = useAuth();

    // Password validation
    const passwordRules = [
        { key: 'length', label: 'Minimal 8 karakter', test: (p) => p.length >= 8 },
        { key: 'upper', label: 'Minimal 1 huruf kapital (A-Z)', test: (p) => /[A-Z]/.test(p) },
        { key: 'number', label: 'Minimal 1 angka (0-9)', test: (p) => /[0-9]/.test(p) },
        { key: 'special', label: 'Minimal 1 karakter spesial (!@#$...)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
    ];
    const isPasswordValid = passwordRules.every(r => r.test(password));

    const handleDemoLogin = () => {
        demoLogin();
        navigate('/app/home');
    };

    // Sign In with email + password
    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        localStorage.setItem('hrisync_role', 'employee');
        const { data, error } = await signInWithPassword(email, password);
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            const role = localStorage.getItem('hrisync_role');
            navigate(role === 'admin' ? '/dashboard' : '/app/home');
        }
        setLoading(false);
    };

    // Send OTP for passwordless login
    const handleSendOtp = async () => {
        if (!email) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        const { error } = await signInWithOtp(email);
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            setOtpSent(true);
            setMessage({ text: 'Kode OTP telah dikirim ke email Anda.', type: 'success' });
        }
        setLoading(false);
    };

    // Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        const { error } = await verifyOtp(email, otp);
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            const savedRole = localStorage.getItem('hrisync_role');
            navigate(savedRole === 'admin' ? '/dashboard' : '/app/home');
        }
        setLoading(false);
    };

    // Google OAuth
    const handleGoogleLogin = async () => {
        localStorage.setItem('hrisync_role', 'admin');
        const { error } = await signInWithGoogle();
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        }
    };

    // Forgot password
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        const { error } = await resetPassword(email);
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            setMessage({ text: 'Link reset password telah dikirim ke email Anda. Cek inbox.', type: 'success' });
        }
        setLoading(false);
    };

    // Sign Up with email + password + name
    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!email || !password || !fullName) return;
        if (!isPasswordValid) {
            setMessage({ text: 'Password belum memenuhi semua persyaratan.', type: 'error' });
            return;
        }
        setLoading(true);
        setMessage({ text: '', type: '' });
        localStorage.setItem('hrisync_role', 'employee');
        const { error } = await signUp(email, password, { full_name: fullName, role: 'employee' });
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            setMessage({ text: 'Akun berhasil dibuat! Cek email untuk verifikasi.', type: 'success' });
        }
        setLoading(false);
    };

    const togglePanel = () => {
        setIsSignUp(!isSignUp);
        setMessage({ text: '', type: '' });
        setOtpMode(false);
        setForgotMode(false);
        setOtpSent(false);
        setOtp('');
        setPassword('');
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Mobile Tabs */}
                <div className="auth-mobile-tabs">
                    <button
                        className={`auth-mobile-tab ${!isSignUp ? 'active' : ''}`}
                        onClick={() => { setIsSignUp(false); setMessage({ text: '', type: '' }); }}
                    >
                        Masuk
                    </button>
                    <button
                        className={`auth-mobile-tab ${isSignUp ? 'active' : ''}`}
                        onClick={() => { setIsSignUp(true); setMessage({ text: '', type: '' }); }}
                    >
                        Daftar
                    </button>
                </div>

                {/* ─── Sign In Panel ─── */}
                <div className={`auth-form-panel ${isSignUp ? 'hidden' : ''}`}>
                    <h1 className="auth-form-title">Selamat Datang</h1>
                    <p className="auth-form-subtitle">Masuk ke dashboard HR Anda</p>

                    {message.text && !isSignUp && (
                        <div className={`auth-message ${message.type}`}>{message.text}</div>
                    )}

                    {!otpMode && !forgotMode ? (
                        /* Email + Password Sign In */
                        <form onSubmit={handlePasswordLogin}>
                            <div className="auth-input-group">
                                <label className="auth-input-label">Email</label>
                                <input
                                    type="email"
                                    className="auth-input"
                                    placeholder="nama@perusahaan.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="auth-input-group">
                                <label className="auth-input-label">Password</label>
                                <input
                                    type="password"
                                    className="auth-input"
                                    placeholder="Masukkan password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="auth-btn-primary" disabled={loading}>
                                {loading ? 'Memproses...' : 'Masuk'}
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => { setForgotMode(true); setMessage({ text: '', type: '' }); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger, #EF4444)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                >
                                    Lupa Password?
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setOtpMode(true); setMessage({ text: '', type: '' }); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary, #2563EB)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                >
                                    Masuk dengan OTP
                                </button>
                            </div>
                        </form>
                    ) : forgotMode ? (
                        /* Forgot Password */
                        <form onSubmit={handleForgotPassword}>
                            <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Masukkan email Anda. Kami akan kirimkan link untuk reset password.
                            </div>
                            <div className="auth-input-group">
                                <label className="auth-input-label">Email</label>
                                <input
                                    type="email"
                                    className="auth-input"
                                    placeholder="nama@perusahaan.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="auth-btn-primary" disabled={loading || !email}>
                                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setForgotMode(false); setMessage({ text: '', type: '' }); }}
                                style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--primary, #2563EB)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                ← Kembali ke login
                            </button>
                        </form>
                    ) : (
                        /* OTP Mode */
                        <form onSubmit={handleVerifyOtp}>
                            <div className="auth-input-group">
                                <label className="auth-input-label">Email</label>
                                <div className="auth-otp-row">
                                    <input
                                        type="email"
                                        className="auth-input"
                                        placeholder="nama@perusahaan.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="auth-btn-send"
                                        onClick={handleSendOtp}
                                        disabled={loading || !email}
                                    >
                                        {otpSent ? 'Kirim Ulang' : 'Kirim OTP'}
                                    </button>
                                </div>
                            </div>

                            {otpSent && (
                                <div className="auth-input-group">
                                    <label className="auth-input-label">Kode OTP</label>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        placeholder="Masukkan 6 digit kode"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            )}

                            <button type="submit" className="auth-btn-primary" disabled={loading || !otpSent}>
                                {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setOtpMode(false); setOtpSent(false); setOtp(''); setMessage({ text: '', type: '' }); }}
                                style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--primary, #2563EB)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                ← Kembali ke login password
                            </button>
                        </form>
                    )}

                    <div className="auth-divider"><span>atau</span></div>

                    <button className="auth-btn-google" onClick={handleGoogleLogin}>
                        <GoogleIcon />
                        Masuk dengan Google
                    </button>

                    <div className="auth-divider"><span>coba dulu</span></div>

                    <button
                        className="auth-btn-demo"
                        onClick={handleDemoLogin}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            color: '#fff', fontWeight: 700, fontSize: '15px',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        📱 Demo Karyawan (PWA)
                    </button>
                </div>

                {/* ─── Sign Up Panel ─── */}
                <div className={`auth-form-panel ${!isSignUp ? 'hidden right' : ''}`} style={isSignUp ? { marginLeft: 'auto' } : {}}>
                    <h1 className="auth-form-title">Buat Akun</h1>
                    <p className="auth-form-subtitle">Daftar untuk bergabung dengan organisasi Anda</p>

                    {message.text && isSignUp && (
                        <div className={`auth-message ${message.type}`}>{message.text}</div>
                    )}

                    <form onSubmit={handleSignUp}>
                        <div className="auth-input-group">
                            <label className="auth-input-label">Nama Lengkap</label>
                            <input
                                type="text"
                                className="auth-input"
                                placeholder="Ahmad Rizky"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-input-group">
                            <label className="auth-input-label">Email</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="nama@perusahaan.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-input-group">
                            <label className="auth-input-label">Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="Buat password kuat"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {password && (
                                <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                                    {passwordRules.map(rule => (
                                        <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: rule.test(password) ? 'var(--success, #10B981)' : 'var(--muted, #9CA3AF)' }}>
                                            <span style={{ fontSize: 13 }}>{rule.test(password) ? '✓' : '○'}</span>
                                            {rule.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="auth-btn-primary" disabled={loading || !isPasswordValid}>
                            {loading ? 'Membuat Akun...' : 'Daftar'}
                        </button>
                    </form>

                    <div className="auth-divider"><span>atau</span></div>

                    <button className="auth-btn-google" onClick={handleGoogleLogin}>
                        <GoogleIcon />
                        Daftar dengan Google
                    </button>
                </div>

                {/* ─── Overlay Slider ─── */}
                <div className={`auth-overlay ${isSignUp ? 'slide-left' : ''}`}>
                    <div className="auth-overlay-logo">HR</div>
                    {isSignUp ? (
                        <>
                            <h2>Sudah punya akun?</h2>
                            <p>Masuk untuk mengakses dashboard dan kelola data HR Anda.</p>
                            <button className="auth-btn-outline" onClick={togglePanel}>Masuk</button>
                        </>
                    ) : (
                        <>
                            <h2>Baru di HRISync?</h2>
                            <p>Buat akun dan mulai kelola sumber daya manusia organisasi Anda.</p>
                            <button className="auth-btn-outline" onClick={togglePanel}>Daftar</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
