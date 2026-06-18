import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

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

// Approve loan
export async function approveLoan(id, approverId) {
  const { data, error } = await supabase
    .from('loans')
    .update({
      status: 'active',
      approved_by: approverId,
      start_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// Reject loan
export async function rejectLoan(id) {
  const { data, error } = await supabase
    .from('loans')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// Record loan payment (salary deduction)
export async function recordPayment(loanId, amount) {
  // Insert payment
  const { error: payError } = await supabase
    .from('loan_payments')
    .insert({ loan_id: loanId, amount });
  if (payError) return { error: payError };

  // Update remaining
  const { data: loan } = await supabase
    .from('loans')
    .select('remaining')
    .eq('id', loanId)
    .single();

  const newRemaining = Math.max(0, (loan?.remaining || 0) - amount);
  const { data, error } = await supabase
    .from('loans')
    .update({
      remaining: newRemaining,
      status: newRemaining <= 0 ? 'paid' : 'active',
    })
    .eq('id', loanId)
    .select()
    .single();
  return { data, error };
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
