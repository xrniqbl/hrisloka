import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Get all trainings (with participants & materials) — MANDATORY company scope (returns { data, error })
export async function getAllTrainings(companyId = null) {
  if (!guardCompanyId(companyId, 'getAllTrainings')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('trainings')
    .select('*, training_participants(*, employees(name, division)), training_materials(*)')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false });
  return { data: data || [], error };
}

// Create training — MANDATORY company_id
export async function createTraining(data) {
  if (!guardCompanyId(data.company_id, 'createTraining')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return supabase.from('trainings').insert(data).select().single();
}

// Update training — MANDATORY company ownership
export async function updateTraining(id, data, companyId) {
  if (!guardCompanyId(companyId, 'updateTraining')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return supabase.from('trainings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', companyId).select().single();
}

// Delete training — MANDATORY company ownership
export async function deleteTraining(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteTraining')) {
    return { error: { message: 'company_id required' } };
  }
  return supabase.from('trainings').delete().eq('id', id).eq('company_id', companyId);
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
