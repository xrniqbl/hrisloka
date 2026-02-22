import { supabase } from '../lib/supabase';

// Submit ticket
export async function submitTicket(employeeId, ticketData) {
    const { data, error } = await supabase
        .from('tickets')
        .insert({
            employee_id: employeeId,
            subject: ticketData.subject,
            category: ticketData.category,
            priority: ticketData.priority || 'medium',
            description: ticketData.description,
            status: 'open',
        })
        .select()
        .single();
    return { data, error };
}

// Get my tickets
export async function getMyTickets(employeeId) {
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Get all tickets (admin)
export async function getAllTickets() {
    const { data, error } = await supabase
        .from('tickets')
        .select('*, employees(name, division, position)')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Update ticket status
export async function updateTicket(id, updates) {
    const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete ticket
export async function deleteTicket(id) {
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    return { error };
}
