import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackEvent } from './services/founderService';
import { requestPersistentStorage } from './lib/backgroundSync';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { I18nProvider } from './lib/i18n';
import ErrorBoundary from './components/ErrorBoundary';
import SkipLink from './components/SkipLink';
import UpdatePrompt from './components/UpdatePrompt';
import { getRole, isFounder } from './lib/rbac';
import { ToastProvider } from './components/Toast';
import { BranchProvider } from './context/BranchContext';
import { isDemoMode, DEMO_ENABLED } from './lib/demoGuard';
import { sanitizeAppPath, stripUrlHash } from './lib/safePath';
import { safeGetItem, safeSetItem } from './lib/safeStorage';
import { supabase } from './lib/supabase';


// ─── Page View Tracker (fires on every route change) ─────────────────────
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackEvent('page_view', { path: location.pathname }).catch(() => {});
  }, [location.pathname]);
  return null;
}

// ─── Layouts (small, load eagerly) ────────────────────────────────────────
import DashboardLayout from './layouts/DashboardLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import FounderLayout from './layouts/FounderLayout';

// ─── Lazy: Founder Portal ─────────────────────────────────────────────────
const FounderDashboard      = lazyRetry(() => import('./pages/founder/FounderDashboard'));
const FounderSubscribers    = lazyRetry(() => import('./pages/founder/FounderSubscribers'));
const FounderSubscriptions  = lazyRetry(() => import('./pages/founder/FounderSubscriptions'));
const FounderVouchers       = lazyRetry(() => import('./pages/founder/FounderVouchers'));
const FounderCompanies      = lazyRetry(() => import('./pages/founder/FounderCompanies'));
const FounderAnalytics      = lazyRetry(() => import('./pages/founder/FounderAnalytics'));
const FounderBroadcast      = lazyRetry(() => import('./pages/founder/FounderBroadcast'));
const FounderSupport        = lazyRetry(() => import('./pages/founder/FounderSupport'));
const FounderSettings       = lazyRetry(() => import('./pages/founder/FounderSettings'));
const FounderBackup         = lazyRetry(() => import('./pages/founder/FounderBackup'));

// ─── Lazy: Auth / Landing (shown before main app loads) ──────────────────
const AuthPage    = lazyRetry(() => import('./pages/AuthPage'));
const LandingPage = lazyRetry(() => import('./pages/LandingPage'));
const CheckoutPage = lazyRetry(() => import('./pages/CheckoutPage'));
const InstallGuide = lazyRetry(() => import('./pages/InstallGuide'));
const MaintenancePage = lazyRetry(() => import('./pages/MaintenancePage'));
const NotFound    = lazyRetry(() => import('./pages/NotFound'));
const Harga       = lazyRetry(() => import('./pages/Harga'));
const FiturPage   = lazyRetry(() => import('./pages/FiturPage'));
const PrivacyPolicy = lazyRetry(() => import('./pages/PrivacyPolicy'));
const EmployeeWebAccess = lazyRetry(() => import('./pages/EmployeeWebAccess'));
const OnboardingForm    = lazyRetry(() => import('./pages/OnboardingForm'));
const OwnerSetupWizard  = lazyRetry(() => import('./pages/OwnerSetupWizard'));
const NotRegistered     = lazyRetry(() => import('./pages/NotRegistered'));
const Blog              = lazyRetry(() => import('./pages/Blog'));
const BlogPost          = lazyRetry(() => import('./pages/BlogPost'));

// ─── Lazy: HR Admin Dashboard Pages ──────────────────────────────────────
const Dashboard             = lazyRetry(() => import('./pages/Dashboard'));
const ApprovalDashboard     = lazyRetry(() => import('./pages/ApprovalDashboard'));

// Employee Management
const Employees             = lazyRetry(() => import('./pages/Employees'));
const EmployeeProfile       = lazyRetry(() => import('./pages/EmployeeProfile'));
const OrgChart              = lazyRetry(() => import('./pages/OrgChart'));
const Documents             = lazyRetry(() => import('./pages/Documents'));
const BranchManagement      = lazyRetry(() => import('./pages/BranchManagement'));
const ProfileRequests       = lazyRetry(() => import('./pages/ProfileRequests'));
const Departments           = lazyRetry(() => import('./pages/Departments'));
const OnboardingChecklist   = lazyRetry(() => import('./pages/OnboardingChecklist'));
const Offboarding           = lazyRetry(() => import('./pages/Offboarding'));

// Time & Attendance
const Attendance            = lazyRetry(() => import('./pages/Attendance'));
const ShiftManagement       = lazyRetry(() => import('./pages/ShiftManagement'));
const LeaveManagement       = lazyRetry(() => import('./pages/LeaveManagement'));
const Overtime              = lazyRetry(() => import('./pages/Overtime'));
const GeofenceAttendance    = lazyRetry(() => import('./pages/GeofenceAttendance'));

// Payroll & Finance
const Payroll               = lazyRetry(() => import('./pages/Payroll'));
const Payslips              = lazyRetry(() => import('./pages/Payslips'));
const Reimbursement         = lazyRetry(() => import('./pages/Reimbursement'));
const ExpenseOCR            = lazyRetry(() => import('./pages/ExpenseOCR'));
const LoanManagement        = lazyRetry(() => import('./pages/LoanManagement'));

// Performance
const KPITracking           = lazyRetry(() => import('./pages/KPITracking'));
const Appraisal             = lazyRetry(() => import('./pages/Appraisal'));

// Recruitment
const JobPosting            = lazyRetry(() => import('./pages/JobPosting'));
const CandidatePipeline     = lazyRetry(() => import('./pages/CandidatePipeline'));

// IT & Support
const AssetManagement       = lazyRetry(() => import('./pages/AssetManagement'));
const Helpdesk              = lazyRetry(() => import('./pages/Helpdesk'));

// AI & Premium
const AICapability          = lazyRetry(() => import('./pages/AICapability'));
const AnalyticsReportBuilder = lazyRetry(() => import('./pages/AnalyticsReportBuilder'));
const IntegrationHub        = lazyRetry(() => import('./pages/IntegrationHub'));
const CompanyPolicyCenter   = lazyRetry(() => import('./pages/CompanyPolicyCenter'));

// Training, Calendar, Projects
const TrainingManagement    = lazyRetry(() => import('./pages/TrainingManagement'));
const CalendarView          = lazyRetry(() => import('./pages/CalendarView'));
const HolidayManagement     = lazyRetry(() => import('./pages/HolidayManagement'));
const ProjectManagement     = lazyRetry(() => import('./pages/ProjectManagement'));
const TimesheetAdmin        = lazyRetry(() => import('./pages/TimesheetAdmin'));

// System
const AuditTrail            = lazyRetry(() => import('./pages/AuditTrail'));
const Settings              = lazyRetry(() => import('./pages/Settings'));
const Announcements         = lazyRetry(() => import('./pages/Announcements'));

// Contract Management
const ContractManagement    = lazyRetry(() => import('./pages/ContractManagement'));
const ContractEditor        = lazyRetry(() => import('./pages/ContractEditor'));

// Public Career Pages
const PublicCareers         = lazyRetry(() => import('./pages/public/PublicCareers'));
const PublicJobDetail       = lazyRetry(() => import('./pages/public/PublicJobDetail'));
const PublicApplyForm       = lazyRetry(() => import('./pages/public/PublicApplyForm'));

// ─── Lazy: Employee PWA Pages ─────────────────────────────────────────────
const EmpSplash             = lazyRetry(() => import('./pages/employee/EmpSplash'));
const EmpWelcome            = lazyRetry(() => import('./pages/employee/EmpWelcome'));
const EmpLogin              = lazyRetry(() => import('./pages/employee/EmpLogin'));
const EmpRegister           = lazyRetry(() => import('./pages/employee/EmpRegister'));
const EmpResetPassword      = lazyRetry(() => import('./pages/employee/EmpResetPassword'));
const PendingVerificationScreen = lazyRetry(() => import('./components/PendingVerificationScreen'));
const EmpDashboard          = lazyRetry(() => import('./pages/employee/EmpDashboard'));
const EmpAbsen              = lazyRetry(() => import('./pages/employee/EmpAbsen'));
const EmpPayslip            = lazyRetry(() => import('./pages/employee/EmpPayslip'));
const EmpProfile            = lazyRetry(() => import('./pages/employee/EmpProfile'));
const CompanyDirectory      = lazyRetry(() => import('./pages/employee/CompanyDirectory'));
const EmpAnnouncements      = lazyRetry(() => import('./pages/employee/EmpAnnouncements'));
const EmpShift              = lazyRetry(() => import('./pages/employee/EmpShift'));
const EmpSubmissions        = lazyRetry(() => import('./pages/employee/EmpSubmissions'));
const EmpProjects           = lazyRetry(() => import('./pages/employee/EmpProjects'));
const EmpTraining           = lazyRetry(() => import('./pages/employee/EmpTraining'));
const EmpPolicy             = lazyRetry(() => import('./pages/employee/EmpPolicy'));
const EmpCalendar           = lazyRetry(() => import('./pages/employee/EmpCalendar'));
const EmpLoan               = lazyRetry(() => import('./pages/employee/EmpLoan'));
const EmpKPI                = lazyRetry(() => import('./pages/employee/EmpKPI'));
const EmpOnboarding         = lazyRetry(() => import('./pages/employee/EmpOnboarding'));
const EmpAssets             = lazyRetry(() => import('./pages/employee/EmpAssets'));
const EmpHelpdesk           = lazyRetry(() => import('./pages/employee/EmpHelpdesk'));
const EmpNotifications      = lazyRetry(() => import('./pages/employee/EmpNotifications'));
const EmpDocuments          = lazyRetry(() => import('./pages/employee/EmpDocuments'));
const EmpSettings           = lazyRetry(() => import('./pages/employee/EmpSettings'));
const EmpLeaveBalance       = lazyRetry(() => import('./pages/employee/EmpLeaveBalance'));
const EmpOvertime           = lazyRetry(() => import('./pages/employee/EmpOvertime'));
const EmpReimbursement      = lazyRetry(() => import('./pages/employee/EmpReimbursement'));
const EmpContracts          = lazyRetry(() => import('./pages/employee/EmpContracts'));
const EmpAppraisal          = lazyRetry(() => import('./pages/employee/EmpAppraisal'));
const EmpTimesheet          = lazyRetry(() => import('./pages/employee/EmpTimesheet'));
const EmpOffboarding        = lazyRetry(() => import('./pages/employee/EmpOffboarding'));
const EmpApprovals          = lazyRetry(() => import('./pages/employee/EmpApprovals'));
const EmpOrgChart           = lazyRetry(() => import('./pages/employee/EmpOrgChart'));
const EmpExpenseOCR         = lazyRetry(() => import('./pages/employee/EmpExpenseOCR'));

/**
 * lazyRetry — lazy() with a one-time reload on chunk-load failure.
 * After a new deploy, cached HTML can reference deleted chunk files, so
 * dynamic imports fail with ChunkLoadError. Reload once per session to
 * fetch the fresh manifest instead of showing a blank page / crash.
 */
function lazyRetry(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const msg = String(err?.message || err || '');
      const isChunkError =
        /chunkloaderror|loading chunk|dynamically imported|importing a module script failed|failed to fetch dynamically imported module/i.test(
          msg,
        );
      if (isChunkError) {
        try {
          if (!sessionStorage.getItem('kk_chunk_reloaded')) {
            sessionStorage.setItem('kk_chunk_reloaded', '1');
            window.location.reload();
          }
        } catch {
          /* storage blocked — just rethrow */
        }
      }
      throw err;
    }),
  );
}

// ─── Shared page loading spinner ─────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

/* Smart redirect based on auth state */
// Request persistent storage on app load (prevents cache eviction)
if (typeof window !== 'undefined') {
  requestPersistentStorage().catch(() => {});
}

function RootRedirect() {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;

  // Always show landing page on root "/" — regardless of auth state
  // Users navigate to /dashboard, /login, etc. themselves
  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
}

/* Smart redirect for authenticated users hitting protected routes */
// Dipakai di /login: user yang sudah login langsung diarahkan ke tujuan per-role;
// user yang belum login tetap melihat form login (children).
function AuthRedirect({ children }) {
  const { user, employee, loading, hasOnboarding, onboardingLoading } = useAuth();

  if (loading || onboardingLoading) return <PageLoader />;
  if (!user) return children;
  const role = getRole(employee);
  const founderUser = isFounder(user, employee);

  const rawSaved = (() => {
    try { return localStorage.getItem('hrisync_last_path'); } catch { return null; }
  })();

  // Founder: always go to founder portal
  if (founderUser) {
    const founderSavedPath = rawSaved?.startsWith('/founder')
      ? sanitizeAppPath(rawSaved, '/founder/dashboard')
      : null;
    return <Navigate to={founderSavedPath || '/founder/dashboard'} replace />;
  }

  // Pending / rejected employee accounts
  const status = employee?.account_status;
  if (status === 'pending_verification' || (status && String(status).includes('pending'))) {
    return <Navigate to="/app/pending" replace />;
  }
  if (status === 'rejected') {
    return <Navigate to="/app/rejected" replace />;
  }

  // No employee record: differentiate new Google signups vs unregistered employees
  if (user && !employee) {
    const isGoogleUser = user.app_metadata?.provider === 'google';
    const hasGrace = safeGetItem('hrisync_sub_grace');
    if (isGoogleUser && !hasGrace) {
      return <Navigate to={hasOnboarding ? '/not-registered' : '/checkout'} replace />;
    }
    if (!hasGrace) {
      return <Navigate to="/checkout" replace />;
    }
  }

  // HR Admin / Manager / Super Admin → always Desktop HR portal
  const isHROrManager = ['super_admin', 'hr_admin', 'manager'].includes(role);
  if (isHROrManager) {
    if (!safeGetItem('hrisync_sub_grace')) {
      safeSetItem('hrisync_sub_grace', 'true');
    }
    const savedPath = sanitizeAppPath(rawSaved, '/dashboard');
    const restorable = savedPath
      && !savedPath.startsWith('/app')
      && !savedPath.startsWith('/founder')
      && savedPath !== '/login';
    return <Navigate to={restorable ? savedPath : '/dashboard'} replace />;
  }

  // Employee → PWA always
  const empSaved = sanitizeAppPath(rawSaved, '/app/home');
  const empSavedPath = empSaved.startsWith('/app') ? empSaved : '/app/home';
  return <Navigate to={empSavedPath} replace />;
}

/** Strip stray # from address bar on every navigation */
function HashCleaner() {
  const location = useLocation();
  useEffect(() => {
    stripUrlHash();
  }, [location.pathname, location.search]);
  return null;
}

/**
 * RouteErrorBoundary — boundary per-area yang reset otomatis saat pathname berubah.
 * Mencegah satu halaman error mengunci seluruh Routes (masalah boundary global tunggal).
 */
function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

/**
 * FounderGuard — route-level firewall for all /founder/* paths.
 */
function FounderGuard({ children }) {
  const { user, employee, loading } = useAuth();
  const [roleLoading, setRoleLoading] = useState(true);
  const [hasFounderRole, setHasFounderRole] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Fail-open timeout: a hung employees lookup must never trap founders
    // on an infinite spinner (offline / RLS hang).
    const timeout = setTimeout(() => {
      if (!cancelled) { setHasFounderRole(true); setRoleLoading(false); }
    }, 12000);
    async function checkFounderRole() {
      if (loading) return;
      if (!user?.id) {
        if (!cancelled) { setHasFounderRole(false); setRoleLoading(false); }
        return;
      }
      try {
        const { data } = await supabase
          .from('employees')
          .select('role')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        // Consistent with FounderLayout: only an existing non-founder row
        // denies. A missing row (founder never onboarded as employee) allows
        // through — FounderLayout surfaces the recovery hint.
        if (!cancelled) setHasFounderRole(!data || data?.role === 'founder');
      } catch {
        // Lookup failure (RLS/network) — don't hard-block on infra noise;
        // FounderLayout re-verifies with its own checks + deny screen.
        if (!cancelled) setHasFounderRole(true);
      } finally {
        if (!cancelled) setRoleLoading(false);
        clearTimeout(timeout);
      }
    }
    checkFounderRole();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [loading, user?.id]);

  if (loading || (user && roleLoading)) {
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
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const authorized = isFounder(user, employee) && hasFounderRole;
  if (!authorized) {
    console.warn('[FounderGuard] Blocked non-founder access attempt from:', user?.email);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * MaintenanceGuard — redirects non-founder users to /maintenance.
 * Reads maintenance status from Supabase (platform_settings table),
 * so it applies to ALL users across all browsers instantly.
 * Fail-open timeout: a hung platform_settings query must never trap users
 * on an infinite spinner.
 */
function MaintenanceGuard({ children }) {
  const { user, employee, loading } = useAuth();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Founder bypasses check entirely
    if (!loading && isFounder(user, employee)) {
      setCheckDone(true);
      return undefined;
    }
    if (loading) return undefined;

    const timeout = setTimeout(() => {
      // Fail-open: never trap the app behind a hung settings query
      if (!cancelled) setCheckDone(true);
    }, 12000);

    // Query Supabase for maintenance status
    Promise.resolve()
      .then(() => supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'is_maintenance')
        .maybeSingle())
        .then(({ data }) => {
          if (cancelled) return;
          setIsMaintenance(data?.value === 'true' || data?.value === true);
          setCheckDone(true);
          clearTimeout(timeout);
        })
        .catch(() => {
          // Table may not exist yet — don't block the app
          if (!cancelled) setCheckDone(true);
          clearTimeout(timeout);
        });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [loading, user, employee]);

  if (loading || !checkDone) return <PageLoader />;
  if (isFounder(user, employee)) return children;
  if (isMaintenance) return <Navigate to="/maintenance" replace />;
  return children;
}

/**
 * SubscriptionGuard — blocks access without active subscription.
 */
function SubscriptionGuard({ children }) {
  const {
    user,
    employee,
    subscription,
    loading,
    hasOnboarding,
    onboardingLoading,
    isDemo,
  } = useAuth();

  // Wait until session + employee + subscription + onboarding checks settle
  if (loading || onboardingLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  // Demo mode — read-only access, no Supabase session needed.
  // Gated on DEMO_ENABLED: isDemoMode() alone is not trusted (sessionStorage is user-writable).
  if ((isDemo || isDemoMode()) && DEMO_ENABLED) return children;

  if (!user) return <Navigate to="/login" replace />;
  if (isFounder(user, employee)) return children;

  // No employee record — route only after onboarding check finished
  if (!employee) {
    if (user?.app_metadata?.provider === 'google') {
      // hasOnboarding = true → company onboarded but not in employees → block
      // hasOnboarding = false → brand new Google sign-up → checkout
      return <Navigate to={hasOnboarding ? '/not-registered' : '/checkout'} replace />;
    }
    return <Navigate to="/checkout" replace />;
  }

  const role = getRole(employee);
  // Employees use PWA; no company subscription gate on desktop for pure employee role
  if (role === 'employee') return children;

  // ⚠️ SECURITY: use AuthContext enrichment only (is_active / computed_status)
  // Expiry is evaluated in fetchSubscription — do not trust raw status=active alone
  // (expired rows can still have status 'active' in DB)
  const isActive = Boolean(
    subscription
    && (
      subscription.is_active === true
      || subscription.computed_status === 'active'
      || subscription.status === 'trial'
    )
  );

  if (!isActive) {
    return <Navigate to="/checkout" replace />;
  }

  return children;
}

/**
 * AdminRouteGuard — restricts the desktop admin portal to founders and
 * non-employee roles while preserving the existing subscription and
 * maintenance checks.
 */
function AdminRouteGuard({ children }) {
  const { user, employee, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isFounder(user, employee) && getRole(employee) === 'employee') {
    return <Navigate to="/employee-web-access" replace />;
  }

  return children;
}

/**
 * GlobalResetBoundary — global ErrorBoundary that auto-resets on navigation.
 * Must live INSIDE BrowserRouter (uses useLocation for resetKey).
 */
function GlobalResetBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <AuthProvider>
      <FeatureFlagProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <SkipLink />
            <UpdatePrompt />
            <BrowserRouter>
              <GlobalResetBoundary>
              <PageViewTracker />
              <HashCleaner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<RouteErrorBoundary><RootRedirect /></RouteErrorBoundary>} />
                  <Route path="/login" element={<RouteErrorBoundary><AuthRedirect><AuthPage /></AuthRedirect></RouteErrorBoundary>} />
                  <Route path="/landing" element={<RouteErrorBoundary><LandingPage /></RouteErrorBoundary>} />
                  <Route path="/install" element={<RouteErrorBoundary><InstallGuide /></RouteErrorBoundary>} />
                  <Route path="/checkout" element={<RouteErrorBoundary><CheckoutPage /></RouteErrorBoundary>} />
                  <Route path="/onboarding-form" element={<RouteErrorBoundary><OnboardingForm /></RouteErrorBoundary>} />
                  <Route path="/setup" element={<RouteErrorBoundary><OwnerSetupWizard /></RouteErrorBoundary>} />
                  <Route path="/harga" element={<RouteErrorBoundary><Harga /></RouteErrorBoundary>} />
                  <Route path="/fitur" element={<RouteErrorBoundary><FiturPage /></RouteErrorBoundary>} />
                  <Route path="/privacy" element={<RouteErrorBoundary><PrivacyPolicy /></RouteErrorBoundary>} />
                  <Route path="/blog" element={<RouteErrorBoundary><Blog /></RouteErrorBoundary>} />
                  <Route path="/blog/:slug" element={<RouteErrorBoundary><BlogPost /></RouteErrorBoundary>} />
                  <Route path="/employee-web-access" element={<RouteErrorBoundary><EmployeeWebAccess /></RouteErrorBoundary>} />
                  <Route path="/not-registered"      element={<RouteErrorBoundary><NotRegistered /></RouteErrorBoundary>} />
                  {/* Admin portal — layout route di "/*" (bukan "/" duplikat) agar
                      tidak berebut match dengan RootRedirect di atas. */}
                  <Route path="/*" element={
                    <RouteErrorBoundary>
                    <SubscriptionGuard>
                      <MaintenanceGuard>
                        <AdminRouteGuard>
                          <BranchProvider><DashboardLayout /></BranchProvider>
                        </AdminRouteGuard>
                      </MaintenanceGuard>
                    </SubscriptionGuard>
                    </RouteErrorBoundary>
                  }>
                    <Route path="dashboard"        element={<Dashboard />} />
                    <Route path="approvals"         element={<ApprovalDashboard />} />

                    {/* Employee Management */}
                    <Route path="employees"         element={<Employees />} />
                    <Route path="employees/:id"     element={<EmployeeProfile />} />
                    <Route path="org-chart"         element={<OrgChart />} />
                    <Route path="documents"         element={<Documents />} />
                    <Route path="branches"          element={<BranchManagement />} />
                    <Route path="profile-requests"  element={<ProfileRequests />} />
                    <Route path="departments"       element={<Departments />} />
                    <Route path="onboarding"        element={<OnboardingChecklist />} />
                    <Route path="offboarding"       element={<Offboarding />} />

                    {/* Time & Attendance */}
                    <Route path="attendance"        element={<Attendance />} />
                    <Route path="shifts"            element={<ShiftManagement />} />
                    <Route path="leave"             element={<LeaveManagement />} />
                    <Route path="leave-management"  element={<Navigate to="/leave" replace />} />
                    <Route path="overtime"          element={<Overtime />} />
                    <Route path="geo-attendance"    element={<GeofenceAttendance />} />

                    {/* Payroll & Finance */}
                    <Route path="payroll"           element={<Payroll />} />
                    <Route path="payslips"          element={<Payslips />} />
                    <Route path="reimbursement"     element={<Reimbursement />} />
                    <Route path="expense-ocr"       element={<ExpenseOCR />} />
                    <Route path="loans"             element={<LoanManagement />} />
                    <Route path="loan"              element={<Navigate to="/loans" replace />} />

                    {/* Performance */}
                    <Route path="kpi"               element={<KPITracking />} />
                    <Route path="appraisal"         element={<Appraisal />} />

                    {/* Recruitment */}
                    <Route path="jobs"              element={<JobPosting />} />
                    <Route path="job-posting"       element={<Navigate to="/jobs" replace />} />
                    <Route path="candidates"        element={<CandidatePipeline />} />

                    {/* IT & Support */}
                    {/* /it-assets — avoid collision with Vite static /assets/* bundles */}
                    <Route path="it-assets"         element={<AssetManagement />} />
                    <Route path="assets"            element={<Navigate to="/it-assets" replace />} />
                    <Route path="helpdesk"          element={<Helpdesk />} />

                    {/* AI & Dev */}
                    <Route path="ai-capability"     element={<AICapability />} />

                    {/* Training & Learning */}
                    <Route path="training"          element={<TrainingManagement />} />

                    {/* Calendar & Holidays */}
                    <Route path="calendar"          element={<CalendarView />} />
                    <Route path="holidays"          element={<HolidayManagement />} />

                    {/* Projects */}
                    <Route path="projects"          element={<ProjectManagement />} />
                    <Route path="timesheets"        element={<TimesheetAdmin />} />
                    <Route path="timesheet"         element={<Navigate to="/timesheets" replace />} />

                    {/* System */}
                    <Route path="audit-trail"       element={<AuditTrail />} />
                    <Route path="settings"          element={<Settings />} />
                    <Route path="announcements"     element={<Announcements />} />

                    {/* Premium */}
                    <Route path="analytics"         element={<AnalyticsReportBuilder />} />
                    <Route path="integrations"      element={<IntegrationHub />} />
                    <Route path="policies"          element={<CompanyPolicyCenter />} />

                    {/* Contract Management */}
                    <Route path="contracts"                     element={<ContractManagement />} />
                    <Route path="contracts/edit/:id"            element={<ContractEditor isTemplate={false} />} />
                    <Route path="contracts/template/:id"        element={<ContractEditor isTemplate={true} />} />
                    {/* Unknown admin path → 404 di dalam shell dashboard */}
                    <Route path="*" element={<NotFound />} />
                  </Route>

                  {/* Public Career Pages (no auth required) */}
                  <Route path="/careers/:slug"              element={<RouteErrorBoundary><PublicCareers /></RouteErrorBoundary>} />
                  <Route path="/careers/:slug/job/:jobId"   element={<RouteErrorBoundary><PublicJobDetail /></RouteErrorBoundary>} />
                  <Route path="/careers/:slug/apply/:jobId" element={<RouteErrorBoundary><PublicApplyForm /></RouteErrorBoundary>} />

                  {/* Founder Portal — triple-guarded */}
                  <Route path="/founder" element={
                    <RouteErrorBoundary>
                    <FounderGuard>
                      <FounderLayout />
                    </FounderGuard>
                    </RouteErrorBoundary>
                  }>
                    <Route index element={<Navigate to="/founder/dashboard" replace />} />
                    <Route path="dashboard"         element={<FounderDashboard />} />
                    <Route path="subscribers"       element={<FounderSubscribers />} />
                    <Route path="subscriptions"     element={<FounderSubscriptions />} />
                    <Route path="vouchers"          element={<FounderVouchers />} />
                    <Route path="companies"         element={<FounderCompanies />} />
                    <Route path="analytics"         element={<FounderAnalytics />} />
                    <Route path="broadcast"         element={<FounderBroadcast />} />
                    <Route path="support"           element={<FounderSupport />} />
                    <Route path="platform-settings" element={<FounderSettings />} />
                    <Route path="backup"            element={<FounderBackup />} />
                    {/* Unknown founder path → 404 di dalam shell founder */}
                    <Route path="*" element={<NotFound />} />
                  </Route>

                  {/* Maintenance page */}
                  <Route path="/maintenance" element={<RouteErrorBoundary><MaintenancePage /></RouteErrorBoundary>} />

                  {/* Employee PWA — public routes (splash → welcome → login/register) */}
                  <Route path="/app/splash"          element={<RouteErrorBoundary><EmpSplash /></RouteErrorBoundary>} />
                  <Route path="/app/welcome"         element={<RouteErrorBoundary><EmpWelcome /></RouteErrorBoundary>} />
                  <Route path="/app/login"           element={<RouteErrorBoundary><EmpLogin /></RouteErrorBoundary>} />
                  <Route path="/app/register"        element={<RouteErrorBoundary><EmpRegister /></RouteErrorBoundary>} />
                  <Route path="/app/reset-password"  element={<RouteErrorBoundary><EmpResetPassword /></RouteErrorBoundary>} />
                  <Route path="/app/pending"         element={<RouteErrorBoundary><PendingVerificationScreen /></RouteErrorBoundary>} />
                  <Route path="/app/rejected"        element={<RouteErrorBoundary><PendingVerificationScreen /></RouteErrorBoundary>} />

                  {/* Employee PWA — protected routes */}
                  <Route path="/app" element={<RouteErrorBoundary><EmployeeLayout /></RouteErrorBoundary>}>
                    <Route index element={<Navigate to="/app/home" replace />} />
                    <Route path="home"          element={<EmpDashboard />} />
                    <Route path="absen"         element={<EmpAbsen />} />
                    <Route path="payslip"       element={<EmpPayslip />} />
                    <Route path="profile"       element={<EmpProfile />} />
                    <Route path="directory"     element={<CompanyDirectory />} />
                    <Route path="announcements" element={<EmpAnnouncements />} />
                    <Route path="shift"         element={<EmpShift />} />
                    <Route path="submissions"   element={<EmpSubmissions />} />
                    <Route path="projects"      element={<EmpProjects />} />
                    <Route path="training"      element={<EmpTraining />} />
                    <Route path="policy"        element={<EmpPolicy />} />
                    <Route path="calendar"      element={<EmpCalendar />} />
                    <Route path="loan"          element={<EmpLoan />} />
                    <Route path="kpi"           element={<EmpKPI />} />
                    <Route path="onboarding"    element={<EmpOnboarding />} />
                    <Route path="assets"        element={<EmpAssets />} />
                    <Route path="helpdesk"      element={<EmpHelpdesk />} />
                    <Route path="notifications" element={<EmpNotifications />} />
                    <Route path="documents"     element={<EmpDocuments />} />
                    <Route path="settings"      element={<EmpSettings />} />
                    <Route path="leave-balance" element={<EmpLeaveBalance />} />
                    <Route path="overtime"      element={<EmpOvertime />} />
                    <Route path="reimbursement" element={<EmpReimbursement />} />
                    <Route path="contracts"     element={<EmpContracts />} />
                    <Route path="appraisal"     element={<EmpAppraisal />} />
                    <Route path="timesheet"     element={<EmpTimesheet />} />
                    <Route path="offboarding"   element={<EmpOffboarding />} />
                    <Route path="approvals"     element={<EmpApprovals />} />
                    <Route path="org-chart"     element={<EmpOrgChart />} />
                    <Route path="expense-ocr"   element={<EmpExpenseOCR />} />
                    {/* Unknown PWA path → render NotFound inside PWA shell.
                        /app/* SubscriptionGuard bypass is intentional: PWA auth is
                        handled by EmployeeLayout, not the desktop subscription gate. */}
                    <Route path="*" element={<NotFound />} />
                  </Route>

                  {/* 404 — always last */}
                  <Route path="*" element={<RouteErrorBoundary><NotFound /></RouteErrorBoundary>} />
                </Routes>
              </Suspense>
              </GlobalResetBoundary>
            </BrowserRouter>
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
      </FeatureFlagProvider>
    </AuthProvider>
  );
}

export default App;
