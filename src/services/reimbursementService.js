import { supabase } from '../lib/supabase';

// Submit reimbursement
export async function submitReimbursement(employeeId, reimbData) {
    const { data, error } = await supabase
        .from('reimbursements')
        .insert({
            employee_id: employeeId,
            category: reimbData.category,
            date: reimbData.date || new Date().toISOString().split('T')[0],
            amount: parseInt(reimbData.amount),
            receipt_url: reimbData.receiptUrl || null,
            notes: reimbData.notes,
            status: 'pending',
        })
        .select()
        .single();
    return { data, error };
}

// Get my reimbursements
export async function getMyReimbursements(employeeId) {
    const { data, error } = await supabase
        .from('reimbursements')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Get all reimbursements (admin)
export async function getAllReimbursements() {
    const { data, error } = await supabase
        .from('reimbursements')
        .select('*, employees(name, division, position)')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Update reimbursement status
export async function updateReimbursement(id, updates) {
    const { data, error } = await supabase
        .from('reimbursements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete reimbursement
export async function deleteReimbursement(id) {
    const { error } = await supabase.from('reimbursements').delete().eq('id', id);
    return { error };
}

// Update reimbursement status (alias used by approval pages)
export async function updateReimbursementStatus(id, status) {
    return updateReimbursement(id, { status });
}
