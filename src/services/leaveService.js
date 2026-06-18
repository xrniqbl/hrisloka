import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendLeaveApprovalEmail } from './emailService';
import { sendWhatsApp, buildLeaveStatusMessage } from './whatsappService';

// Submit leave request
export async function submitLeave(employeeId, leaveData) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: employeeId,
      type: leaveData.type,
      start_date: leaveData.startDate,
      end_date: leaveData.endDate,
      days: leaveData.days,
      reason: leaveData.reason,
      status: 'pending',
    })
    .select()
    .single();
  return { data, error };
}

// Get my leave requests
export async function getMyLeaves(employeeId) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Cancel leave request — update status instead of hard delete (preserves audit trail)
export async function cancelLeave(leaveId) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', leaveId)
    .eq('status', 'pending')
    .select()
    .single();
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

// Update leave status (admin) — with auto email + WA notification
export async function updateLeave(id, updates) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update(updates)
    .eq('id', id)
    .select('*, employees(name, email, phone)')
    .single();

  // Auto-notify employee if status changed to approved/rejected
  if (!error && data && (updates.status === 'approved' || updates.status === 'rejected')) {
    const emp = data.employees;
    const startDate = new Date(data.start_date).toLocaleDateString('id-ID');
    const endDate = new Date(data.end_date).toLocaleDateString('id-ID');

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
  }

  return { data, error };
}

// Update leave status by status string (used by ApprovalDashboard)
export async function updateLeaveStatus(id, status, approverId) {
  const updates = { status };
  if (approverId && status === 'approved') updates.approved_by = approverId;
  return updateLeave(id, updates);
}

// Alias for component compatibility
export const getAllLeaveRequests = getAllLeaves;
