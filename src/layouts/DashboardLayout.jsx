import { useState, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { Plus, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { isDemoMode } from '../lib/demoGuard';
import Sidebar from '../components/Sidebar';
import NotificationCenter from '../components/NotificationCenter';
import PlatformBroadcastBanner from '../components/PlatformBroadcastBanner';
import Breadcrumb from '../components/Breadcrumb';
import ProfileDrawer from '../components/ProfileDrawer';
import GlobalSearch from '../components/GlobalSearch';
import UserAvatar from '../components/UserAvatar';
import { hasAccess, getRole, isFounder, ROLE_LABELS, ROLE_COLORS } from '../lib/rbac';
import { safeGetItem } from '../lib/safeStorage';
import { useTranslation, LanguageToggle } from '../lib/i18n';
import { rememberAppPath, stripUrlHash } from '../lib/safePath';
import { markNoIndex } from '../lib/seo';
import { needsOwnerSetup } from '../services/ownerSetupService';
import './DashboardLayout.css';

/** Route path → page title for topbar (SolveHR-style) */
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/approvals': 'Approvals',
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/org-chart': 'Org Chart',
  '/documents': 'Documents',
  '/profile-requests': 'Profile Requests',
  '/branches': 'Branches',
  '/onboarding': 'Onboarding',
  '/offboarding': 'Offboarding',
  '/attendance': 'Attendance',
  '/shifts': 'Shift Management',
  '/leave': 'Leave',
  '/geo-attendance': 'Geo Attendance',
  '/overtime': 'Overtime',
  '/payroll': 'Payroll',
  '/payslips': 'Payslips',
  '/reimbursement': 'Reimbursement',
  '/expense-ocr': 'Expense OCR',
  '/loans': 'Loans',
  '/projects': 'Projects',
  '/timesheets': 'Timesheets',
  '/kpi': 'KPI',
  '/appraisal': 'Appraisal',
  '/jobs': 'Job Postings',
  '/candidates': 'Candidates',
  '/it-assets': 'Assets',
  '/helpdesk': 'Helpdesk',
  '/training': 'Training',
  '/ai-capability': 'AI Capability',
  '/calendar': 'Calendar',
  '/holidays': 'Holidays',
  '/announcements': 'Announcements',
  '/audit-trail': 'Audit Trail',
  '/analytics': 'Analytics',
  '/integrations': 'Integrations',
  '/policies': 'Policies',
  '/contracts': 'Contracts',
  '/settings': 'Settings',
};

function resolvePageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter((p) => p !== '/dashboard' && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Dashboard';
}

export default function DashboardLayout() {
  const { user, employee, loading, hasOnboarding, onboardingLoading } = useAuth();
  const { isPathEnabled, loading: flagsLoading } = useFeatureFlags();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profileOpen, setProfileOpen] = useState(false);

  const [setupGate, setSetupGate] = useState(null); // null=checking, true=need setup, false=ok

  // Private app shell — never index in search engines
  useEffect(() => {
    markNoIndex('KiniKerja — Dashboard');
  }, []);

  // Owner setup wizard gate (company bootstrap)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isFounder(user, employee)) {
        if (!cancelled) setSetupGate(false);
        return;
      }
      const need = await needsOwnerSetup();
      if (!cancelled) setSetupGate(need);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, employee]);

  // Keep document theme in sync with Settings (localStorage) — toggle lives in Settings → Tampilan
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
    if (user && location.pathname !== '/') {
      rememberAppPath(location.pathname);
    }
    stripUrlHash();
  }, [location.pathname, user]);

  const pageTitle = useMemo(() => resolvePageTitle(location.pathname), [location.pathname]);

  const isDemo = isDemoMode();
  const userName = isDemo
    ? 'Demo User'
    : employee?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
const avatarUrl = isDemo ? null : employee?.photo_url || user?.user_metadata?.avatar_url || null;
if (loading) {
    return (
      <div className="layout-loading">
        <div className="layout-loading-inner">
          <div className="layout-spinner" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isDemoMode()) {
    return (
      <div className="layout-wrapper">
        <Sidebar />
        <main id="main-content" role="main" className="layout-content" tabIndex={-1}>
          <div className="layout-demo-banner">
            Mode Demo — Akses Read-Only. Fitur edit/tambah/hapus dinonaktifkan
          </div>
          <TopBar
            pageTitle={pageTitle}
            userName={userName}
            avatarUrl={null}
            onProfile={() => setProfileOpen(true)}
            onCreateNew={() => navigate('/employees')}
          />
          <Outlet />
        </main>
        <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const role = getRole(employee);
  const founderUser = isFounder(user, employee);

  if (!founderUser && role === 'employee') {
    return <Navigate to="/employee-web-access" replace />;
  }

  if (!founderUser && !onboardingLoading && !hasOnboarding) {
    return <Navigate to="/onboarding-form" replace />;
  }

  // Wait for setup gate (avoid flash); then force owner wizard if needed
  if (!founderUser && setupGate === null) {
    return (
      <div className="layout-loading">
        <div className="layout-loading-inner">
          <div className="layout-spinner" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }
  if (!founderUser && setupGate === true && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  // Tunggu flags dimuat dulu (fail-closed): jangan tolak akses sebelum tahu status fitur
  if (!founderUser && flagsLoading) {
    return (
      <div className="layout-loading">
        <div className="layout-loading-inner">
          <div className="layout-spinner" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const featureAllowed = founderUser || isPathEnabled(location.pathname);
  if (!hasAccess(role, location.pathname, founderUser) || !featureAllowed) {
    return (
      <div className="layout-wrapper">
        <Sidebar />
        <main className="layout-content">
          <div className="layout-denied">
            <div className="layout-denied-icon">
              <Icon icon={Lock} size="md" color="inherit" />
            </div>
            <h2>{t('auth.access_denied')}</h2>
            <p>
              {!featureAllowed
                ? 'Fitur ini dinonaktifkan oleh administrator platform.'
                : t('auth.no_permission')}{' '}
              {t('auth.your_role')}:{' '}
              <span
                className="layout-role-chip"
                style={{
                  color: ROLE_COLORS[role],
                  background: `${ROLE_COLORS[role]}15`,
                }}
              >
                {ROLE_LABELS[role]}
              </span>
            </p>
            <button type="button" className="btn-create-new" onClick={() => window.history.back()}>
              {t('common.back')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <main id="main-content" role="main" className="layout-content" tabIndex={-1}>
        <TopBar
          pageTitle={pageTitle}
          userName={userName}
          avatarUrl={avatarUrl}
          onProfile={() => setProfileOpen(true)}
          onCreateNew={() => navigate('/employees')}
        />
        <Breadcrumb />
        <PlatformBroadcastBanner />
        <Outlet />
      </main>
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function TopBar({
  pageTitle,
  userName,
  avatarUrl,
  onProfile,
  onCreateNew,
}) {
  const { t } = useTranslation();

  return (
    <header className="layout-topbar">
      <div className="layout-topbar-left">
        <h1 className="layout-topbar-title">{pageTitle}</h1>
      </div>

      <div className="layout-topbar-center">
        <div className="layout-topbar-search">
          <GlobalSearch />
        </div>
      </div>

      <div className="layout-topbar-actions">
        <LanguageToggle />
        <NotificationCenter />
        <button type="button" className="btn-create-new" onClick={onCreateNew}>
          <Icon icon={Plus} size="sm" color="inherit" />
          <span>{t('common.create_new')}</span>
        </button>
        <button
          type="button"
          className="top-navbar-user"
          onClick={onProfile}
          title={t('common.profile')}
        >
          <UserAvatar
            src={avatarUrl}
            name={userName}
            alt={userName}
            size={34}
            className="top-navbar-avatar"
          />
          <span className="top-navbar-username">{userName}</span>
        </button>
      </div>
    </header>
  );
}
