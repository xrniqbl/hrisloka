import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode } from '../../lib/demoGuard';
import './EmpOnboard.css';

const SPLASH_MS = 2200;
export const SPLASH_KEY = 'kinikerja_splash_seen';

export default function EmpSplash() {
  const navigate = useNavigate();
  const { user, employee, loading } = useAuth();
  const authed = !loading && (user || isDemoMode());

  useEffect(() => {
    if (authed || loading) return;
    try { sessionStorage.setItem(SPLASH_KEY, '1'); } catch { /* ignore */ }
    const t = setTimeout(() => {
      navigate('/app/welcome', { replace: true });
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [navigate, authed, loading]);

  if (authed) {
    const status = employee?.account_status;
    if (status === 'pending_verification') return <Navigate to="/app/pending" replace />;
    if (status === 'rejected') return <Navigate to="/app/rejected" replace />;
    return <Navigate to="/app/home" replace />;
  }

  return (
    <div className="emp-onboard emp-splash" role="status" aria-label="Memuat KiniKerja">
      <div className="emp-splash__content">
        <div className="emp-splash__icon-wrap">
          <img
            src="/landing/kinikerjalogo.jpeg"
            alt="KiniKerja"
            className="emp-splash__icon"
          />
        </div>
        <p className="emp-splash__name">KiniKerja</p>
      </div>
    </div>
  );
}
