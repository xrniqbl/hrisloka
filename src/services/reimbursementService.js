import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendReimbursementEmail } from './emailService';
import { sendWhatsApp } from './whatsappService';

// Submit reimbursement
export async function submitReimbursement(employeeId, reimbData) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  const amount = parseFloat(reimbData?.amount);
  if (!amount || amount <= 0) {
    return { data: null, error: { message: 'Jumlah reimburse harus lebih dari 0' } };
  }
  if (amount > 100_000_000) {
    return { data: null, error: { message: 'Jumlah reimburse terlalu besar' } };
  }

  const { data, error } = await supabase
    .from('reimbursements')
    .insert({
      employee_id: employeeId,
      category: reimbData.category || 'Lainnya',
      date: reimbData.date || new Date().toISOString().split('T')[0],
      amount,
      receipt_url: reimbData.receiptUrl || null,
      notes: reimbData.notes || null,
      status: 'pending',
    })
    .select()
    .single();
  return { data, error };
}

// Get my reimbursements
export async function getMyReimbursements(employeeId) {
  if (!employeeId) return { data: [], error: null };
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

// Update reimbursement status — with auto email + WA + in-app notification
export async function updateReimbursement(id, updates, companyId = null) {
  if (!id) return { data: null, error: { message: 'id required' } };

  if (companyId) {
    if (!guardCompanyId(companyId, 'updateReimbursement')) {
      return { data: null, error: { message: 'company_id required' } };
    }
    const { data: owned } = await supabase
      .from('reimbursements')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!owned) {
      return { data: null, error: { message: 'Reimbursement not found in your company' } };
    }
  }

  const { data, error } = await supabase
    .from('reimbursements')
    .update(updates)
    .eq('id', id)
    .select('*, employees(name, email, phone, company_id)')
    .single();

  // Auto-notify when status changes
  if (!error && data && (updates.status === 'approved' || updates.status === 'rejected' || updates.status === 'paid')) {
    const emp = data.employees;
    const statusLabel = updates.status === 'approved' ? 'DISETUJUI' : updates.status === 'paid' ? 'DIBAYARKAN' : 'DITOLAK';

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
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nReimbursement ${data.category} Rp ${Number(data.amount).toLocaleString('id-ID')} kamu telah *${statusLabel}*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[reimbursementService] WA error:', e));
    }

    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId: companyId || emp?.company_id,
        type: 'payslip',
        title: `Reimburse ${statusLabel.toLowerCase()}`,
        body: `${data.category || 'Klaim'} Rp ${Number(data.amount || 0).toLocaleString('id-ID')}`,
        data: { path: '/app/submissions', reimbursementId: data.id },
      }).catch(() => {});
    } catch { /* optional */ }

    try {
      const { sendReimbursementPush } = await import('./pushService');
      sendReimbursementPush(data.employee_id, updates.status, data.amount).catch(() => {});
    } catch { /* optional */ }
  }

  return { data, error };
}

// Delete reimbursement — MANDATORY employee ownership via RLS + explicit filter
export async function deleteReimbursement(id, employeeId) {
  let query = supabase.from('reimbursements').delete().eq('id', id);
  if (employeeId) query = query.eq('employee_id', employeeId);
  const { error } = await query;
  return { error };
}

// Update reimbursement status (alias used by HR pages)
export async function updateReimbursementStatus(id, status, companyId = null) {
  return updateReimbursement(id, { status }, companyId);
}
