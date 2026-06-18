import { supabase } from '../lib/supabase';

// ── Onboarding Tasks (PWA — per employee) ────────────────────────
export async function getOnboardingTasks(employeeId) {
  return supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('employee_id', employeeId)
    .order('sort_order', { ascending: true });
}

export async function updateTaskStatus(id, status) {
  return supabase.from('onboarding_tasks').update({
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }).eq('id', id);
}

export async function createOnboardingTask(data) {
  return supabase.from('onboarding_tasks').insert(data).select().single();
}

// Bulk create tasks for a new employee from company checklist template
export async function seedOnboardingTasks(employeeId, companyId) {
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
  return supabase
    .from('onboarding_checklist')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });
}

export async function createChecklistItem(data) {
  return supabase.from('onboarding_checklist').insert(data).select().single();
}

export async function deleteChecklistItem(id) {
  return supabase.from('onboarding_checklist').delete().eq('id', id);
}
