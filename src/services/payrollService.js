import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all payroll records (admin) — MANDATORY company scope
export async function getAllPayroll(period, companyId) {
  if (!guardCompanyId(companyId, 'getAllPayroll')) return { data: [], error: null };
  let query = supabase
    .from('payroll_records')
    .select('*, employees!inner(name, nip, division, position, bank_account, company_id)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  if (period) query = query.eq('period', period);
  const { data, error } = await query;
  return { data: data || [], error };
}

// Get payroll for specific employee — scoped by employee ownership
export async function getMyPayroll(employeeId) {
  if (!employeeId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('period', { ascending: false });
  return { data: data || [], error };
}

// Save payroll record — verify employee belongs to the caller's company
export async function savePayroll(record, companyId) {
  if (companyId) {
    // Verify the employee belongs to this company before saving
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', record.employee_id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!emp) return { data: null, error: { message: 'Employee not found in your company' } };
  }
  const { data, error } = await supabase
    .from('payroll_records')
    .upsert({
      employee_id: record.employee_id,
      period: record.period,
      base_salary: record.base_salary,
      allowance: record.allowance,
      overtime_pay: record.overtime_pay,
      overtime_hours: record.overtime_hours,
      gross_income: record.gross_income,
      bpjs_kesehatan: record.bpjs_kesehatan,
      bpjs_jht: record.bpjs_jht,
      bpjs_jp: record.bpjs_jp,
      pph21: record.pph21,
      total_deductions: record.total_deductions,
      take_home_pay: record.take_home_pay,
      status: record.status || 'generated',
    }, { onConflict: 'employee_id,period' })
    .select()
    .single();
  return { data, error };
}

// Batch save payroll records — verify all employees belong to the caller's company
export async function batchSavePayroll(records, companyId) {
  if (companyId) {
    const employeeIds = [...new Set(records.map(r => r.employee_id))];
    const { data: emps } = await supabase
      .from('employees')
      .select('id')
      .in('id', employeeIds)
      .eq('company_id', companyId);
    const validIds = new Set((emps || []).map(e => e.id));
    const validRecords = records.filter(r => validIds.has(r.employee_id));
    if (validRecords.length === 0) return { data: [], error: { message: 'No valid employees found in your company' } };
    records = validRecords;
  }
  const { data, error } = await supabase
    .from('payroll_records')
    .upsert(records, { onConflict: 'employee_id,period' })
    .select();
  return { data: data || [], error };
}

// Mark payroll as paid — verify company ownership via join
export async function markAsPaid(id, companyId) {
  let query = supabase
    .from('payroll_records')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id);
  if (companyId) {
    // Only allow marking as paid if the employee belongs to this company
    const { data: record } = await supabase
      .from('payroll_records')
      .select('employee_id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!record) return { data: null, error: { message: 'Payroll record not found in your company' } };
  }
  const { data, error } = await query.select().single();
  return { data, error };
}
