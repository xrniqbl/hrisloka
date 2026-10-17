import { supabase } from '../lib/supabase';
import { guardCompanyId, resolveMyEmployee } from '../lib/tenantGuard';
import { sendReimbursementEmail } from './emailService';
import { sendWhatsApp } from './whatsappService';

async function resolveSelfEmployeeId(employeeId, context) {
  const me = await resolveMyEmployee();
  if (!me?.id) {
    return { data: null, error: { message: `${context}: employee identity unavailable`, code: 'IDENTITY_UNAVAILABLE' } };
  }
  if (employeeId && String(me.id) !== String(employeeId)) {
    return { data: null, error: { message: `${context}: employee identity mismatch`, code: 'IDENTITY_MISMATCH' } };
  }
  return { employeeId: me.id };
}

// Submit reimbursement
export async function submitReimbursement(employeeId, reimbData) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  const identity = await resolveSelfEmployeeId(employeeId, 'submitReimbursement');
  if (identity.error) return identity;
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
      employee_id: identity.employeeId,
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
  const identity = await resolveSelfEmployeeId(employeeId, 'getMyReimbursements');
  if (identity.error) return { data: [], error: identity.error };
  const { data, error } = await supabase
    .from('reimbursements')
    .select('*')
    .eq('employee_id', identity.employeeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Upload receipt to the private `documents` bucket — path MUST stay owner-prefixed
// (`<auth.uid>/...`) so it passes the locked storage RLS (documents_*_owner
// policies in scripts/STORAGE_BUCKETS_SETUP.sql). Returns a public URL string
// kept in `reimbursements.receipt_url` (same shape the PWA already stores).
export async function uploadReimbursementReceipt(file, employeeId) {
  if (!file) return { url: null, error: { message: 'File required' } };
  if (!employeeId) return { url: null, error: { message: 'employeeId required' } };
  if (file.size > 10 * 1024 * 1024) {
    return { url: null, error: { message: 'Ukuran file maksimal 10MB' } };
  }
  // MIME allowlist: receipts are photos/PDF only. SVG/HTML polyglots are
  // rejected (stored-XSS via direct object URL navigation).
  const allowed = /^(application\/pdf|image\/(jpeg|jpg|png|webp))$/i;
  if (file.type && !allowed.test(file.type)) {
    return { url: null, error: { message: 'Format harus JPG, PNG, atau PDF' } };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { url: null, error: { message: 'Not authenticated' } };
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${user.id}/reimbursements/${employeeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
  if (error) return { url: null, path: null, error };
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
  return { url: publicUrl, path, error: null };
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
export async function updateReimbursement(id, updates, companyId) {
  if (!id) return { data: null, error: { message: 'id required' } };
  if (!guardCompanyId(companyId, 'updateReimbursement')) {
    return { data: null, error: { message: 'company_id required' } };
  }

  const { data: owned, error: ownershipError } = await supabase
    .from('reimbursements')
    .select('id, employees!inner(company_id)')
    .eq('id', id)
    .eq('employees.company_id', companyId)
    .maybeSingle();
  if (ownershipError || !owned) {
    return { data: null, error: ownershipError || { message: 'Reimbursement not found in your company' } };
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
      try {
        const { shouldNotifyEmployee } = await import('./companySettingsService');
        const allow = await shouldNotifyEmployee(data.employee_id, 'emailReimbursement');
        if (allow) {
          sendReimbursementEmail({
            employeeName: emp.name,
            employeeEmail: emp.email,
            status: updates.status,
            amount: data.amount,
            category: data.category,
          }).catch(e => console.warn('[reimbursementService] email error:', e));
        }
      } catch {
        sendReimbursementEmail({
          employeeName: emp.name,
          employeeEmail: emp.email,
          status: updates.status,
          amount: data.amount,
          category: data.category,
        }).catch(e => console.warn('[reimbursementService] email error:', e));
      }
    }

    if (emp?.phone) {
      const msg = `🏢 *KiniKerja*\n\nHalo, *${emp.name}*!\n\nReimbursement ${data.category} Rp ${Number(data.amount).toLocaleString('id-ID')} kamu telah *${statusLabel}*.\n\n_KiniKerja — Smart HR Platform_`;
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

// Delete reimbursement — resolves the caller identity before applying ownership filter.
export async function deleteReimbursement(id, employeeId) {
  if (!id) return { error: { message: 'id required' } };
  const identity = await resolveSelfEmployeeId(employeeId, 'deleteReimbursement');
  if (identity.error) return { error: identity.error };
  const { error } = await supabase
    .from('reimbursements')
    .delete()
    .eq('id', id)
    .eq('employee_id', identity.employeeId);
  return { error };
}

// Update reimbursement status (alias used by HR pages)
export async function updateReimbursementStatus(id, status, companyId = null) {
  return updateReimbursement(id, { status }, companyId);
}
