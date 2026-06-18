import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all shifts — MANDATORY company scope
export async function getAllShifts(branchId, companyId) {
  if (!guardCompanyId(companyId, 'getAllShifts')) return { data: [], error: null };
  let query = supabase
    .from('shifts')
    .select('*, branches(name)')
    .eq('company_id', companyId)
    .order('start_time');
  if (branchId) query = query.eq('branch_id', branchId);
  const { data, error } = await query;
  return { data: data || [], error };
}

// Create shift — always attach company_id
export async function createShift(shift) {
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      name: shift.name,
      start_time: shift.startTime,
      end_time: shift.endTime,
      color: shift.color || '#6D8196',
      branch_id: shift.branchId || null,
      company_id: shift.companyId || null,
    })
    .select()
    .single();
  return { data, error };
}

// Update shift — verify company ownership
export async function updateShift(id, shift, companyId) {
  let query = supabase
    .from('shifts')
    .update({
      name: shift.name,
      start_time: shift.startTime,
      end_time: shift.endTime,
      color: shift.color,
    })
    .eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query.select().single();
  return { data, error };
}

// Delete shift — verify company ownership
export async function deleteShift(id, companyId) {
  let query = supabase.from('shifts').delete().eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  const { error } = await query;
  return { error };
}

// Get shift assignments — MANDATORY company scope
export async function getShiftAssignments(companyId) {
  if (!guardCompanyId(companyId, 'getShiftAssignments')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('*, employees!inner(name, division, company_id), shifts(name, start_time, end_time, color)')
    .eq('employees.company_id', companyId)
    .order('employee_id');
  return { data: data || [], error };
}

// Assign shift to employee
export async function assignShift(employeeId, shiftId, dayOfWeek, effectiveDate) {
  const { data, error } = await supabase
    .from('shift_assignments')
    .upsert({
      employee_id: employeeId,
      shift_id: shiftId,
      day_of_week: dayOfWeek,
      effective_date: effectiveDate || new Date().toISOString().split('T')[0],
    }, { onConflict: 'employee_id,day_of_week,effective_date' })
    .select()
    .single();
  return { data, error };
}

// Remove shift assignment
export async function removeShiftAssignment(id) {
  const { error } = await supabase.from('shift_assignments').delete().eq('id', id);
  return { error };
}
