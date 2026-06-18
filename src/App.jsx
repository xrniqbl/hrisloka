import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackEvent } from './services/founderService';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './lib/i18n';
import ErrorBoundary from './components/ErrorBoundary';
import { getRole, isFounder } from './lib/rbac';
import { ToastProvider } from './components/Toast';
import { BranchProvider } from './context/BranchContext';
import { isDemoMode } from './lib/demoGuard';


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
const FounderDashboard      = lazy(() => import('./pages/founder/FounderDashboard'));
const FounderSubscribers    = lazy(() => import('./pages/founder/FounderSubscribers'));
const FounderSubscriptions  = lazy(() => import('./pages/founder/FounderSubscriptions'));
const FounderVouchers       = lazy(() => import('./pages/founder/FounderVouchers'));
const FounderCompanies      = lazy(() => import('./pages/founder/FounderCompanies'));
const FounderAnalytics      = lazy(() => import('./pages/founder/FounderAnalytics'));
const FounderBroadcast      = lazy(() => import('./pages/founder/FounderBroadcast'));
const FounderSupport        = lazy(() => import('./pages/founder/FounderSupport'));
const FounderSettings       = lazy(() => import('./pages/founder/FounderSettings'));
const FounderBackup         = lazy(() => import('./pages/founder/FounderBackup'));

// ─── Lazy: Auth / Landing (shown before main app loads) ──────────────────
const AuthPage    = lazy(() => import('./pages/AuthPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const InstallGuide = lazy(() => import('./pages/InstallGuide'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const NotFound    = lazy(() => import('./pages/NotFound'));
const Harga       = lazy(() => import('./pages/Harga'));
const FiturPage   = lazy(() => import('./pages/FiturPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const EmployeeWebAccess = lazy(() => import('./pages/EmployeeWebAccess'));
const OnboardingForm    = lazy(() => import('./pages/OnboardingForm'));
const NotRegistered     = lazy(() => import('./pages/NotRegistered'));
const Blog              = lazy(() => import('./pages/Blog'));
const BlogPost          = lazy(() => import('./pages/BlogPost'));

// ─── Lazy: HR Admin Dashboard Pages ──────────────────────────────────────
const Dashboard             = lazy(() => import('./pages/Dashboard'));
const ApprovalDashboard     = lazy(() => import('./pages/ApprovalDashboard'));

// Employee Management
const Employees             = lazy(() => import('./pages/Employees'));
const EmployeeProfile       = lazy(() => import('./pages/EmployeeProfile'));
const OrgChart              = lazy(() => import('./pages/OrgChart'));
const Documents             = lazy(() => import('./pages/Documents'));
const BranchManagement      = lazy(() => import('./pages/BranchManagement'));
const ProfileRequests       = lazy(() => import('./pages/ProfileRequests'));
const Departments           = lazy(() => import('./pages/Departments'));
const OnboardingChecklist   = lazy(() => import('./pages/OnboardingChecklist'));
const Offboarding           = lazy(() => import('./pages/Offboarding'));

// Time & Attendance
const Attendance            = lazy(() => import('./pages/Attendance'));
const ShiftManagement       = lazy(() => import('./pages/ShiftManagement'));
const LeaveManagement       = lazy(() => import('./pages/LeaveManagement'));
const Overtime              = lazy(() => import('./pages/Overtime'));
const GeofenceAttendance    = lazy(() => import('./pages/GeofenceAttendance'));

// Payroll & Finance
const Payroll               = lazy(() => import('./pages/Payroll'));
const Payslips              = lazy(() => import('./pages/Payslips'));
const Reimbursement         = lazy(() => import('./pages/Reimbursement'));
const ExpenseOCR            = lazy(() => import('./pages/ExpenseOCR'));
const LoanManagement        = lazy(() => import('./pages/LoanManagement'));

// Performance
const KPITracking           = lazy(() => import('./pages/KPITracking'));
const Appraisal             = lazy(() => import('./pages/Appraisal'));

// Recruitment
const JobPosting            = lazy(() => import('./pages/JobPosting'));
const CandidatePipeline     = lazy(() => import('./pages/CandidatePipeline'));

// IT & Support
const AssetManagement       = lazy(() => import('./pages/AssetManagement'));
const Helpdesk              = lazy(() => import('./pages/Helpdesk'));

// AI & Premium
const AICapability          = lazy(() => import('./pages/AICapability'));
const AnalyticsReportBuilder = lazy(() => import('./pages/AnalyticsReportBuilder'));
const IntegrationHub        = lazy(() => import('./pages/IntegrationHub'));
const CompanyPolicyCenter   = lazy(() => import('./pages/CompanyPolicyCenter'));

// Training, Calendar, Projects
const TrainingManagement    = lazy(() => import('./pages/TrainingManagement'));
const CalendarView          = lazy(() => import('./pages/CalendarView'));
const HolidayManagement     = lazy(() => import('./pages/HolidayManagement'));
const ProjectManagement     = lazy(() => import('./pages/ProjectManagement'));
const TimesheetAdmin        = lazy(() => import('./pages/TimesheetAdmin'));

// System
const AuditTrail            = lazy(() => import('./pages/AuditTrail'));
const Settings              = lazy(() => import('./pages/Settings'));
const Announcements         = lazy(() => import('./pages/Announcements'));

// Contract Management
const ContractManagement    = lazy(() => import('./pages/ContractManagement'));
const ContractEditor        = lazy(() => import('./pages/ContractEditor'));

// Public Career Pages
const PublicCareers         = lazy(() => import('./pages/public/PublicCareers'));
const PublicJobDetail       = lazy(() => import('./pages/public/PublicJobDetail'));
const PublicApplyForm       = lazy(() => import('./pages/public/PublicApplyForm'));

// ─── Lazy: Employee PWA Pages ─────────────────────────────────────────────
const EmpLogin              = lazy(() => import('./pages/employee/EmpLogin'));
const EmpRegister           = lazy(() => import('./pages/employee/EmpRegister'));
const EmpResetPassword      = lazy(() => import('./pages/employee/EmpResetPassword'));
const PendingVerificationScreen = lazy(() => import('./components/PendingVerificationScreen'));
const EmpDashboard          = lazy(() => import('./pages/employee/EmpDashboard'));
const EmpAbsen              = lazy(() => import('./pages/employee/EmpAbsen'));
const EmpPayslip            = lazy(() => import('./pages/employee/EmpPayslip'));
const EmpProfile            = lazy(() => import('./pages/employee/EmpProfile'));
const CompanyDirectory      = lazy(() => import('./pages/employee/CompanyDirectory'));
const EmpAnnouncements      = lazy(() => import('./pages/employee/EmpAnnouncements'));
const EmpShift              = lazy(() => import('./pages/employee/EmpShift'));
const EmpSubmissions        = lazy(() => import('./pages/employee/EmpSubmissions'));
const EmpProjects           = lazy(() => import('./pages/employee/EmpProjects'));
const EmpTraining           = lazy(() => import('./pages/employee/EmpTraining'));
const EmpPolicy             = lazy(() => import('./pages/employee/EmpPolicy'));
const EmpCalendar           = lazy(() => import('./pages/employee/EmpCalendar'));
const EmpLoan               = lazy(() => import('./pages/employee/EmpLoan'));
const EmpKPI                = lazy(() => import('./pages/employee/EmpKPI'));
const EmpOnboarding         = lazy(() => import('./pages/employee/EmpOnboarding'));
const EmpAssets             = lazy(() => import('./pages/employee/EmpAssets'));
const EmpHelpdesk           = lazy(() => import('./pages/employee/EmpHelpdesk'));
const EmpNotifications      = lazy(() => import('./pages/employee/EmpNotifications'));
const EmpDocuments          = lazy(() => import('./pages/employee/EmpDocuments'));
const EmpSettings           = lazy(() => import('./pages/employee/EmpSettings'));
const EmpLeaveBalance       = lazy(() => import('./pages/employee/EmpLeaveBalance'));
const EmpOvertime           = lazy(() => import('./pages/employee/EmpOvertime'));
const EmpReimbursement      = lazy(() => import('./pages/employee/EmpReimbursement'));
const EmpContracts          = lazy(() => import('./pages/employee/EmpContracts'));
const EmpAppraisal          = lazy(() => import('./pages/employee/EmpAppraisal'));
const EmpTimesheet          = lazy(() => import('./pages/employee/EmpTimesheet'));
const EmpOffboarding        = lazy(() => import('./pages/employee/EmpOffboarding'));
const EmpApprovals          = lazy(() => import('./pages/employee/EmpApprovals'));
const EmpOrgChart           = lazy(() => import('./pages/employee/EmpOrgChart'));
const EmpExpenseOCR         = lazy(() => import('./pages/employee/EmpExpenseOCR'));

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
function RootRedirect() {
  const { user, employee, loading, hasOnboarding } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
  const role = getRole(employee);
  const founderUser = isFounder(user, employee);

  // Founder: always go to founder portal
  const savedPath = localStorage.getItem('hrisync_last_path');
  if (founderUser) {
    const founderSavedPath = savedPath?.startsWith('/founder') ? savedPath : null;
    return <Navigate to={founderSavedPath || '/founder/dashboard'} replace />;
  }

  // No employee record: differentiate new Google signups vs unregistered employees
  if (user && !employee) {
    const isGoogleUser = user.app_metadata?.provider === 'google';
    const hasGrace = localStorage.getItem('hrisync_sub_grace');
    if (isGoogleUser && !hasGrace) {
      // Google user not in employees table.
      // hasOnboarding = true  → they already registered a company but no employee record → block
      // hasOnboarding = false → brand new Google signup → send to checkout (same as email signup)
      return <Navigate to={hasOnboarding ? '/not-registered' : '/checkout'} replace />;
    }
    if (!hasGrace) {
      // New email/password signup → onboarding checkout
      return <Navigate to="/checkout" replace />;
    }
  }

  // HR Admin / Manager / Super Admin → always Desktop HR portal
  const isHROrManager = ['super_admin', 'hr_admin', 'manager'].includes(role);
  if (isHROrManager) {
    if (!localStorage.getItem('hrisync_sub_grace')) {
      localStorage.setItem('hrisync_sub_grace', 'true');
    }
    const restorable = savedPath && !savedPath.startsWith('/app') && !savedPath.startsWith('/founder');
    return <Navigate to={restorable ? savedPath : '/dashboard'} replace />;
  }

  // Employee → PWA always
  const empSavedPath = savedPath?.startsWith('/app') ? savedPath : '/app/home';
  return <Navigate to={empSavedPath} replace />;
}

/**
 * FounderGuard — route-level firewall for all /founder/* paths.
 */
function FounderGuard({ children }) {
  const { user, employee, loading } = useAuth();

  if (loading) {
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

  const authorized = isFounder(user, employee);
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
 */
function MaintenanceGuard({ children }) {
  const { user, employee, loading } = useAuth();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    // Founder bypasses check entirely
    if (!loading && isFounder(user, employee)) {
      setCheckDone(true);
      return;
    }
    if (loading) return;

    // Query Supabase for maintenance status
    import('./lib/supabase').then(({ supabase }) => {
      supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'is_maintenance')
        .maybeSingle()
        .then(({ data }) => {
          setIsMaintenance(data?.value === 'true' || data?.value === true);
          setCheckDone(true);
        })
        .catch(() => {
          // Table may not exist yet — don't block the app
          setCheckDone(true);
        });
    });
  }, [loading, user, employee]);

  if (loading || !checkDone) return null;
  if (isFounder(user, employee)) return children;
  if (isMaintenance) return <Navigate to="/maintenance" replace />;
  return children;
}

/**
 * SubscriptionGuard — blocks access without active subscription.
 */
function SubscriptionGuard({ children }) {
  const { user, employee, subscription, loading, hasOnboarding, isDemo } = useAuth();

  if (loading) return (
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

  // Demo mode — read-only access, no Supabase session needed
  // Check both React state AND sessionStorage to handle race conditions
  if (isDemo || isDemoMode()) return children;

  if (!user) return <Navigate to="/login" replace />;
  if (isFounder(user, employee)) return children;

  // No employee record at all — route based on provider & onboarding status
  if (!employee) {
    if (user?.app_metadata?.provider === 'google') {
      // Google user: hasOnboarding = true → already onboarded company but not in employees → block
      // hasOnboarding = false → brand new Google sign-up → send to checkout
      return <Navigate to={hasOnboarding ? '/not-registered' : '/checkout'} replace />;
    }
    // Non-Google user (email/password) with no employee record → checkout
    return <Navigate to="/checkout" replace />;
  }

  const role = getRole(employee);
  if (role === 'employee') return children;

  // ⚠️ SECURITY: subscription status validated from Supabase only — never from localStorage
  const isActive = subscription?.status === 'active'
    || subscription?.computed_status === 'active'
    || subscription?.is_active === true;

  if (!isActive) {
    return <Navigate to="/checkout" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <PageViewTracker />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/install" element={<InstallGuide />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/onboarding-form" element={<OnboardingForm />} />
                  <Route path="/harga" element={<Harga />} />
                  <Route path="/fitur" element={<FiturPage />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/employee-web-access" element={<EmployeeWebAccess />} />
                  <Route path="/not-registered"      element={<NotRegistered />} />
                  <Route path="/" element={
                    <SubscriptionGuard>
                      <MaintenanceGuard>
                        <BranchProvider><DashboardLayout /></BranchProvider>
                      </MaintenanceGuard>
                    </SubscriptionGuard>
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
                    <Route path="assets"            element={<AssetManagement />} />
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
                  </Route>

                  {/* Public Career Pages (no auth required) */}
                  <Route path="/careers/:slug"              element={<PublicCareers />} />
                  <Route path="/careers/:slug/job/:jobId"   element={<PublicJobDetail />} />
                  <Route path="/careers/:slug/apply/:jobId" element={<PublicApplyForm />} />

                  {/* Founder Portal — triple-guarded */}
                  <Route path="/founder" element={
                    <FounderGuard>
                      <FounderLayout />
                    </FounderGuard>
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
                  </Route>

                  {/* Maintenance page */}
                  <Route path="/maintenance" element={<MaintenancePage />} />

                  {/* Employee PWA — public routes */}
                  <Route path="/app/login"          element={<EmpLogin />} />
                  <Route path="/app/register"        element={<EmpRegister />} />
                  <Route path="/app/reset-password"  element={<EmpResetPassword />} />
                  <Route path="/app/pending"         element={<PendingVerificationScreen />} />
                  <Route path="/app/rejected"        element={<PendingVerificationScreen />} />

                  {/* Employee PWA — protected routes */}
                  <Route path="/app" element={<EmployeeLayout />}>
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
                  </Route>

                  {/* 404 — always last */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

export default App;
