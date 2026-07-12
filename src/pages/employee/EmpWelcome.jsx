import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode, activateDemo } from '../../lib/demoGuard';
import { SPLASH_KEY } from './EmpSplash';
import './EmpOnboard.css';

export default function EmpWelcome() {
  const { user, employee, loading, setIsDemo } = useAuth();

  try {
    if (!sessionStorage.getItem(SPLASH_KEY) && !isDemoMode() && !user) {
      return <Navigate to="/app/splash" replace />;
    }
  } catch { /* ignore */ }

  if (!loading && (user || isDemoMode())) {
    const status = employee?.account_status;
    if (status === 'pending_verification') return <Navigate to="/app/pending" replace />;
    if (status === 'rejected') return <Navigate to="/app/rejected" replace />;
    return <Navigate to="/app/home" replace />;
  }

  const enterDemo = () => {
    activateDemo();
    setIsDemo?.(true);
    window.location.replace('/app/home');
  };

  return (
    <div className="emp-onboard emp-welcome">
      {/* Ambient glow */}
      <div className="emp-welcome__ambient" aria-hidden />

      <main className="emp-welcome__canvas">
        <div className="emp-welcome__sheet">
          {/* Brand badge + copy */}
          <div className="emp-welcome__copy">
            <div className="emp-welcome__badge">
              <svg className="emp-welcome__badge-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <span>HRIS Loka</span>
            </div>

            <div className="emp-welcome__titles">
              <h1 className="emp-welcome__headline">
                Your All-in-One
                <br />
                <span className="emp-welcome__headline-accent">HR Hub</span>
              </h1>
              <div className="emp-welcome__rule" aria-hidden />
            </div>

            <p className="emp-welcome__lead">
              Manage attendance, payslips, and requests effortlessly with a seamless, modern experience.
            </p>
          </div>

          {/* CTAs */}
          <div className="emp-welcome__ctas">
            <Link to="/app/login" className="emp-welcome__btn emp-welcome__btn--primary">
              Login
            </Link>
            <Link to="/app/register" className="emp-welcome__btn emp-welcome__btn--secondary">
              Register
            </Link>
          </div>

          <button type="button" className="emp-welcome__demo-link" onClick={enterDemo}>
            Coba Demo
          </button>
        </div>
      </main>
    </div>
  );
}
