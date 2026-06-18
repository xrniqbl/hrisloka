import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

/**
 * Log an action to the audit_trails table.
 */
export async function logAction({ action, targetTable, targetId, oldValue, newValue, companyId }) {
  const { data: { user } } = await supabase.auth.getUser();

  return await supabase
    .from('audit_trails')
    .insert({
      user_id: user?.id,
      action,
      target_table: targetTable,
      target_id: String(targetId),
      old_value: oldValue,
      new_value: newValue,
      company_id: companyId || null,
    });
}

/**
 * Get all audit logs (Admin view) — scoped by company for multi-tenant isolation.
 * Uses audit_logs_view if available (after migration), else falls back to raw table.
 */
export async function getAuditLogs(companyId) {
  if (!guardCompanyId(companyId, 'getAuditLogs')) return { data: [], error: null };

  // Try the view first (created by migration_phase2_settings.sql)
  const { data: viewData, error: viewError } = await supabase
    .from('audit_logs_view')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (!viewError && viewData) {
    // Normalize to expected shape { employees: { name } }
    return {
      data: viewData.map(log => ({
        ...log,
        employees: log.user_name ? { name: log.user_name } : { name: log.user_email || '—' },
      })),
      error: null,
    };
  }

  // Fallback: raw table with company filter
  const { data, error } = await supabase
    .from('audit_trails')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  return {
    data: (data || []).map(log => ({ ...log, employees: { name: '—' } })),
    error,
  };
}
