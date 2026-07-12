import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendLeaveApprovalEmail } from './emailService';
import { sendWhatsApp, buildLeaveStatusMessage } from './whatsappService';

// Submit leave request
export async function submitLeave(employeeId, leaveData) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  if (!leaveData?.startDate || !leaveData?.endDate) {
    return { data: null, error: { message: 'Tanggal mulai dan selesai wajib diisi' } };
  }
  if (leaveData.endDate < leaveData.startDate) {
    return { data: null, error: { message: 'Tanggal selesai tidak boleh sebelum tanggal mulai' } };
  }
  const days = leaveData.days ?? (
    Math.ceil((new Date(leaveData.endDate) - new Date(leaveData.startDate)) / 86400000) + 1
  );
  if (days < 1 || days > 90) {
    return { data: null, error: { message: 'Jumlah hari cuti tidak valid (1–90)' } };
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: employeeId,
      type: leaveData.type || 'Cuti Tahunan',
      start_date: leaveData.startDate,
      end_date: leaveData.endDate,
      days,
      reason: leaveData.reason || null,
      status: 'pending',
    })
    .select()
    .single();
  return { data, error };
}

// Get my leave requests
export async function getMyLeaves(employeeId) {
  if (!employeeId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Cancel leave request — update status instead of hard delete (preserves audit trail)
export async function cancelLeave(leaveId, employeeId) {
  if (!leaveId) return { data: null, error: { message: 'leaveId required' } };
  let query = supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', leaveId)
    .eq('status', 'pending');
  if (employeeId) query = query.eq('employee_id', employeeId);
  const { data, error } = await query.select().maybeSingle();
  if (!error && !data) {
    return { data: null, error: { message: 'Pengajuan tidak ditemukan atau sudah diproses' } };
  }
  return { data, error };
}

// Get all leave requests — MANDATORY company filter for multi-tenant isolation
export async function getAllLeaves(branchId, companyId) {
  if (!guardCompanyId(companyId, 'getAllLeaves')) return { data: [], error: null };
  let query = supabase
    .from('leave_requests')
    .select('*, employees!inner(name, division, position, branch_id, company_id, email, phone)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });

  if (branchId) query = query.eq('employees.branch_id', branchId);

  const { data, error } = await query;
  return { data: data || [], error };
}

// Update leave status (admin) — with auto email + WA + in-app notification
export async function updateLeave(id, updates, companyId = null) {
  if (!id) return { data: null, error: { message: 'id required' } };

  // When companyId provided, ensure row belongs to company (HR web → multi-tenant)
  if (companyId) {
    if (!guardCompanyId(companyId, 'updateLeave')) {
      return { data: null, error: { message: 'company_id required' } };
    }
    const { data: owned } = await supabase
      .from('leave_requests')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!owned) {
      return { data: null, error: { message: 'Leave request not found in your company' } };
    }
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .update(updates)
    .eq('id', id)
    .select('*, employees(name, email, phone, company_id, auth_user_id)')
    .single();

  // Auto-notify employee if status changed to approved/rejected
  if (!error && data && (updates.status === 'approved' || updates.status === 'rejected')) {
    const emp = data.employees;
    const startDate = new Date(data.start_date).toLocaleDateString('id-ID');
    const endDate = new Date(data.end_date).toLocaleDateString('id-ID');
    const approved = updates.status === 'approved';

    if (emp?.email) {
      sendLeaveApprovalEmail({
        employeeName: emp.name,
        employeeEmail: emp.email,
        status: updates.status,
        leaveType: data.type,
        startDate,
        endDate,
        notes: data.rejection_reason || '',
      }).catch(e => console.warn('[leaveService] email error:', e));
    }

    if (emp?.phone) {
      const msg = buildLeaveStatusMessage(emp.name, updates.status, data.type, startDate, endDate);
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[leaveService] WA error:', e));
    }

    // In-app notification (PWA EmpNotifications + notifications table)
    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId: companyId || emp?.company_id,
        type: 'leave',
        title: approved ? 'Cuti disetujui' : 'Cuti ditolak',
        body: approved
          ? `${data.type || 'Cuti'} ${startDate} – ${endDate} disetujui.`
          : `${data.type || 'Cuti'} ${startDate} – ${endDate} ditolak.`,
        data: { path: '/app/submissions', leaveId: data.id },
      }).catch(() => {});
    } catch { /* optional */ }

    try {
      const { sendLeavePush } = await import('./pushService');
      sendLeavePush(data.employee_id, updates.status, data.type).catch(() => {});
    } catch { /* optional */ }
  }

  return { data, error };
}

// Update leave status by status string (used by ApprovalDashboard / HR Dashboard)
export async function updateLeaveStatus(id, status, approverId, companyId = null) {
  const updates = { status };
  if (approverId && (status === 'approved' || status === 'rejected')) {
    updates.approved_by = approverId;
  }
  return updateLeave(id, updates, companyId);
}

// Alias for component compatibility
export const getAllLeaveRequests = getAllLeaves;
