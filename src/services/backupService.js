import { supabase } from '../lib/supabase';

// ── Snapshot ──────────────────────────────────────────────────
export async function createSnapshot(companyId) {
  return supabase.rpc('fn_create_daily_snapshot', { p_company_id: companyId });
}

export async function runAllSnapshots() {
  return supabase.rpc('fn_run_all_daily_snapshots');
}

export async function getSnapshots(companyId, limit = 30) {
  let q = supabase
    .from('company_snapshots')
    .select('id, company_id, snapshot_date, attendance_count, leave_count, payroll_summary, created_at')
    .order('snapshot_date', { ascending: false })
    .limit(limit);
  if (companyId) q = q.eq('company_id', companyId);
  return q;
}

export async function getSnapshotDetail(id) {
  return supabase
    .from('company_snapshots')
    .select('*')
    .eq('id', id)
    .single();
}

// ── Backup Logs ───────────────────────────────────────────────
export async function getBackupLogs(limit = 50) {
  return supabase
    .from('backup_logs')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
}

// ── Deleted Records (Soft Delete) ────────────────────────────
export async function getDeletedRecords({ tableName, companyId, limit = 50 } = {}) {
  let q = supabase
    .from('deleted_records')
    .select('id, company_id, table_name, record_id, deleted_at, restore_key, is_restored, record_data')
    .eq('is_restored', false)
    .order('deleted_at', { ascending: false })
    .limit(limit);
  if (tableName) q = q.eq('table_name', tableName);
  if (companyId) q = q.eq('company_id', companyId);
  return q;
}

export async function restoreRecord(restoreKey) {
  return supabase.rpc('fn_restore_deleted_record', { p_restore_key: restoreKey });
}

export async function cleanupOldBackups() {
  return supabase.rpc('fn_cleanup_old_backups');
}

// ── Export CSV (client-side) ──────────────────────────────────
export async function exportCompanyDataCSV(companyId, tableName) {
  const tableMap = {
    employees: () => supabase
      .from('employees')
      .select('id, employee_id, full_name, position, department_id, role, status, created_at')
      .eq('company_id', companyId),
    payroll_records: () => supabase
      .from('payroll_records')
      .select('id, employee_id, pay_period_start, pay_period_end, gross_salary, net_salary, status')
      .in('employee_id', supabase.from('employees').select('id').eq('company_id', companyId)),
    attendance: () => supabase
      .from('attendance')
      .select('id, employee_id, date, check_in, check_out, status')
      .in('employee_id', supabase.from('employees').select('id').eq('company_id', companyId)),
  };

  const query = tableMap[tableName];
  if (!query) return { error: 'Table not supported for export' };

  const { data, error } = await query();
  if (error || !data) return { error };

  // Convert to CSV
  if (data.length === 0) return { data: '', count: 0 };
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
