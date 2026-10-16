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

// Get appraisal by employee — optional companyId scope (defense in depth).
// appraisals has no company_id column (RLS scopes via employees); when
// companyId is given the employee must belong to that company.
export async function getEmployeeAppraisals(employeeId, companyId = null) {
  if (companyId) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!emp) return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from('appraisals')
    .select('*, reviewer:reviewer_id(name)')
    .eq('employee_id', employeeId)
    .order('period', { ascending: false });
  return { data: data || [], error };
}

// Submit self-assessment (PWA) — optional companyId scope (defense in depth).
// Verifies the employee belongs to the company; RLS remains primary.
export async function submitSelfAssessment(employeeId, payload, companyId = null) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  if (!payload?.achievements?.trim()) {
    return { data: null, error: { message: 'Achievements required' } };
  }
  if (companyId) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!emp) return { data: null, error: { message: 'Employee not found in your company' } };
  }
  const { data, error } = await supabase
    .from('self_assessments')
    .insert({
      employee_id: employeeId,
      period: payload.period || new Date().toISOString().slice(0, 7),
      achievements: payload.achievements,
      challenges: payload.challenges || null,
      goals: payload.goals || null,
      strengths: payload.strengths || null,
      improvements: payload.improvements || null,
      self_rating: payload.self_rating ?? 3,
      status: 'submitted',
    })
    .select()
    .single();
  return { data, error };
}

// Create appraisal — optional companyId scope (defense in depth).
// Verifies the target employee belongs to the company; RLS remains primary.
export async function createAppraisal(appraisal, companyId = null) {
  if (companyId && appraisal?.employeeId) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', appraisal.employeeId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!emp) return { data: null, error: { message: 'Employee not found in your company' } };
  }
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

// Update appraisal — companyId REQUIRED for writes (defense in depth).
// Silent unscoped writes are refused; RLS remains the primary enforcement.
export async function updateAppraisal(id, updates, companyId) {
  if (!guardCompanyId(companyId, 'updateAppraisal')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data: appr } = await supabase
    .from('appraisals')
    .select('id, employees!inner(company_id)')
    .eq('id', id)
    .eq('employees.company_id', companyId)
    .maybeSingle();
  if (!appr) return { data: null, error: { message: 'Appraisal not found in your company' } };
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

// Delete appraisal — companyId REQUIRED for writes (defense in depth).
// Silent unscoped deletes are refused; RLS remains the primary enforcement.
export async function deleteAppraisal(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteAppraisal')) {
    return { error: { message: 'company_id required' } };
  }
  const { data: appr } = await supabase
    .from('appraisals')
    .select('id, employees!inner(company_id)')
    .eq('id', id)
    .eq('employees.company_id', companyId)
    .maybeSingle();
  if (!appr) return { error: { message: 'Appraisal not found in your company' } };
  const { error } = await supabase.from('appraisals').delete().eq('id', id);
  return { error };
}
