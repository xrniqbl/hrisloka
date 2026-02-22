import { supabase } from '../lib/supabase';

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

// Get all pending update requests (admin side)
export async function getAllUpdateRequests(statusFilter) {
    let query = supabase
        .from('profile_update_requests')
        .select('*, employees(name, nip, division, position, photo_url)')
        .order('requested_at', { ascending: false });
    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }
    const { data, error } = await query;
    return { data: data || [], error };
}

// Approve a profile update request (admin side)
export async function approveRequest(requestId, reviewerId) {
    // 1. Get the request
    const { data: req, error: fetchErr } = await supabase
        .from('profile_update_requests')
        .select('*')
        .eq('id', requestId)
        .single();
    if (fetchErr) return { error: fetchErr };

    // 2. Apply the change to employees table
    const updatePayload = {};
    // Handle JSONB fields
    const jsonFields = ['emergency_contact', 'bank_account', 'education', 'work_history', 'certifications'];
    if (jsonFields.includes(req.field_name)) {
        try { updatePayload[req.field_name] = JSON.parse(req.new_value); } catch { updatePayload[req.field_name] = req.new_value; }
    } else {
        updatePayload[req.field_name] = req.new_value;
    }

    const { error: updateErr } = await supabase
        .from('employees')
        .update(updatePayload)
        .eq('id', req.employee_id);
    if (updateErr) return { error: updateErr };

    // 3. Mark request as approved
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

// Get pending count for admin badge
export async function getPendingRequestCount() {
    const { count, error } = await supabase
        .from('profile_update_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
    return { count: count || 0, error };
}
