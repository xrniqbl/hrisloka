import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all appraisals (admin) — MANDATORY company scope
export async function getAllAppraisals(companyId) {
  if (!guardCompanyId(companyId, 'getAllAppraisals')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('appraisals')
    .select('*, employees:employee_id!inner(name, division, position, company_id), reviewer:reviewer_id(name)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Get appraisal by employee
export async function getEmployeeAppraisals(employeeId) {
  const { data, error } = await supabase
    .from('appraisals')
    .select('*, reviewer:reviewer_id(name)')
    .eq('employee_id', employeeId)
    .order('period', { ascending: false });
  return { data: data || [], error };
}

// Create appraisal
export async function createAppraisal(appraisal) {
  const { data, error } = await supabase
    .from('appraisals')
    .insert({
      employee_id: appraisal.employeeId,
      reviewer_id: appraisal.reviewerId || null,
      period: appraisal.period,
      rating: appraisal.rating,
      status: appraisal.status || 'in-progress',
      comments: appraisal.comments,
    })
    .select()
    .single();
  return { data, error };
}

// Update appraisal — MANDATORY company ownership via employee join
export async function updateAppraisal(id, updates, companyId) {
  if (companyId) {
    const { data: appr } = await supabase
      .from('appraisals')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!appr) return { data: null, error: { message: 'Appraisal not found in your company' } };
  }
  const { data, error } = await supabase
    .from('appraisals')
    .update({
      rating: updates.rating,
      status: updates.status,
      comments: updates.comments,
    })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// Delete appraisal — MANDATORY company ownership via employee join
export async function deleteAppraisal(id, companyId) {
  if (companyId) {
    const { data: appr } = await supabase
      .from('appraisals')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!appr) return { error: { message: 'Appraisal not found in your company' } };
  }
  const { error } = await supabase.from('appraisals').delete().eq('id', id);
  return { error };
}
