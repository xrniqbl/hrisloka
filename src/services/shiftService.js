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

// Create shift — MANDATORY company_id
export async function createShift(shift) {
  if (!guardCompanyId(shift.companyId, 'createShift')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      name: shift.name,
      start_time: shift.startTime,
      end_time: shift.endTime,
      color: shift.color || '#6D8196',
      branch_id: shift.branchId || null,
      company_id: shift.companyId,
    })
    .select()
    .single();
  return { data, error };
}

// Update shift — MANDATORY company ownership
export async function updateShift(id, shift, companyId) {
  if (!guardCompanyId(companyId, 'updateShift')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('shifts')
    .update({
      name: shift.name,
      start_time: shift.startTime,
      end_time: shift.endTime,
      color: shift.color,
    })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

// Delete shift — MANDATORY company ownership
export async function deleteShift(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteShift')) {
    return { error: { message: 'company_id required' } };
  }
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
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

// Remove shift assignment — MANDATORY company ownership via join
export async function removeShiftAssignment(id, companyId) {
  if (!guardCompanyId(companyId, 'removeShiftAssignment')) {
    return { error: { message: 'company_id required' } };
  }
  // Verify the assignment belongs to an employee in this company before deleting
  const { data: assignment } = await supabase
    .from('shift_assignments')
    .select('id, employees!inner(company_id)')
    .eq('id', id)
    .eq('employees.company_id', companyId)
    .maybeSingle();
  if (!assignment) return { error: { message: 'Shift assignment not found in your company' } };
  const { error } = await supabase.from('shift_assignments').delete().eq('id', id);
  return { error };
}
