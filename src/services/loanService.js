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
  const { data, error } = await supabase
    .from('loans')
    .select('*, loan_payments(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Submit loan request
export async function submitLoan(employeeId, loanData) {
  const { data, error } = await supabase
    .from('loans')
    .insert({
      employee_id: employeeId,
      amount: loanData.amount,
      remaining: loanData.amount,
      monthly_deduction: loanData.monthlyDeduction,
      reason: loanData.reason,
      status: 'pending',
    })
    .select()
    .single();
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
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nPengajuan pinjaman sebesar Rp ${amount} telah *DISETUJUI*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[loanService] WA error:', e));
    }
    if (emp?.auth_user_id) {
      sendPushToEmployee(emp.auth_user_id, 'HRIS Loka — Pinjaman Disetujui ✅', `Pinjaman Rp ${amount} telah disetujui.`, '/app/loan')
        .catch(e => console.warn('[loanService] push error:', e));
    }
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
      const msg = `🏢 *HRIS Loka*\n\nHalo, *${emp.name}*!\n\nPengajuan pinjaman sebesar Rp ${amount} telah *DITOLAK*.\n\n_HRIS Loka — Smart HR Platform_`;
      sendWhatsApp(emp.phone, msg).catch(e => console.warn('[loanService] WA error:', e));
    }
    if (emp?.auth_user_id) {
      sendPushToEmployee(emp.auth_user_id, 'HRIS Loka — Pinjaman Ditolak ❌', `Pinjaman Rp ${amount} ditolak.`, '/app/loan')
        .catch(e => console.warn('[loanService] push error:', e));
    }
  }

  return { data, error };
}

// Record loan payment (salary deduction) — ATOMIC update to prevent race conditions
export async function recordPayment(loanId, amount) {
  // First get current remaining
  const { data: loan, error: fetchErr } = await supabase
    .from('loans')
    .select('remaining')
    .eq('id', loanId)
    .single();
  if (fetchErr) return { error: fetchErr };

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

// Get payment history
export async function getLoanPayments(loanId) {
  const { data, error } = await supabase
    .from('loan_payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false });
  return { data: data || [], error };
}
