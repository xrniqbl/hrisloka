import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Snapshot ──────────────────────────────────────────────────
export async function createSnapshot(companyId) {
  return supabase.rpc('fn_create_daily_snapshot', { p_company_id: companyId });
}

export async function runAllSnapshots() {
  return supabase.rpc('fn_run_all_daily_snapshots');
}

export async function getSnapshots(companyId, limit = 30) {
  if (!guardCompanyId(companyId, 'getSnapshots')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('company_snapshots')
    .select('id, company_id, snapshot_date, attendance_count, leave_count, payroll_summary, created_at')
    .eq('company_id', companyId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

// Get snapshot detail — MANDATORY company ownership
export async function getSnapshotDetail(id, companyId) {
  if (!guardCompanyId(companyId, 'getSnapshotDetail')) return { data: null, error: { message: 'company_id required' } };
  const { data, error } = await supabase
    .from('company_snapshots')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  return { data, error };
}

// ── Backup Logs ───────────────────────────────────────────────
// MANDATORY company scope
export async function getBackupLogs(companyId, limit = 50) {
  if (!guardCompanyId(companyId, 'getBackupLogs')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('backup_logs')
    .select('*, companies(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

// ── Deleted Records (Soft Delete) ────────────────────────────
export async function getDeletedRecords({ tableName, companyId, limit = 50 } = {}) {
  if (!guardCompanyId(companyId, 'getDeletedRecords')) return { data: [], error: null };
  let q = supabase
    .from('deleted_records')
    .select('id, company_id, table_name, record_id, deleted_at, restore_key, is_restored, record_data')
    .eq('is_restored', false)
    .eq('company_id', companyId)
    .order('deleted_at', { ascending: false })
    .limit(limit);
  if (tableName) q = q.eq('table_name', tableName);
  const { data, error } = await q;
  return { data: data || [], error };
}

export async function restoreRecord(restoreKey) {
  return supabase.rpc('fn_restore_deleted_record', { p_restore_key: restoreKey });
}

export async function cleanupOldBackups() {
  return supabase.rpc('fn_cleanup_old_backups');
}

// ── Export CSV (client-side) — FIXED: resolves subqueries before using .in() ──
export async function exportCompanyDataCSV(companyId, tableName) {
  if (!guardCompanyId(companyId, 'exportCompanyDataCSV')) return { error: 'company_id required' };

  if (tableName === 'employees') {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_id, name, nip, position, division, role, status, created_at')
      .eq('company_id', companyId);
    if (error) return { error };
    return buildCSVResult(data, tableName, companyId);
  }

  if (tableName === 'payroll_records' || tableName === 'attendance') {
    // First resolve employee IDs for this company
    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId);
    if (empErr) return { error: empErr };
    const employeeIds = (emps || []).map(e => e.id);
    if (employeeIds.length === 0) return { data: '', count: 0 };

    let query;
    if (tableName === 'payroll_records') {
      query = supabase
        .from('payroll_records')
        .select('id, employee_id, period, base_salary, take_home_pay, status')
        .in('employee_id', employeeIds);
    } else {
      query = supabase
        .from('attendance')
        .select('id, employee_id, date, clock_in, clock_out, status')
        .in('employee_id', employeeIds);
    }

    const { data, error } = await query;
    if (error) return { error };
    return buildCSVResult(data, tableName, companyId);
  }

  return { error: 'Table not supported for export' };
}

function buildCSVResult(data, tableName, companyId) {
  if (!data || data.length === 0) return { data: '', count: 0 };
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r =>
    Object.values(r).map(v =>
      v === null ? '' : typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v)
    ).join(',')
  );
  return {
    data: [headers, ...rows].join('\n'),
    count: data.length,
    filename: `${tableName}_company${companyId}_${new Date().toISOString().slice(0, 10)}.csv`
  };
}
