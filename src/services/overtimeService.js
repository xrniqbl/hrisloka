import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendWhatsApp } from './whatsappService';
import { sendPushToEmployee } from './pushService';

// Get all overtime requests (admin) — MANDATORY company scope
export async function getAllOvertime(branchId, companyId) {
  if (!guardCompanyId(companyId, 'getAllOvertime')) return { data: [], error: null };
  let query = supabase
    .from('overtime_requests')
    .select('*, employees!inner(name, division, position, branch_id, company_id)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  if (branchId) query = query.eq('employees.branch_id', branchId);
  const { data, error } = await query;
  return { data: data || [], error };
}

// Get overtime for specific employee
export async function getMyOvertime(employeeId) {
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });
  return { data: data || [], error };
}

// Submit overtime request
export async function submitOvertime(employeeId, overtimeData) {
  const { data, error } = await supabase
    .from('overtime_requests')
    .insert({
      employee_id: employeeId,
      date: overtimeData.date,
      hours: overtimeData.hours,
      rate: overtimeData.rate || 1.5,
      reason: overtimeData.reason,
      project_id: overtimeData.projectId || null,
      status: 'pending',
    })
    .select()
    .single();
  return { data, error };
}

// Approve overtime — MANDATORY company ownership via employee join
export async function approveOvertime(id, approverId, companyId) {
  if (companyId) {
    const { data: ot } = await supabase
      .from('overtime_requests')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!ot) return { data: null, error: { message: 'Overtime request not found in your company' } };
  }
  const { data, error } = await supabase
    .from('overtime_requests')
    .update({ status: 'approved', approved_by: approverId })
    .eq('id', id)
    .select('*, employees(name, email, phone, auth_user_id)')
    .single();

  // Auto-notify employee when approved
  if (!error && data) {
    const emp = data.employees;
    const otDate = data.date || '';
    const otHours = data.hours || 0;
    if (emp?.phone) {
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nPengajuan lembur ${otDate} (${otHours} jam) telah *DISETUJUI*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[overtimeService] WA error:', e));
    }
    if (emp?.auth_user_id) {
      sendPushToEmployee(emp.auth_user_id, 'HRIS Loka — Lembur Disetujui ✅', `Lembur ${otDate} (${otHours} jam) telah disetujui.`, '/app/overtime')
        .catch(e => console.warn('[overtimeService] push error:', e));
    }
  }

  return { data, error };
}

// Reject overtime — MANDATORY company ownership via employee join
export async function rejectOvertime(id, companyId) {
  if (companyId) {
    const { data: ot } = await supabase
      .from('overtime_requests')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!ot) return { data: null, error: { message: 'Overtime request not found in your company' } };
  }
  const { data, error } = await supabase
    .from('overtime_requests')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select('*, employees(name, email, phone, auth_user_id)')
    .single();

  // Auto-notify employee when rejected
  if (!error && data) {
    const emp = data.employees;
    const otDate = data.date || '';
    if (emp?.phone) {
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nPengajuan lembur ${otDate} telah *DITOLAK*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[overtimeService] WA error:', e));
    }
    if (emp?.auth_user_id) {
      sendPushToEmployee(emp.auth_user_id, 'HRIS Loka — Lembur Ditolak ❌', `Lembur ${otDate} ditolak.`, '/app/overtime')
        .catch(e => console.warn('[overtimeService] push error:', e));
    }
  }

  return { data, error };
}

// Delete overtime — MANDATORY company ownership
export async function deleteOvertime(id, companyId) {
  if (companyId) {
    const { data: ot } = await supabase
      .from('overtime_requests')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!ot) return { error: { message: 'Overtime request not found in your company' } };
  }
  const { error } = await supabase.from('overtime_requests').delete().eq('id', id);
  return { error };
}
