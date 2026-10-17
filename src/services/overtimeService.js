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
  if (!employeeId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });
  return { data: data || [], error };
}

// Submit overtime request
export async function submitOvertime(employeeId, overtimeData) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  if (!overtimeData?.date) {
    return { data: null, error: { message: 'Tanggal lembur wajib diisi' } };
  }
  const hours = parseFloat(overtimeData.hours);
  if (!hours || hours <= 0 || hours > 24) {
    return { data: null, error: { message: 'Jumlah jam lembur tidak valid (0.5–24)' } };
  }

  const { data, error } = await supabase
    .from('overtime_requests')
    .insert({
      employee_id: employeeId,
      date: overtimeData.date,
      hours,
      rate: overtimeData.rate || 1.5,
      reason: overtimeData.reason || null,
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
      const msg = `🏢 *KiniKerja*\n\nHalo, *${emp.name}*!\n\nPengajuan lembur ${otDate} (${otHours} jam) telah *DISETUJUI*.\n\n_KiniKerja — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[overtimeService] WA error:', e));
    }
    // pushService expects employees.id (not auth_user_id)
    sendPushToEmployee(data.employee_id || emp?.id, 'KiniKerja — Lembur Disetujui ✅', `Lembur ${otDate} (${otHours} jam) telah disetujui.`, '/app/overtime', companyId)
      .catch(e => console.warn('[overtimeService] push error:', e));
    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId: companyId || emp?.company_id,
        type: 'approval',
        title: 'Lembur disetujui',
        body: `Lembur ${otDate} (${otHours} jam) telah disetujui.`,
        data: { path: '/app/submissions' },
      }).catch(() => {});
    } catch { /* optional */ }
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
      const msg = `🏢 *KiniKerja*\n\nHalo, *${emp.name}*!\n\nPengajuan lembur ${otDate} telah *DITOLAK*.\n\n_KiniKerja — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[overtimeService] WA error:', e));
    }
    sendPushToEmployee(data.employee_id || emp?.id, 'KiniKerja — Lembur Ditolak ❌', `Lembur ${otDate} ditolak.`, '/app/overtime', companyId)
      .catch(e => console.warn('[overtimeService] push error:', e));
    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId: companyId || emp?.company_id,
        type: 'approval',
        title: 'Lembur ditolak',
        body: `Lembur ${otDate} ditolak.`,
        data: { path: '/app/submissions' },
      }).catch(() => {});
    } catch { /* optional */ }
  }

  return { data, error };
}

// Delete overtime — MANDATORY scope: company (HR) or owner employee (PWA withdraw).
// companyId alone is NOT enough for PWA (any coworker could delete by id);
// employeeId pins the row to its owner.
export async function deleteOvertime(id, companyId, employeeId = null) {
  const { data: ot } = await supabase
    .from('overtime_requests')
    .select('id, employee_id, employees!inner(company_id)')
    .eq('id', id)
    .maybeSingle();
  if (!ot) return { error: { message: 'Overtime request not found' } };
  if (companyId && String(ot.employees?.company_id) !== String(companyId)) {
    return { error: { message: 'Overtime request not found in your company' } };
  }
  if (employeeId && String(ot.employee_id) !== String(employeeId)) {
    return { error: { message: 'not your overtime request' } };
  }
  if (!companyId && !employeeId) {
    return { error: { message: 'company_id or employeeId required' } };
  }
  const { error } = await supabase.from('overtime_requests').delete().eq('id', id);
  return { error };
}
