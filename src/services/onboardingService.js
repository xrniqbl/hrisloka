import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Onboarding Tasks (PWA — per employee) ────────────────────────
export async function getOnboardingTasks(employeeId) {
  return supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('employee_id', employeeId)
    .order('sort_order', { ascending: true });
}

export async function updateTaskStatus(id, status, employeeId = null) {
  let query = supabase.from('onboarding_tasks').update({
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }).eq('id', id);
  if (employeeId) query = query.eq('employee_id', employeeId);
  return query;
}

export async function createOnboardingTask(data) {
  return supabase.from('onboarding_tasks').insert(data).select().single();
}

// ── Onboarding Tasks (Admin — per company, via employee join) ────
export async function getAllOnboardingTasks(companyId) {
  if (!guardCompanyId(companyId, 'getAllOnboardingTasks')) {
    return { data: [], error: null };
  }
  return supabase
    .from('onboarding_tasks')
    .select('*, employees!inner(name, division, position, company_id)')
    .eq('employees.company_id', companyId)
    .order('sort_order', { ascending: true });
}

export async function createOnboardingTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { data: null, error: { message: 'tasks required' } };
  }
  return supabase.from('onboarding_tasks').insert(tasks).select();
}

// Bulk create tasks for a new employee from company checklist template
export async function seedOnboardingTasks(employeeId, companyId) {
  if (!guardCompanyId(companyId, 'seedOnboardingTasks')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  if (!employeeId) return { data: null, error: { message: 'employee_id required' } };

  const { data: templates } = await supabase
    .from('onboarding_checklist')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });

  if (!templates || templates.length === 0) return { data: null, error: null };

  const tasks = templates.map((t, i) => ({
    employee_id: employeeId,
    title: t.title,
    description: t.description,
    category: t.category,
    sort_order: t.sort_order ?? i,
    status: 'pending',
  }));

  return supabase.from('onboarding_tasks').insert(tasks);
}

// ── Onboarding Checklist (Admin — per company) ───────────────────
export async function getOnboardingChecklist(companyId) {
  if (!guardCompanyId(companyId, 'getOnboardingChecklist')) {
    return { data: [], error: null };
  }
  return supabase
    .from('onboarding_checklist')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });
}

export async function createChecklistItem(data) {
  if (!guardCompanyId(data?.company_id, 'createChecklistItem')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return supabase.from('onboarding_checklist').insert(data).select().single();
}

export async function deleteChecklistItem(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteChecklistItem')) {
    return { error: { message: 'company_id required' } };
  }
  return supabase.from('onboarding_checklist').delete().eq('id', id).eq('company_id', companyId);
}
