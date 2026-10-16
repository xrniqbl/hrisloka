/**
 * Multi-tenant isolation guard.
 * Prevents cross-tenant data leaks when companyId is accidentally omitted.
 *
 * Usage in services:
 *   if (!guardCompanyId(companyId, 'getAllEmployees')) return { data: [], error: null };
 *
 * Prefer assertSameCompany() when the caller must match the JWT tenant.
 */
import { supabase } from './supabase';
import { isFounder } from './rbac';

export function guardCompanyId(companyId, context = '') {
  if (companyId === null || companyId === undefined || companyId === '') {
    console.warn(`[TENANT GUARD] ${context}: company_id required — blocking cross-tenant query`);
    return false;
  }
  // Reject obvious injection / non-scalar noise
  if (typeof companyId === 'object') {
    console.warn(`[TENANT GUARD] ${context}: company_id must be scalar`);
    return false;
  }
  return true;
}

/**
 * Normalize company id for comparisons (string form, trim).
 */
export function normalizeCompanyId(companyId) {
  if (companyId === null || companyId === undefined || companyId === '') return null;
  return String(companyId).trim();
}

/**
 * Return empty result shape used by list services when guard fails.
 */
export function blockedList(context = '') {
  console.warn(`[TENANT GUARD] ${context}: blocked`);
  return { data: [], error: { message: 'tenant isolation', code: 'TENANT_BLOCKED' } };
}

export function blockedOne(context = '') {
  console.warn(`[TENANT GUARD] ${context}: blocked`);
  return { data: null, error: { message: 'tenant isolation', code: 'TENANT_BLOCKED' } };
}

/**
 * Sanitize user input for Supabase PostgREST .or()/.ilike() filters.
 * Prevents filter injection by escaping special PostgREST chars.
 */
export function sanitizeFilterInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[(),."']/g, '')
    .slice(0, 200);
}

/**
 * Resolve the logged-in user's company_id from employees.
 * Returns null if unauthenticated or no employee row.
 */
export async function resolveMyCompanyId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id && !user?.email) return null;
    if (user?.id) {
      const { data } = await supabase
        .from('employees')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (data?.company_id) return data.company_id;
    }
    // Email fallback (mirrors AuthContext loadProfile): legacy rows may only
    // be linked by email, not auth_user_id. Fail-closed on duplicates:
    // never pick one of several rows sharing the same email.
    if (user?.email) {
      const { data } = await supabase
        .from('employees')
        .select('company_id')
        .eq('email', user.email)
        .limit(2);
      if (Array.isArray(data) && data.length > 1) {
        console.warn('[TENANT GUARD] resolveMyCompanyId: duplicate email matches — failing closed');
        return null;
      }
      if (data?.[0]?.company_id) return data[0].company_id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve logged-in employee id + company_id.
 */
export async function resolveMyEmployee() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data } = await supabase
      .from('employees')
      .select('id, company_id, role, email, auth_user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Ensure a target companyId matches the caller's company (unless founder).
 * Returns true if allowed.
 */
export async function assertSameCompany(companyId, context = '') {
  if (!guardCompanyId(companyId, context)) return false;
  const mine = await resolveMyCompanyId();
  if (mine == null) {
    console.warn(`[TENANT GUARD] ${context}: caller has no company_id`);
    return false;
  }
  if (normalizeCompanyId(mine) !== normalizeCompanyId(companyId)) {
    console.warn(`[TENANT GUARD] ${context}: company mismatch mine=${mine} target=${companyId}`);
    return false;
  }
  return true;
}

/**
 * Strict scope: resolve caller's company and force filter to that id only.
 * Returns null if unauthenticated / no tenant (caller should abort query).
 */
export async function requireMyCompanyId(context = '') {
  const cid = await resolveMyCompanyId();
  if (!guardCompanyId(cid, context || 'requireMyCompanyId')) return null;
  return cid;
}

/**
 * Founder may bypass tenant scope (platform-wide). Everyone else must match.
 */
export async function assertCompanyOrFounder(companyId, context = '') {
  if (!guardCompanyId(companyId, context)) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const me = await resolveMyEmployee();
    if (user && isFounder(user, me)) return true;
  } catch { /* fall through */ }
  return assertSameCompany(companyId, context);
}

/**
 * Attach company_id to an insert payload; refuse if missing.
 */
export function withCompanyId(payload, companyId, context = '') {
  if (!guardCompanyId(companyId, context)) return null;
  return { ...payload, company_id: companyId };
}

/**
 * Ensure employeeId belongs to the given companyId (or caller's company).
 */
export async function assertEmployeeInCompany(employeeId, companyId = null, context = '') {
  if (!employeeId) {
    console.warn(`[TENANT GUARD] ${context}: employee_id required`);
    return false;
  }
  const cid = companyId ?? (await resolveMyCompanyId());
  if (!guardCompanyId(cid, context)) return false;

  const { data, error } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .eq('company_id', cid)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[TENANT GUARD] ${context}: employee ${employeeId} not in company ${cid}`);
    return false;
  }
  return true;
}
