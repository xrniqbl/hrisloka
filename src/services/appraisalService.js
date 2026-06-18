import { supabase } from '../lib/supabase';

// Get all appraisals (admin) — scoped by company
export async function getAllAppraisals(companyId) {
  let query = supabase
    .from('appraisals')
    .select('*, employees:employee_id!inner(name, division, position, company_id), reviewer:reviewer_id(name)')
    .order('created_at', { ascending: false });
  if (companyId) query = query.eq('employees.company_id', companyId);
  const { data, error } = await query;
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

// Update appraisal
export async function updateAppraisal(id, updates) {
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

// Delete appraisal
export async function deleteAppraisal(id) {
  const { error } = await supabase.from('appraisals').delete().eq('id', id);
  return { error };
}
