import { supabase } from '../lib/supabase';

// Get employee by auth user ID
export async function getMyProfile(authUserId) {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();
    return { data, error };
}

// Get employee by email (for demo mode)
export async function getEmployeeByEmail(email) {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single();
    return { data, error };
}

// Get employee by ID
export async function getEmployeeById(id) {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

// Get all employees
export async function getAllEmployees() {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('id');
    return { data: data || [], error };
}

// Update employee
export async function updateEmployee(id, updates) {
    const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Create employee
export async function createEmployee(employeeData) {
    const { data, error } = await supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();
    return { data, error };
}

// Delete employee
export async function deleteEmployee(id) {
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
    return { error };
}

// Extend contract
export async function extendContract(id, newEndDate) {
    const { data, error } = await supabase
        .from('employees')
        .update({ contract_end: newEndDate })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Get distinct divisions
export async function getDivisions() {
    const { data, error } = await supabase
        .from('employees')
        .select('division')
        .order('division');
    const divisions = [...new Set((data || []).map(d => d.division).filter(Boolean))];
    return { data: divisions, error };
}
