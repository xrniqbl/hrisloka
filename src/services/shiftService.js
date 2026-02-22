import { supabase } from '../lib/supabase';

// Get all shifts
export async function getAllShifts() {
    const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');
    return { data: data || [], error };
}

// Create shift
export async function createShift(shift) {
    const { data, error } = await supabase
        .from('shifts')
        .insert({
            name: shift.name,
            start_time: shift.startTime,
            end_time: shift.endTime,
            color: shift.color || '#6D8196',
        })
        .select()
        .single();
    return { data, error };
}

// Update shift
export async function updateShift(id, shift) {
    const { data, error } = await supabase
        .from('shifts')
        .update({
            name: shift.name,
            start_time: shift.startTime,
            end_time: shift.endTime,
            color: shift.color,
        })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete shift
export async function deleteShift(id) {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    return { error };
}

// Get shift assignments for all employees
export async function getShiftAssignments() {
    const { data, error } = await supabase
        .from('shift_assignments')
        .select('*, employees(name, division), shifts(name, start_time, end_time, color)')
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
