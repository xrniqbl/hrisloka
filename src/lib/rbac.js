/**
 * RBAC — Role definitions and permission maps
 * Roles:
 *   founder     = HRIS Loka founder (god mode)
 *   super_admin = Owner/bos perusahaan yang berlangganan
 *   hr_admin    = Staf HRD perusahaan
 *   manager     = Manager divisi
 *   employee    = Karyawan biasa
 */

// FOUNDER EMAIL — ONLY this exact email can access the Founder Portal.
// MUST be set via VITE_FOUNDER_EMAIL env variable. No hardcoded fallback for security.
export const FOUNDER_EMAIL = import.meta.env.VITE_FOUNDER_EMAIL ?? '';
if (!FOUNDER_EMAIL) {
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
 hr_admin: '#0047AB',
 manager: '#8B5CF6',
 employee: '#6D8196',
};

/**
 * Route → minimum role map
 * Routes not listed here are accessible to all authenticated users.
 * Founder always has access to everything.
 */
export const ROUTE_PERMISSIONS = {
  // Owner (super_admin) only — billing & system
  '/branches':        ['super_admin'],
  '/audit-trail':     ['super_admin'],
  '/integrations':    ['super_admin'],
  '/checkout':        ['super_admin'],
  '/subscription':    ['super_admin'],

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
  '/reimbursement':   ['super_admin', 'hr_admin'],
  '/expense-ocr':     ['super_admin', 'hr_admin'],
  '/shifts':          ['super_admin', 'hr_admin'],
  '/jobs':            ['super_admin', 'hr_admin'],
  '/candidates':      ['super_admin', 'hr_admin'],
  '/assets':          ['super_admin', 'hr_admin'],
  '/offboarding':     ['super_admin', 'hr_admin'],
  '/onboarding':      ['super_admin', 'hr_admin'],
  '/training':        ['super_admin', 'hr_admin'],
  '/holidays':        ['super_admin', 'hr_admin'],
  '/loans':           ['super_admin', 'hr_admin'],
  '/geo-attendance':  ['super_admin', 'hr_admin'],
  '/ai-capability':   ['super_admin', 'hr_admin'],
  '/contracts':       ['super_admin', 'hr_admin'],
  '/approvals':       ['super_admin', 'hr_admin'],
  '/kpi':             ['super_admin', 'hr_admin'],
  '/appraisal':       ['super_admin', 'hr_admin'],
  '/attendance':      ['super_admin', 'hr_admin'],
  '/leave':           ['super_admin', 'hr_admin'],
  '/overtime':        ['super_admin', 'hr_admin'],
  '/projects':        ['super_admin', 'hr_admin'],
  '/timesheets':      ['super_admin', 'hr_admin'],
  '/dashboard':       ['super_admin', 'hr_admin'],
  '/org-chart':       ['super_admin', 'hr_admin'],
  '/announcements':   ['super_admin', 'hr_admin'],
  '/helpdesk':        ['super_admin', 'hr_admin'],
  '/calendar':        ['super_admin', 'hr_admin'],
};

/**
 * Check if the logged-in user is the founder
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
 
 const allowedRoles = ROUTE_PERMISSIONS[path];
 // If no specific permission defined, allow all authenticated users
 if (!allowedRoles) return true;
 return allowedRoles.includes(role || 'employee');
}

/**
 * Check sidebar visibility — respects "View As" for founder
 */
export function hasSidebarAccess(role, path) {
 const allowedRoles = ROUTE_PERMISSIONS[path];
 if (!allowedRoles) return true;
 return allowedRoles.includes(role || 'employee');
}

/**
 * Get the employee role (from employee record or fallback to 'employee')
 */
export function getRole(employee) {
 return employee?.role || 'employee';
}
