import { supabase } from '../lib/supabase';
import {
  guardCompanyId,
  assertEmployeeInCompany,
  resolveMyEmployee,
} from '../lib/tenantGuard';

/**
 * Notifications are employee-scoped. Always verify the employee belongs to
 * the caller's company (or is the caller themselves) before read/write.
 */

// ── Notifications ─────────────────────────────────────────────────

export async function getNotifications(employeeId, companyId = null) {
  if (!employeeId) return { data: [], error: { message: 'employee_id required' } };

  const ok = await assertEmployeeInCompany(employeeId, companyId, 'getNotifications');
  if (!ok) return { data: [], error: { message: 'tenant isolation: employee not in company' } };

  return supabase
    .from('notifications')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(50);
}

/**
 * Unread count for an employee. Returns -1 on error (not 0).
 */
export async function getUnreadCount(employeeId, companyId = null) {
  if (!employeeId) return -1;

  const ok = await assertEmployeeInCompany(employeeId, companyId, 'getUnreadCount');
  if (!ok) return -1;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('read', false);

  if (error) {
    console.error('[notificationService] getUnreadCount error:', error.message);
    return -1;
  }
  return count || 0;
}

/** Mark one notification read — only if it belongs to an employee in our company */
export async function markRead(id, employeeId = null) {
  if (!id) return { data: null, error: { message: 'id required' } };

  // Prefer scoped update when employeeId known
  if (employeeId) {
    const ok = await assertEmployeeInCompany(employeeId, null, 'markRead');
    if (!ok) return { data: null, error: { message: 'tenant isolation' } };
    return supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('employee_id', employeeId);
  }

  // Fallback: only allow if notification's employee is in caller's company
  const me = await resolveMyEmployee();
  if (!me?.company_id) return { data: null, error: { message: 'no company' } };

  const { data: row } = await supabase
    .from('notifications')
    .select('id, employee_id, employees:employee_id!inner(company_id)')
    .eq('id', id)
    .maybeSingle();

  if (!row || String(row.employees?.company_id) !== String(me.company_id)) {
    return { data: null, error: { message: 'tenant isolation' } };
  }

  return supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead(employeeId, companyId = null) {
  if (!employeeId) return { data: null, error: { message: 'employee_id required' } };

  const ok = await assertEmployeeInCompany(employeeId, companyId, 'markAllRead');
  if (!ok) return { data: null, error: { message: 'tenant isolation' } };

  return supabase
    .from('notifications')
    .update({ read: true })
    .eq('employee_id', employeeId)
    .eq('read', false);
}

/**
 * Create notification for an employee in the same company.
 * @param {{ employeeId, type, title, body?, message?, data?, companyId? }}
 */
export async function createNotification({
  employeeId,
  type,
  title,
  body,
  message,
  data = {},
  companyId = null,
}) {
  if (!employeeId || !type || !title) {
    return { data: null, error: { message: 'employeeId, type, title required' } };
  }

  const ok = await assertEmployeeInCompany(employeeId, companyId, 'createNotification');
  if (!ok) return { data: null, error: { message: 'tenant isolation: target employee not in company' } };

  const text = message || body || null;
  const row = {
    employee_id: employeeId,
    type,
    title,
    body: text,
    data,
  };
  // Prefer schema with body; some DBs also have message
  let result = await supabase.from('notifications').insert({
    ...row,
    message: text,
  }).select().single();

  if (result.error && /message|column/i.test(result.error.message || '')) {
    result = await supabase.from('notifications').insert(row).select().single();
  }
  // Retry without data/jsonb if needed
  if (result.error && /data|column/i.test(result.error.message || '')) {
    result = await supabase.from('notifications').insert({
      employee_id: employeeId,
      type,
      title,
      body: text,
    }).select().single();
  }
  return result;
}

/**
 * Bulk notify many employees — all must be in companyId.
 */
export async function createNotificationsForCompany(companyId, employeeIds, { type, title, body, data = {} }) {
  if (!guardCompanyId(companyId, 'createNotificationsForCompany')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return { data: [], error: null };
  }

  // Verify all targets belong to company
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .in('id', employeeIds);

  if (empErr) return { data: null, error: empErr };
  const allowed = new Set((emps || []).map((e) => e.id));
  const rows = employeeIds
    .filter((id) => allowed.has(id))
    .map((employeeId) => ({
      employee_id: employeeId,
      type,
      title,
      message: body || null,
      body: body || null,
      data,
    }));

  if (rows.length === 0) return { data: [], error: null };
  return supabase.from('notifications').insert(rows).select();
}

export async function deleteNotification(id, employeeId = null) {
  if (!id) return { data: null, error: { message: 'id required' } };

  if (employeeId) {
    const ok = await assertEmployeeInCompany(employeeId, null, 'deleteNotification');
    if (!ok) return { data: null, error: { message: 'tenant isolation' } };
    return supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('employee_id', employeeId);
  }

  const me = await resolveMyEmployee();
  if (!me?.company_id) return { data: null, error: { message: 'no company' } };

  const { data: row } = await supabase
    .from('notifications')
    .select('id, employees:employee_id!inner(company_id)')
    .eq('id', id)
    .maybeSingle();

  if (!row || String(row.employees?.company_id) !== String(me.company_id)) {
    return { data: null, error: { message: 'tenant isolation' } };
  }

  return supabase.from('notifications').delete().eq('id', id);
}
