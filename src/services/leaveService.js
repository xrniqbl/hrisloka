import { supabase } from '../lib/supabase';

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

// Cancel leave request (only if pending)
export async function cancelLeave(leaveId) {
    const { data, error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', leaveId)
        .eq('status', 'pending');
    return { data, error };
}

// Get all leave requests (admin)
export async function getAllLeaves() {
    const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employees(name, division, position)')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Update leave status (admin)
export async function updateLeave(id, updates) {
    const { data, error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}
