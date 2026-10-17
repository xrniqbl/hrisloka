import { supabase } from '../lib/supabase';
import { guardCompanyId, resolveMyEmployee } from '../lib/tenantGuard';

// Verify training belongs to companyId (trainings carry company_id;
// participants/materials scope via their training row).
async function assertTrainingInCompany(trainingId, companyId, context) {
  if (!guardCompanyId(companyId, context)) {
    return { error: { message: `${context}: company_id required` } };
  }
  const { data } = await supabase
    .from('trainings')
    .select('id')
    .eq('id', trainingId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!data) {
    return { error: { message: `${context}: training not found in your company` } };
  }
  return {};
}

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
// Enroll — employee must belong to the training's company (self-enroll from
// PWA passes the session employee; HR passes companyId + target employee).
export async function enrollTraining(trainingId, employeeId, companyId = null) {
  const me = await resolveMyEmployee();
  const cid = companyId ?? me?.company_id ?? null;
  const scope = await assertTrainingInCompany(trainingId, cid, 'enrollTraining');
  if (scope.error) return { data: null, error: scope.error };
  // Target employee must be in the same company (blocks cross-tenant enroll).
  const { data: target } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('company_id', cid)
    .maybeSingle();
  if (!target) {
    return { data: null, error: { message: 'enrollTraining: employee not in your company' } };
  }
  return supabase.from('training_participants').insert({
    training_id: trainingId,
    employee_id: employeeId,
    status: 'enrolled',
  }).select().single();
}

export async function completeTraining(id, employeeId = null) {
  // Owner or same-company HR only: participation row's training must be ours,
  // and (for self-complete) the row must belong to the session employee.
  const { data: row } = await supabase
    .from('training_participants')
    .select('id, employee_id, training_id, trainings!inner(company_id)')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { data: null, error: { message: 'training participation not found' } };
  const me = await resolveMyEmployee();
  if (!me?.company_id || String(row.trainings?.company_id) !== String(me.company_id)) {
    return { data: null, error: { message: 'training not found in your company' } };
  }
  if (employeeId && String(row.employee_id) !== String(employeeId)) {
    return { data: null, error: { message: 'not your training record' } };
  }
  return supabase.from('training_participants').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', id);
}

// ── Materials ─────────────────────────────────────────────────────
export async function addTrainingMaterial(data, companyId = null) {
  const scope = await assertTrainingInCompany(data?.training_id, companyId, 'addTrainingMaterial');
  if (scope.error) return { data: null, error: scope.error };
  return supabase.from('training_materials').insert(data).select().single();
}

export async function deleteTrainingMaterial(id, companyId = null) {
  const { data: row } = await supabase
    .from('training_materials')
    .select('id, training_id, trainings!inner(company_id)')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { error: { message: 'material not found' } };
  if (!companyId || String(row.trainings?.company_id) !== String(companyId)) {
    return { error: { message: 'material not found in your company' } };
  }
  return supabase.from('training_materials').delete().eq('id', id);
}
