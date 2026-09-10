import { useState, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { Lock, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FOUNDER_EMAIL, isFounder } from '../lib/rbac';
import FounderSidebar from '../components/FounderSidebar';
import UserAvatar from '../components/UserAvatar';
import { LanguageToggle } from '../lib/i18n';
import * as founderService from '../services/founderService';
import { supabase } from '../lib/supabase';
import { markNoIndex } from '../lib/seo';
import { safeGetItem, safeSetItem } from '../lib/safeStorage';
import './FounderLayout.css';

const ALLOWED_FOUNDER_EMAIL = FOUNDER_EMAIL;

const PAGE_TITLES = {
  '/founder/dashboard': 'Dashboard',
  '/founder/subscribers': 'Subscribers',
  '/founder/subscriptions': 'Subscriptions',
  '/founder/vouchers': 'Vouchers',
  '/founder/companies': 'Companies',
  '/founder/analytics': 'Analytics',
  '/founder/broadcast': 'Broadcast',
  '/founder/support': 'Support',
  '/founder/backup': 'Backup',
  '/founder/platform-settings': 'Settings',
};

function resolvePageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter((p) => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Founder';
}

/** Deep-check: verify every layer of auth before allowing access */
function useFounderAuth() {
  const { user, employee, loading, session } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (loading) return;

    const runCheck = async () => {
      setVerifying(true);
      try {
        if (!user || !session) {
          setVerified(false);
          setVerifying(false);
          return;
        }

        const {
          data: { user: liveUser },
          error: sessionError,
        } = await supabase.auth.getUser();
        if (sessionError || !liveUser) {
          console.warn('[FounderLayout] Live session check failed:', sessionError?.message);
          setVerified(false);
          setVerifying(false);
          return;
        }

        const emailMatch =
          liveUser.email?.toLowerCase().trim() ===
          ALLOWED_FOUNDER_EMAIL.toLowerCase().trim();

        if (!emailMatch) {
          console.warn('[FounderLayout] Unauthorized access attempt by:', liveUser.email);
          setVerified(false);
          setVerifying(false);
          return;
        }

        const contextEmailMatch = isFounder(user, employee);
        if (!contextEmailMatch) {
          console.warn('[FounderLayout] Context email mismatch - possible session tampering.');
          setVerified(false);
          setVerifying(false);
          return;
        }

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

export default function FounderLayout() {
  const { user, employee, signOut } = useAuth();
  const { verifying, verified } = useFounderAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openComplaints, setOpenComplaints] = useState(0);

  useEffect(() => {
    markNoIndex('HRIS Loka — Founder');
  }, []);

  // Theme follows Settings / localStorage (same as HR shell — no topbar toggle)
  useEffect(() => {
    const apply = () => {
      const theme = safeGetItem('hrisync_theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    };
    apply();
    window.addEventListener('storage', apply);
    window.addEventListener('hrisync-theme-change', apply);
    return () => {
      window.removeEventListener('storage', apply);
      window.removeEventListener('hrisync-theme-change', apply);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') {
      safeSetItem('hrisync_last_path', location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!verified) return;
    founderService.getAllComplaints().then(({ data }) => {
      if (data) {
        setOpenComplaints(data.filter((c) => c.status === 'open').length);
      }
    });
  }, [verified]);

  const pageTitle = useMemo(
    () => resolvePageTitle(location.pathname),
    [location.pathname],
  );

  const userName =
    employee?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Founder';
  const avatarUrl =
    employee?.photo_url || user?.user_metadata?.avatar_url || null;

  if (verifying) {
    return (
      <div className="founder-loading">
        <div className="founder-loading-spinner" />
        <span className="founder-loading-text">Memverifikasi…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!verified) {
    return (
      <FounderAccessDenied
        onSignOut={async () => {
          await signOut();
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  return (
    <div className="founder-layout-wrapper">
      <FounderSidebar openComplaints={openComplaints} />

      <main className="founder-layout-main">
        <header className="founder-topbar">
          <div className="founder-topbar-left">
            <h1 className="founder-topbar-title">{pageTitle}</h1>
          </div>
          <div className="founder-topbar-right">
            <LanguageToggle />
            <button
              type="button"
              className="founder-topbar-profile"
              onClick={() => navigate('/founder/platform-settings')}
              title={userName}
            >
              <UserAvatar
                name={userName}
                src={avatarUrl}
                size={32}
              />
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

function FounderAccessDenied({ onSignOut }) {
  return (
    <div className="founder-access-denied">
      <div className="founder-access-denied-card">
        <div className="founder-access-denied-icon">
          <Icon icon={Lock} size="lg" color="inherit" />
        </div>
        <div className="founder-access-denied-kicker">
          <Icon icon={AlertTriangle} size="sm" color="inherit" />
          Access Denied
        </div>
        <h2 className="founder-access-denied-title">Founder Portal Restricted</h2>
        <p className="founder-access-denied-desc">
          Area ini hanya untuk akun founder platform. Kredensial Anda tidak
          memenuhi level otorisasi yang diperlukan.
        </p>
        <div className="founder-access-denied-notice">
          <Icon icon={Shield} size="sm" color="inherit" />
          <span>
            Percobaan akses tidak sah dicatat dan dapat berakibat penangguhan akun.
          </span>
        </div>
        <button type="button" className="founder-access-denied-btn" onClick={onSignOut}>
          Sign Out & Return to Login
        </button>
      </div>
    </div>
  );
}
