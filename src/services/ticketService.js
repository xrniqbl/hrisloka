import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendWhatsApp } from './whatsappService';
import { sendPushToEmployee } from './pushService';

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

// Update ticket status — MANDATORY company ownership via employee join
export async function updateTicket(id, updates, companyId) {
  if (companyId) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!ticket) return { data: null, error: { message: 'Ticket not found in your company' } };
  }
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select('*, employees(name, email, phone, auth_user_id)')
    .single();

  // Auto-notify employee when ticket status changes
  if (!error && data && updates.status) {
    const emp = data.employees;
    const statusLabel = updates.status === 'resolved' ? 'DISELESAIKAN ✅' : updates.status === 'in_progress' ? 'SEDANG DIPROSES 🔄' : updates.status === 'closed' ? 'DITUTUP' : updates.status.toUpperCase();
    if (emp?.phone) {
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nTiket "${data.subject}" telah *${statusLabel}*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[ticketService] WA error:', e));
    }
    if (emp?.auth_user_id) {
      sendPushToEmployee(emp.auth_user_id, `HRIS Loka — Tiket ${statusLabel}`, `Tiket "${data.subject}" ${statusLabel}.`, '/app/helpdesk')
        .catch(e => console.warn('[ticketService] push error:', e));
    }
  }

  return { data, error };
}

// Delete ticket — MANDATORY company ownership via employee join
export async function deleteTicket(id, companyId) {
  if (companyId) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!ticket) return { error: { message: 'Ticket not found in your company' } };
  }
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  return { error };
}
