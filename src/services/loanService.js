import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';
import { sendWhatsApp } from './whatsappService';
import { sendPushToEmployee } from './pushService';

// Get all loans (admin) — MANDATORY company scope
export async function getAllLoans(companyId) {
  if (!guardCompanyId(companyId, 'getAllLoans')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('loans')
    .select('*, employees(name, nip, division)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Get loans for specific employee
export async function getMyLoans(employeeId) {
  if (!employeeId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('loans')
    .select('*, loan_payments(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Submit loan request
export async function submitLoan(employeeId, loanData) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  const amount = Number(loanData?.amount);
  if (!amount || amount <= 0) {
    return { data: null, error: { message: 'Nominal pinjaman harus lebih dari 0' } };
  }
  if (amount > 500_000_000) {
    return { data: null, error: { message: 'Nominal pinjaman melebihi batas' } };
  }
  const monthly = Number(loanData.monthlyDeduction) || Math.round(amount / 12);
  if (monthly <= 0 || monthly > amount) {
    return { data: null, error: { message: 'Cicilan bulanan tidak valid' } };
  }

  const payload = {
    employee_id: employeeId,
    amount,
    remaining: amount,
    monthly_deduction: monthly,
    reason: loanData.reason || null,
    status: 'pending',
  };
  // Prefer company_id when available (multi-tenant rows)
  if (loanData.companyId) payload.company_id = loanData.companyId;

  const { data, error } = await supabase
    .from('loans')
    .insert(payload)
    .select()
    .single();

  // Retry without company_id if column missing
  if (error && /company_id|column/i.test(error.message || '') && payload.company_id) {
    delete payload.company_id;
    return supabase.from('loans').insert(payload).select().single();
  }
  return { data, error };
}

// Approve loan — MANDATORY company ownership
export async function approveLoan(id, approverId, companyId) {
  if (!guardCompanyId(companyId, 'approveLoan')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('loans')
    .update({
      status: 'active',
      approved_by: approverId,
      start_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('*, employees(name, email, phone, auth_user_id)')
    .single();

  // Auto-notify employee when approved
  if (!error && data) {
    const emp = data.employees;
    const amount = Number(data.amount || 0).toLocaleString('id-ID');
    if (emp?.phone) {
      const msg = `🏢 *KiniKerja*\n\nHalo, *${emp.name}*!\n\nPengajuan pinjaman sebesar Rp ${amount} telah *DISETUJUI*.\n\n_KiniKerja — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[loanService] WA error:', e));
    }
    sendPushToEmployee(data.employee_id || emp?.id, 'KiniKerja — Pinjaman Disetujui ✅', `Pinjaman Rp ${amount} telah disetujui.`, '/app/loan', companyId)
      .catch(e => console.warn('[loanService] push error:', e));
    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId,
        type: 'payslip',
        title: 'Pinjaman disetujui',
        body: `Pinjaman Rp ${amount} telah disetujui.`,
        data: { path: '/app/loan' },
      }).catch(() => {});
    } catch { /* optional */ }
  }

  return { data, error };
}

// Reject loan — MANDATORY company ownership
export async function rejectLoan(id, companyId) {
  if (!guardCompanyId(companyId, 'rejectLoan')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('loans')
    .update({ status: 'rejected' })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('*, employees(name, email, phone, auth_user_id)')
    .single();

  // Auto-notify employee when rejected
  if (!error && data) {
    const emp = data.employees;
    const amount = Number(data.amount || 0).toLocaleString('id-ID');
    if (emp?.phone) {
      const msg = `🏢 *KiniKerja*\n\nHalo, *${emp.name}*!\n\nPengajuan pinjaman sebesar Rp ${amount} telah *DITOLAK*.\n\n_KiniKerja — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[loanService] WA error:', e));
    }
    sendPushToEmployee(data.employee_id || emp?.id, 'KiniKerja — Pinjaman Ditolak ❌', `Pinjaman Rp ${amount} ditolak.`, '/app/loan', companyId)
      .catch(e => console.warn('[loanService] push error:', e));
    try {
      const { createNotification } = await import('./notificationService');
      createNotification({
        employeeId: data.employee_id,
        companyId,
        type: 'payslip',
        title: 'Pinjaman ditolak',
        body: `Pinjaman Rp ${amount} ditolak.`,
        data: { path: '/app/loan' },
      }).catch(() => {});
    } catch { /* optional */ }
  }

  return { data, error };
}

// Record loan payment (salary deduction) — ATOMIC update to prevent race conditions.
// HR path: pass companyId (verified via loans.company_id, mirrors approveLoan).
// Employee path: pass the caller's employeeId (verified: loan must belong to
// that employee). At least one must be provided — fail-closed otherwise.
export async function recordPayment(loanId, amount, scope = {}) {
  const { companyId = null, employeeId = null } = scope || {};
  if (!guardCompanyId(companyId, 'recordPayment') && !employeeId) {
    return { error: { message: 'company_id or employeeId required' } };
  }
  // First get current remaining (+ owner for verification)
  const { data: loan, error: fetchErr } = await supabase
    .from('loans')
    .select('remaining, employee_id, company_id')
    .eq('id', loanId)
    .single();
  if (fetchErr) return { error: fetchErr };
  if (companyId && String(loan?.company_id) !== String(companyId)) {
    return { error: { message: 'loan not found in your company' } };
  }
  if (!companyId && employeeId && String(loan?.employee_id) !== String(employeeId)) {
    return { error: { message: 'not your loan' } };
  }

  const newRemaining = Math.max(0, (loan?.remaining || 0) - amount);

  // Use conditional update: only update if remaining hasn't changed since we read it
  // This prevents race conditions — if remaining changed, the update won't match
  const { data: updated, error: updateErr } = await supabase
    .from('loans')
    .update({
      remaining: newRemaining,
      status: newRemaining <= 0 ? 'paid' : 'active',
    })
    .eq('id', loanId)
    .eq('remaining', loan.remaining) // Optimistic lock — only update if unchanged
    .select()
    .single();

  if (updateErr) return { error: updateErr };

  // If no row was updated (remaining changed concurrently), retry once
  if (!updated) {
    // Re-fetch and retry
    const { data: retryLoan } = await supabase
      .from('loans')
      .select('remaining')
      .eq('id', loanId)
      .single();
    const retryRemaining = Math.max(0, (retryLoan?.remaining || 0) - amount);
    const { data: retryUpdated, error: retryErr } = await supabase
      .from('loans')
      .update({
        remaining: retryRemaining,
        status: retryRemaining <= 0 ? 'paid' : 'active',
      })
      .eq('id', loanId)
      .select()
      .single();
    if (retryErr) return { error: retryErr };

    // Insert payment record
    const { error: payError } = await supabase
      .from('loan_payments')
      .insert({ loan_id: loanId, amount });
    if (payError) return { data: retryUpdated, error: payError };

    return { data: retryUpdated, error: null };
  }

  // Insert payment record
  const { error: payError } = await supabase
    .from('loan_payments')
    .insert({ loan_id: loanId, amount });
  if (payError) return { data: updated, error: payError };

  return { data: updated, error: null };
}

// Get payment history — scoped to company (HR) or owner employee (PWA).
export async function getLoanPayments(loanId, scope = {}) {
  const { companyId = null, employeeId = null } = scope || {};
  if (!guardCompanyId(companyId, 'getLoanPayments') && !employeeId) {
    return { data: [], error: { message: 'company_id or employeeId required' } };
  }
  if (companyId || employeeId) {
    const { data: loan } = await supabase
      .from('loans')
      .select('id, employee_id, company_id')
      .eq('id', loanId)
      .maybeSingle();
    if (!loan) return { data: [], error: { message: 'loan not found' } };
    if (companyId && String(loan.company_id) !== String(companyId)) {
      return { data: [], error: { message: 'loan not found in your company' } };
    }
    if (!companyId && employeeId && String(loan.employee_id) !== String(employeeId)) {
      return { data: [], error: { message: 'not your loan' } };
    }
  }
  const { data, error } = await supabase
    .from('loan_payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false });
  return { data: data || [], error };
}
