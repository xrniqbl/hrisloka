import { supabase } from '../lib/supabase';

// Get all departments
export async function getAllDepartments() {
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
    return { data: data || [], error };
}

// Get active departments only (for dropdowns)
export async function getActiveDepartments() {
    const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
    return { data: data || [], error };
}

// Create department
export async function createDepartment(dept) {
    const { data, error } = await supabase
        .from('departments')
        .insert({
            name: dept.name,
            description: dept.description || null,
            is_active: dept.is_active !== false,
        })
        .select()
        .single();
    return { data, error };
}

// Update department
export async function updateDepartment(id, dept) {
    const { data, error } = await supabase
        .from('departments')
        .update({
            name: dept.name,
            description: dept.description,
            is_active: dept.is_active,
        })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete department
export async function deleteDepartment(id) {
    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
    return { error };
}

// Get employee count per department
export async function getDepartmentEmployeeCounts() {
    const { data, error } = await supabase
        .from('employees')
        .select('department_id');
    if (error) return { data: {}, error };
    const counts = {};
    (data || []).forEach(e => {
        const did = e.department_id || 'unassigned';
        counts[did] = (counts[did] || 0) + 1;
    });
    return { data: counts, error: null };
}
