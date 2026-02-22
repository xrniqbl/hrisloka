import { supabase } from '../lib/supabase';

// Get all payroll records (admin)
export async function getAllPayroll(period) {
    let query = supabase
        .from('payroll_records')
        .select('*, employees(name, nip, division, position, bank_account)')
        .order('created_at', { ascending: false });
    if (period) query = query.eq('period', period);
    const { data, error } = await query;
    return { data: data || [], error };
}

// Get payroll for specific employee
export async function getMyPayroll(employeeId) {
    const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('period', { ascending: false });
    return { data: data || [], error };
}

// Save payroll record
export async function savePayroll(record) {
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

// Batch save payroll records
export async function batchSavePayroll(records) {
    const { data, error } = await supabase
        .from('payroll_records')
        .upsert(records, { onConflict: 'employee_id,period' })
        .select();
    return { data: data || [], error };
}

// Mark payroll as paid
export async function markAsPaid(id) {
    const { data, error } = await supabase
        .from('payroll_records')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}
