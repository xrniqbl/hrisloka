import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendReimbursementEmail } from './emailService';
import { sendWhatsApp } from './whatsappService';

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

// Get all reimbursements — MANDATORY company filter for multi-tenant isolation
export async function getAllReimbursements(companyId) {
  if (!guardCompanyId(companyId, 'getAllReimbursements')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('reimbursements')
    .select('*, employees!inner(name, division, position, company_id, email, phone)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Update reimbursement status — with auto email + WA notification
export async function updateReimbursement(id, updates) {
  const { data, error } = await supabase
    .from('reimbursements')
    .update(updates)
    .eq('id', id)
    .select('*, employees(name, email, phone)')
    .single();

  // Auto-notify when status changes
  if (!error && data && (updates.status === 'approved' || updates.status === 'rejected' || updates.status === 'paid')) {
    const emp = data.employees;

    if (emp?.email) {
      sendReimbursementEmail({
        employeeName: emp.name,
        employeeEmail: emp.email,
        status: updates.status,
        amount: data.amount,
        category: data.category,
      }).catch(e => console.warn('[reimbursementService] email error:', e));
    }

    if (emp?.phone) {
      const statusLabel = updates.status === 'approved' ? 'DISETUJUI' : updates.status === 'paid' ? 'DIBAYARKAN' : 'DITOLAK';
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nReimbursement ${data.category} Rp ${Number(data.amount).toLocaleString('id-ID')} kamu telah *${statusLabel}*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[reimbursementService] WA error:', e));
    }
  }

  return { data, error };
}

// Delete reimbursement
export async function deleteReimbursement(id) {
  const { error } = await supabase.from('reimbursements').delete().eq('id', id);
  return { error };
}

// Update reimbursement status (alias)
export async function updateReimbursementStatus(id, status) {
  return updateReimbursement(id, { status });
}
