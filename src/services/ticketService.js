import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Submit ticket — supports both object and separate args for backwards compat
export async function submitTicket(employeeIdOrObj, ticketData) {
  let employee_id, subject, category, priority, message;
  if (typeof employeeIdOrObj === 'object' && !ticketData) {
    ({ employee_id, subject, category, priority, message } = employeeIdOrObj);
  } else {
    employee_id = employeeIdOrObj;
    ({ subject, category, priority, message } = ticketData || {});
  }
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      employee_id,
      subject,
      category: category || 'other',
      priority: priority || 'medium',
      message: message || '',
      description: message || '',
      status: 'open',
    })
    .select()
    .single();
  return { data, error };
}

// Get my tickets (by employee id)
export async function getMyTickets(employeeId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Alias for clarity
export const getTicketsByEmployee = getMyTickets;

// Get all tickets (admin) — MANDATORY company scope
export async function getAllTickets(companyId) {
  if (!guardCompanyId(companyId, 'getAllTickets')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('tickets')
    .select('*, employees!inner(name, division, position, company_id)')
    .eq('employees.company_id', companyId)
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
