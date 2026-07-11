/**
 * Multi-tenant isolation guard.
 * Prevents cross-tenant data leaks when companyId is accidentally omitted.
 *
 * Usage in services:
 *   if (!guardCompanyId(companyId, 'getAllEmployees')) return { data: [], error: null };
 */
import { supabase } from './supabase';

export function guardCompanyId(companyId, context = '') {
  if (companyId === null || companyId === undefined || companyId === '') {
    console.warn(`[TENANT GUARD] ${context}: company_id required — blocking cross-tenant query`);
    return false;
  }
  return true;
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
    if (!user?.id) return null;
    const { data } = await supabase
      .from('employees')
      .select('company_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    return data?.company_id ?? null;
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
  if (String(mine) !== String(companyId)) {
    console.warn(`[TENANT GUARD] ${context}: company mismatch mine=${mine} target=${companyId}`);
    return false;
  }
  return true;
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
