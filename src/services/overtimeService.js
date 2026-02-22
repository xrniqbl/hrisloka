import { supabase } from '../lib/supabase';

// Get all overtime requests (admin)
export async function getAllOvertime() {
    const { data, error } = await supabase
        .from('overtime_requests')
        .select('*, employees(name, division, position)')
        .order('created_at', { ascending: false });
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

// Approve overtime
export async function approveOvertime(id, approverId) {
    const { data, error } = await supabase
        .from('overtime_requests')
        .update({ status: 'approved', approved_by: approverId })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Reject overtime
export async function rejectOvertime(id) {
    const { data, error } = await supabase
        .from('overtime_requests')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete overtime
export async function deleteOvertime(id) {
    const { error } = await supabase
        .from('overtime_requests')
        .delete()
        .eq('id', id);
    return { error };
}
