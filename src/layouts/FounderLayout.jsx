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
  // Ops-visible reason shown on the deny screen (not just console).
  const [denyReason, setDenyReason] = useState(null);

  useEffect(() => {
    if (loading) return;

    const runCheck = async () => {
      setVerifying(true);
      setDenyReason(null);
      try {
        // Fail visibly when the founder email is not configured — otherwise
        // every login lands on a cryptic deny screen with no recovery path.
        if (!ALLOWED_FOUNDER_EMAIL) {
          console.warn('[FounderLayout] VITE_FOUNDER_EMAIL is not set — founder portal is inaccessible.');
          setDenyReason('missing_env');
          setVerified(false);
          setVerifying(false);
          return;
        }

        if (!user || !session) {
          setDenyReason('no_session');
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
          setDenyReason('session_invalid');
          setVerified(false);
          setVerifying(false);
          return;
        }

        const emailMatch =
          liveUser.email?.toLowerCase().trim() ===
          ALLOWED_FOUNDER_EMAIL.toLowerCase().trim();

        if (!emailMatch) {
          console.warn('[FounderLayout] Unauthorized access attempt by:', liveUser.email);
          setDenyReason('email_mismatch');
          setVerified(false);
          setVerifying(false);
          return;
        }

        // DB role double-gate: the employees row must also carry role=founder.
        // Surfaces as 'role_missing' on the deny screen with a recovery hint
        // (instead of a silent console-only block).
        try {
          const { data: row } = await supabase
            .from('employees')
            .select('role')
            .eq('auth_user_id', liveUser.id)
            .maybeSingle();
          if (row && row.role !== 'founder') {
            console.warn('[FounderLayout] DB role is not founder:', row.role);
            setDenyReason('role_missing');
            setVerified(false);
            setVerifying(false);
            return;
          }
        } catch (roleErr) {
          // Lookup failure (RLS/network) — don't hard-block on infrastructure
          // noise; fall through to the context check below.
          console.warn('[FounderLayout] Role lookup failed:', roleErr?.message || roleErr);
        }

        const contextEmailMatch = isFounder(user, employee);
        if (!contextEmailMatch) {
          console.warn('[FounderLayout] Context email mismatch - possible session tampering.');
          setDenyReason('context_mismatch');
          setVerified(false);
          setVerifying(false);
          return;
        }

        setVerified(true);
      } catch (err) {
        console.error('[FounderLayout] Security check exception:', err);
        setDenyReason('check_error');
        setVerified(false);
      } finally {
        setVerifying(false);
      }
    };

    runCheck();
  }, [user, employee, loading, session]);

  return { verifying: loading || verifying, verified, denyReason };
}

export default function FounderLayout() {
  const { user, employee, signOut } = useAuth();
  const { verifying, verified, denyReason } = useFounderAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openComplaints, setOpenComplaints] = useState(0);

  useEffect(() => {
    markNoIndex('KiniKerja — Founder');
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
        reason={denyReason}
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

const DENY_HINTS = {
  missing_env: 'VITE_FOUNDER_EMAIL belum dikonfigurasi di environment. Minta admin mengatur env tersebut lalu redeploy.',
  no_session: 'Anda belum login. Silakan login dengan akun founder lalu buka kembali halaman ini.',
  session_invalid: 'Sesi tidak valid atau kedaluwarsa. Silakan logout lalu login ulang.',
  email_mismatch: 'Email akun ini bukan email founder terdaftar. Login dengan akun founder yang benar.',
  role_missing: 'Email cocok tetapi baris employees Anda belum ber-role founder. Minta admin menjalankan: UPDATE employees SET role = \'founder\' WHERE auth_user_id = \'<uid-anda>\'.',
  context_mismatch: 'Konteks sesi tidak cocok (kemungkinan session tampering). Logout lalu login ulang.',
  check_error: 'Pemeriksaan keamanan gagal karena kesalahan teknis. Coba muat ulang; jika berlanjut, hubungi support.',
};

function FounderAccessDenied({ onSignOut, reason }) {
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
        {reason && DENY_HINTS[reason] && (
          <p className="founder-access-denied-desc" style={{ marginTop: 8, fontSize: 13 }}>
            <strong>Alasan:</strong> {DENY_HINTS[reason]}
          </p>
        )}
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
