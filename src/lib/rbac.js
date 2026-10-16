/**
 * RBAC — Role definitions and permission maps
 * Roles:
 *   founder     = KiniKerja founder (god mode)
 *   super_admin = Owner/bos perusahaan yang berlangganan
 *   hr_admin    = Staf HRD perusahaan
 *   manager     = Manager divisi
 *   employee    = Karyawan biasa
 */

// FOUNDER EMAIL — ONLY this exact email can access the Founder Portal.
// MUST be set via VITE_FOUNDER_EMAIL env variable. No hardcoded fallback for security.
export const FOUNDER_EMAIL = import.meta.env.VITE_FOUNDER_EMAIL ?? '';
if (!FOUNDER_EMAIL && import.meta.env.DEV) {
  console.error('[RBAC] SECURITY: VITE_FOUNDER_EMAIL is not set. Founder portal will be inaccessible.');
}

export function isFounderRoute(path) {
 return path?.startsWith('/founder');
}

export const ROLES = {
 FOUNDER: 'founder',
 SUPER_ADMIN: 'super_admin',
 HR_ADMIN: 'hr_admin',
 MANAGER: 'manager',
 EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
 founder: 'Founder',
 super_admin: 'Owner',        // Pemilik/subscriber perusahaan
 hr_admin: 'HR Admin',        // Staf HRD
 manager: 'Manager',
 employee: 'Employee',
};

export const ROLE_COLORS = {
 founder: '#F59E0B',
 super_admin: '#DC2626',
 hr_admin: '#635BFF',
 manager: '#8B5CF6',
 employee: '#6D8196',
};

/**
 * Route → minimum role map
 * DEFAULT-DENY: only routes explicitly listed in ROUTE_PERMISSIONS or
 * PUBLIC_PATHS are reachable. Unknown paths return false — AdminRouteGuard
 * and DashboardLayout treat that as "no access" (404/denied, never fail-open).
 * Founder always has access to everything.
 */
export const PUBLIC_PATHS = [
  '/',
  '/login',
  '/checkout',
  '/setup',
  '/onboarding-form',
  '/landing',
  '/install',
  '/harga',
  '/fitur',
  '/blog',
  '/careers',
  '/employee-web-access',
  '/not-registered',
  '/maintenance',
  // Employee PWA auth is enforced by EmployeeLayout (guards above), not by
  // the desktop ROUTE_PERMISSIONS map — listing the /app prefix here keeps
  // hasAccess honest about these being intentionally reachable public shells.
  '/app/splash',
  '/app/welcome',
  '/app/login',
  '/app/register',
  '/app/reset-password',
  '/app/pending',
  '/app/rejected',
];
export const ROUTE_PERMISSIONS = {
  // Owner (super_admin) only — billing & system
  '/branches':        ['super_admin'],
  '/audit-trail':     ['super_admin'],
  '/integrations':    ['super_admin'],
  '/checkout':        ['super_admin'],
  // NOTE: no '/subscription' route exists in App.jsx — billing lives at
  // /checkout (renew) + /settings (status). Kept out of the map so a stale
  // link fails closed to NotFound instead of a phantom permission entry.

  // HR Admin + Super Admin (all web admin features)
  '/settings':        ['super_admin', 'hr_admin'],
  '/analytics':       ['super_admin', 'hr_admin'],
  '/policies':        ['super_admin', 'hr_admin'],
  '/employees':       ['super_admin', 'hr_admin'],
  '/departments':     ['super_admin', 'hr_admin'],
  '/documents':       ['super_admin', 'hr_admin'],
  '/profile-requests':['super_admin', 'hr_admin'],
  '/payroll':         ['super_admin', 'hr_admin'],
  '/payslips':        ['super_admin', 'hr_admin'],
  '/expense-ocr':     ['super_admin', 'hr_admin'],
  '/shifts':          ['super_admin', 'hr_admin'],
  '/jobs':            ['super_admin', 'hr_admin'],
  '/candidates':      ['super_admin', 'hr_admin'],
  '/assets':          ['super_admin', 'hr_admin'], // legacy alias
  '/it-assets':       ['super_admin', 'hr_admin'],
  '/offboarding':     ['super_admin', 'hr_admin'],
  '/onboarding':      ['super_admin', 'hr_admin'],
  '/training':        ['super_admin', 'hr_admin'],
  '/holidays':        ['super_admin', 'hr_admin'],
  '/loans':           ['super_admin', 'hr_admin'],
  '/geo-attendance':  ['super_admin', 'hr_admin'],
  '/ai-capability':   ['super_admin', 'hr_admin'],
  '/contracts':       ['super_admin', 'hr_admin'],

  // Manager + HR Admin + Super Admin
  // Manager scope (per EmployeeProfile role card): approvals (cuti/lembur/
  // reimburse), KPI & appraisal, proyek & timesheet, absensi tim, plus the
  // shared read surfaces (dashboard, org chart, calendar, announcements, help).
  '/approvals':       ['super_admin', 'hr_admin', 'manager'],
  '/kpi':             ['super_admin', 'hr_admin', 'manager'],
  '/appraisal':       ['super_admin', 'hr_admin', 'manager'],
  '/attendance':      ['super_admin', 'hr_admin', 'manager'],
  '/leave':           ['super_admin', 'hr_admin', 'manager'],
  '/overtime':        ['super_admin', 'hr_admin', 'manager'],
  '/reimbursement':   ['super_admin', 'hr_admin', 'manager'],
  '/projects':        ['super_admin', 'hr_admin', 'manager'],
  '/timesheets':      ['super_admin', 'hr_admin', 'manager'],
  '/dashboard':       ['super_admin', 'hr_admin', 'manager'],
  '/org-chart':       ['super_admin', 'hr_admin', 'manager'],
  '/announcements':   ['super_admin', 'hr_admin', 'manager'],
  '/helpdesk':        ['super_admin', 'hr_admin', 'manager'],
  '/calendar':        ['super_admin', 'hr_admin', 'manager'],
};

/**
 * Check if the logged-in user is the founder.
 * Client-side UX gate ONLY — real enforcement lives in Postgres RLS
 * (is_founder() SQL). Never rely on this for authorization server-side.
 */
export function isFounder(user, employee) {
 const email = user?.email || employee?.email || '';
 return email.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}

/**
 * Check if a role has access to a route.
 * Founder always has full access regardless of viewAs role.
 * When founder uses "View As", sidebar filters by that role but routes are never blocked.
 */
export function hasAccess(role, path, isFounderUser = false) {
 // Founder always has access
 if (isFounderUser) return true;
 // Founder routes are blocked for non-founders
 if (isFounderRoute(path)) return false;
 // Explicit public paths (landing, login, checkout, setup)
 if (PUBLIC_PATHS.includes(path)) return true;
 // Public prefix routes: careers detail pages, blog posts
 if (path === '/careers' || path?.startsWith('/careers/')) return true;
 if (path === '/blog' || path?.startsWith('/blog/')) return true;

 let allowedRoles = ROUTE_PERMISSIONS[path];
 if (!allowedRoles && path) {
   // Nested admin routes (e.g. /contracts/edit/123, /employees/456) inherit
   // the longest matching parent prefix instead of failing closed.
   const parent = Object.keys(ROUTE_PERMISSIONS)
     .filter((p) => path === p || path.startsWith(p + '/'))
     .sort((a, b) => b.length - a.length)[0];
   if (parent) allowedRoles = ROUTE_PERMISSIONS[parent];
 }
 // Default-deny: unknown routes are NOT accessible (fail-closed)
 if (!allowedRoles) return false;
 return allowedRoles.includes(role || 'employee');
}

/**
 * Check sidebar visibility — respects "View As" for founder.
 * Fail-closed like hasAccess: unknown paths return false so a missing map
 * entry hides (rather than exposes) the nav item.
 */
export function hasSidebarAccess(role, path, isFounderUser = false) {
 if (isFounderUser) return true;
 if (isFounderRoute(path)) return false;
 if (PUBLIC_PATHS.includes(path)) return true;
 if (path === '/careers' || path?.startsWith('/careers/')) return true;
 if (path === '/blog' || path?.startsWith('/blog/')) return true;
 let allowedRoles = ROUTE_PERMISSIONS[path];
 if (!allowedRoles && path) {
   // Nested admin routes (e.g. /employees/456, /contracts/edit/123) inherit
   // the longest matching parent prefix — mirrors hasAccess.
   const parent = Object.keys(ROUTE_PERMISSIONS)
     .filter((p) => path === p || path.startsWith(p + '/'))
     .sort((a, b) => b.length - a.length)[0];
   if (parent) allowedRoles = ROUTE_PERMISSIONS[parent];
 }
 if (!allowedRoles) return false;
 return allowedRoles.includes(role || 'employee');
}

/**
 * Get the employee role (from employee record or fallback to 'employee')
 */
export function getRole(employee) {
 return employee?.role || 'employee';
}
