import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all profile update requests (admin) — MANDATORY company scope
export async function getAllUpdateRequests(statusFilter, companyId) {
  if (!guardCompanyId(companyId, 'getAllUpdateRequests')) return { data: [], error: null };
  let query = supabase
    .from('profile_update_requests')
    .select('*, employees!inner(name, nip, division, position, photo_url, company_id)')
    .eq('employees.company_id', companyId)
    .order('requested_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);
  const { data, error } = await query;
  return { data: data || [], error };
}

// Submit a profile update request (employee side)
export async function submitUpdateRequest(employeeId, fieldName, fieldLabel, oldValue, newValue) {
  const { data, error } = await supabase
    .from('profile_update_requests')
    .insert({
      employee_id: employeeId,
      field_name: fieldName,
      field_label: fieldLabel,
      old_value: oldValue || '',
      new_value: newValue,
    })
    .select()
    .single();
  return { data, error };
}

// Get my update requests (employee side)
export async function getMyUpdateRequests(employeeId) {
  const { data, error } = await supabase
    .from('profile_update_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('requested_at', { ascending: false });
  return { data: data || [], error };
}

// Approve a profile update request (admin side) — MANDATORY company ownership
export async function approveRequest(requestId, reviewerId, companyId) {
  const { data: req, error: fetchErr } = await supabase
    .from('profile_update_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchErr) return { error: fetchErr };

  if (req.field_name) {
    const updatePayload = {};
    const jsonFields = ['emergency_contact', 'bank_account', 'education', 'work_history', 'certifications'];
    let fieldName = req.field_name;
    let newValue = req.new_value;

    if (newValue && newValue.includes('||')) {
      const parts = newValue.split('||');
      fieldName = parts[0];
      newValue = parts[1];
    }

    if (jsonFields.includes(fieldName)) {
      try { updatePayload[fieldName] = JSON.parse(newValue); } catch { updatePayload[fieldName] = newValue; }
    } else {
      updatePayload[fieldName] = newValue;
    }

    let empQuery = supabase
      .from('employees')
      .update(updatePayload)
      .eq('id', req.employee_id);
    if (companyId) empQuery = empQuery.eq('company_id', companyId);
    const { error: updateErr } = await empQuery;
    if (updateErr) return { error: updateErr };
  }

  const { data, error } = await supabase
    .from('profile_update_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', requestId)
    .select()
    .single();
  return { data, error };
}

// Reject a profile update request (admin side)
export async function rejectRequest(requestId, reviewerId, note) {
  const { data, error } = await supabase
    .from('profile_update_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      review_note: note || '',
    })
    .eq('id', requestId)
    .select()
    .single();
  return { data, error };
}

// Get pending count for admin badge — MANDATORY company scope
export async function getPendingRequestCount(companyId) {
  if (!guardCompanyId(companyId, 'getPendingRequestCount')) return { count: 0, error: null };
  const { data, error } = await supabase
    .from('profile_update_requests')
    .select('id, employees!inner(company_id)')
    .eq('status', 'pending')
    .eq('employees.company_id', companyId);
  return { count: (data || []).length, error };
}
