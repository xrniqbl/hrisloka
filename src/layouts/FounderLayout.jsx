import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FOUNDER_EMAIL, isFounder } from '../lib/rbac';
import FounderSidebar from '../components/FounderSidebar';
import { FiSun, FiMoon, FiShield, FiLock, FiAlertTriangle } from 'react-icons/fi';
import { LanguageToggle } from '../lib/i18n';
import * as founderService from '../services/founderService';
import { supabase } from '../lib/supabase';
import './FounderLayout.css';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY: Hardcoded founder email — the ONLY email allowed in this layout.
// This is checked both client-side AND against the live Supabase session.
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_FOUNDER_EMAIL = FOUNDER_EMAIL; // 'hrisloka@gmail.com'

/** Deep-check: verify every layer of auth before allowing access */
function useFounderAuth() {
  const { user, employee, loading, session } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (loading) return; // wait for AuthContext to initialise

    const runCheck = async () => {
      setVerifying(true);
      try {
        // Layer 1 — must have an active session at all
        if (!user || !session) {
          setVerified(false);
          setVerifying(false);
          return;
        }

        // Layer 2 — re-fetch the live session directly from Supabase
        // (protects against stale in-memory state being tampered with)
        const { data: { user: liveUser }, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !liveUser) {
          console.warn('[FounderLayout] Live session check failed:', sessionError?.message);
          setVerified(false);
          setVerifying(false);
          return;
        }

        // Layer 3 — email must be EXACTLY the founder email (case-insensitive)
        const emailMatch =
          liveUser.email?.toLowerCase().trim() === ALLOWED_FOUNDER_EMAIL.toLowerCase().trim();

        if (!emailMatch) {
          console.warn('[FounderLayout] Unauthorized access attempt by:', liveUser.email);
          setVerified(false);
          setVerifying(false);
          return;
        }

        // Layer 4 — cross-check with AuthContext state (defence-in-depth)
        const contextEmailMatch = isFounder(user, employee);
        if (!contextEmailMatch) {
          console.warn('[FounderLayout] Context email mismatch — possible session tampering.');
          setVerified(false);
          setVerifying(false);
          return;
        }

        // All layers passed ✓
        setVerified(true);
      } catch (err) {
        console.error('[FounderLayout] Security check exception:', err);
        setVerified(false);
      } finally {
        setVerifying(false);
      }
    };

    runCheck();
  }, [user, employee, loading, session]);

  return { verifying: loading || verifying, verified };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FounderLayout() {
  const { user, loading, signOut } = useAuth();
  const { verifying, verified } = useFounderAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    () => localStorage.getItem('hrisync_theme') || 'light'
  );
  const [openComplaints, setOpenComplaints] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hrisync_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (location.pathname !== '/') {
      localStorage.setItem('hrisync_last_path', location.pathname);
    }
  }, [location.pathname]);

  // Fetch open complaint count for sidebar badge
  useEffect(() => {
    if (!verified) return;
    founderService.getAllComplaints().then(({ data }) => {
      if (data) {
        setOpenComplaints(data.filter(c => c.status === 'open').length);
      }
    });
  }, [verified]);

  // ── Loading Spinner ──────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0A0F1E', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#F59E0B', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: 1 }}>
          VERIFYING IDENTITY…
        </span>
      </div>
    );
  }

  // ── Not logged in → go to login page (never expose founder UI) ───────────
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ── Wrong account → show hardened denial screen ──────────────────────────
  if (!verified) {
    return <FounderAccessDenied onSignOut={async () => {
      await signOut();
      navigate('/login', { replace: true });
    }} />;
  }

  // ── All checks passed → render founder portal ────────────────────────────
  return (
    <div className="founder-layout-wrapper">
      <FounderSidebar openComplaints={openComplaints} />

      <main className="founder-layout-main">
        {/* Top Bar */}
        <div className="founder-topbar">
          <div className="founder-topbar-left">
            {/* Left slot — pages can inject breadcrumbs */}
          </div>
          <div className="founder-topbar-right">
            <LanguageToggle />
            <button
              className="founder-theme-btn"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>
            <div className="founder-portal-badge">
              <FiShield size={11} />
              Founder Portal
            </div>
          </div>
        </div>

        {/* Page Content */}
        <Outlet />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardened Access Denied screen — shown to any non-founder who tries /founder/*
// ─────────────────────────────────────────────────────────────────────────────
function FounderAccessDenied({ onSignOut }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0A0F1E',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,59,48,0.3)',
        borderRadius: 20,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(255,59,48,0.08)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Icon */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,59,48,0.12)',
          border: '2px solid rgba(255,59,48,0.25)',
          marginBottom: 24,
          animation: 'founderPulse 2s ease-in-out infinite',
        }}>
          <FiLock size={32} color="#FF3B30" />
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <FiAlertTriangle size={16} color="#F59E0B" />
          <span style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            Access Denied
          </span>
          <FiAlertTriangle size={16} color="#F59E0B" />
        </div>

        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
          Founder Portal Restricted
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 32px' }}>
          This area is exclusively accessible to the platform founder account.
          Your credentials do not match the required authorization level.
          All access attempts are logged and monitored.
        </p>

        {/* Security notice */}
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 28,
          display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
        }}>
          <FiShield size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
            Unauthorized access attempts to this portal are recorded and may result in account suspension.
          </span>
        </div>

        {/* Sign out button */}
        <button
          onClick={onSignOut}
          style={{
            display: 'block', width: '100%',
            padding: '13px 24px',
            background: 'rgba(255,59,48,0.15)',
            border: '1px solid rgba(255,59,48,0.35)',
            borderRadius: 10,
            color: '#FF6B6B',
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            e.target.style.background = 'rgba(255,59,48,0.25)';
            e.target.style.borderColor = 'rgba(255,59,48,0.5)';
          }}
          onMouseOut={e => {
            e.target.style.background = 'rgba(255,59,48,0.15)';
            e.target.style.borderColor = 'rgba(255,59,48,0.35)';
          }}
        >
          Sign Out & Return to Login
        </button>

        <style>{`
          @keyframes founderPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.2); }
            50% { box-shadow: 0 0 0 12px rgba(255,59,48,0); }
          }
        `}</style>
      </div>
    </div>
  );
}
