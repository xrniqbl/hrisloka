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
  if (!employee_id) return { data: null, error: { message: 'employee_id required' } };
  if (!subject?.trim()) return { data: null, error: { message: 'Subjek tiket wajib diisi' } };
  if (!message?.trim()) return { data: null, error: { message: 'Pesan tiket wajib diisi' } };

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      employee_id,
      subject: subject.trim(),
      category: category || 'other',
      priority: priority || 'medium',
      message: message.trim(),
      description: message.trim(),
      status: 'open',
    })
    .select()
    .single();

  // Retry without description if older schema
  if (error && /description|column/i.test(error.message || '')) {
    const retry = await supabase
      .from('tickets')
      .insert({
        employee_id,
        subject: subject.trim(),
        category: category || 'other',
        priority: priority || 'medium',
        message: message.trim(),
        status: 'open',
      })
      .select()
      .single();
    return { data: retry.data, error: retry.error };
  }
  return { data, error };
}

// Get my tickets (by employee id)
export async function getMyTickets(employeeId) {
  if (!employeeId) return { data: [], error: null };
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
    const st = updates.status === 'in-progress' ? 'in_progress' : updates.status;
    const statusLabel = st === 'resolved' ? 'DISELESAIKAN ✅' : st === 'in_progress' ? 'SEDANG DIPROSES 🔄' : st === 'closed' ? 'DITUTUP' : String(st).toUpperCase();
    if (emp?.phone) {
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nTiket "${data.subject}" telah *${statusLabel}*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[ticketService] WA error:', e));
    }
    sendPushToEmployee(
      data.employee_id || emp?.id,
      `HRIS Loka — Tiket ${statusLabel}`,
      `Tiket "${data.subject}" ${statusLabel}.`,
      '/app/helpdesk',
      companyId,
    ).catch(e => console.warn('[ticketService] push error:', e));
    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId: companyId || emp?.company_id,
        type: 'submission',
        title: `Tiket ${statusLabel}`,
        body: data.subject || 'Update tiket helpdesk',
        data: { path: '/app/helpdesk', ticketId: data.id },
      }).catch(() => {});
    } catch { /* optional */ }
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
