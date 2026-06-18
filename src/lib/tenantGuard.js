/**
 * Multi-tenant isolation guard.
 * Prevents cross-tenant data leaks when companyId is accidentally omitted.
 *
 * Usage in services:
 *   if (!guardCompanyId(companyId, 'getAllEmployees')) return { data: [], error: null };
 */
export function guardCompanyId(companyId, context = '') {
  if (!companyId) {
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
  // Escape PostgREST special characters: ( ) , . % _
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[(),."']/g, '')
    .slice(0, 200); // limit length
}
