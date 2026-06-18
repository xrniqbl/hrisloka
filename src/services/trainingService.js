import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Get all trainings (with participants & materials) — MANDATORY company scope
export async function getAllTrainings(companyId = null) {
  if (!guardCompanyId(companyId, 'getAllTrainings')) return { data: [], error: null };
  const result = await supabase
    .from('trainings')
    .select('*, training_participants(*, employees(name, division)), training_materials(*)')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false });
  return result;
}

export async function createTraining(data) {
  return supabase.from('trainings').insert(data).select().single();
}

export async function updateTraining(id, data, companyId) {
  let query = supabase.from('trainings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  return query.select().single();
}

export async function deleteTraining(id, companyId) {
  let query = supabase.from('trainings').delete().eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  return query;
}

// ── Participants ──────────────────────────────────────────────────
export async function enrollTraining(trainingId, employeeId) {
  return supabase.from('training_participants').insert({
    training_id: trainingId,
    employee_id: employeeId,
    status: 'enrolled',
  }).select().single();
}

export async function completeTraining(id) {
  return supabase.from('training_participants').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', id);
}

// ── Materials ─────────────────────────────────────────────────────
export async function addTrainingMaterial(data) {
  return supabase.from('training_materials').insert(data).select().single();
}

export async function deleteTrainingMaterial(id) {
  return supabase.from('training_materials').delete().eq('id', id);
}
