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
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('employee');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signInWithOtp, verifyOtp, signInWithGoogle, signUp, demoLogin } = useAuth();

    const handleDemoLogin = () => {
        demoLogin();
        navigate('/app/home');
    };

    const handleSendOtp = async () => {
        if (!email) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        const { error } = await signInWithOtp(email);
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            setOtpSent(true);
            setMessage({ text: 'OTP sent to your email. Check your inbox.', type: 'success' });
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        const { error } = await verifyOtp(email, otp);
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            // Role-based redirect
            const savedRole = localStorage.getItem('hrisync_role');
            navigate(savedRole === 'admin' ? '/dashboard' : '/app/home');
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        localStorage.setItem('hrisync_role', 'admin');
        const { error } = await signInWithGoogle();
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!email || !password || !fullName) return;
        setLoading(true);
        setMessage({ text: '', type: '' });
        localStorage.setItem('hrisync_role', 'employee');
        const { error } = await signUp(email, password, { full_name: fullName, role: 'employee' });
        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            setMessage({ text: 'Account created! Check your email for verification.', type: 'success' });
        }
        setLoading(false);
    };

    const togglePanel = () => {
        setIsSignUp(!isSignUp);
        setMessage({ text: '', type: '' });
        setOtpSent(false);
        setOtp('');
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
                        Sign In
                    </button>
                    <button
                        className={`auth-mobile-tab ${isSignUp ? 'active' : ''}`}
                        onClick={() => { setIsSignUp(true); setMessage({ text: '', type: '' }); }}
                    >
                        Sign Up
                    </button>
                </div>

                {/* ─── Sign In Panel ─── */}
                <div className={`auth-form-panel ${isSignUp ? 'hidden' : ''}`}>
                    <h1 className="auth-form-title">Welcome Back</h1>
                    <p className="auth-form-subtitle">Sign in to access your HR dashboard</p>

                    {message.text && !isSignUp && (
                        <div className={`auth-message ${message.type}`}>{message.text}</div>
                    )}

                    <form onSubmit={handleVerifyOtp}>
                        <div className="auth-input-group">
                            <label className="auth-input-label">Email Address</label>
                            <div className="auth-otp-row">
                                <input
                                    type="email"
                                    className="auth-input"
                                    placeholder="name@company.com"
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
                                    {otpSent ? 'Resend' : 'Send OTP'}
                                </button>
                            </div>
                        </div>

                        {otpSent && (
                            <div className="auth-input-group">
                                <label className="auth-input-label">Enter OTP Code</label>
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="Enter 6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength={6}
                                    required
                                />
                            </div>
                        )}

                        <button type="submit" className="auth-btn-primary" disabled={loading || !otpSent}>
                            {loading ? 'Verifying...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-divider"><span>or</span></div>

                    <button className="auth-btn-google" onClick={handleGoogleLogin}>
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <div className="auth-divider"><span>atau coba dulu</span></div>

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
                    <h1 className="auth-form-title">Create Account</h1>
                    <p className="auth-form-subtitle">Register to join your organization</p>

                    {message.text && isSignUp && (
                        <div className={`auth-message ${message.type}`}>{message.text}</div>
                    )}

                    <form onSubmit={handleSignUp}>
                        <div className="auth-input-group">
                            <label className="auth-input-label">Full Name</label>
                            <input
                                type="text"
                                className="auth-input"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-input-group">
                            <label className="auth-input-label">Email Address</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="name@company.com"
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
                                placeholder="Min. 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                        </div>



                        <button type="submit" className="auth-btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="auth-divider"><span>or</span></div>

                    <button className="auth-btn-google" onClick={handleGoogleLogin}>
                        <GoogleIcon />
                        Continue with Google
                    </button>
                </div>

                {/* ─── Overlay Slider ─── */}
                <div className={`auth-overlay ${isSignUp ? 'slide-left' : ''}`}>
                    <div className="auth-overlay-logo">HR</div>
                    {isSignUp ? (
                        <>
                            <h2>Already have an account?</h2>
                            <p>Sign in to access your personal dashboardand manage your HR data.</p>
                            <button className="auth-btn-outline" onClick={togglePanel}>Sign In</button>
                        </>
                    ) : (
                        <>
                            <h2>New to HRISync?</h2>
                            <p>Create your account and start managing your organization's human resources efficiently.</p>
                            <button className="auth-btn-outline" onClick={togglePanel}>Sign Up</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
