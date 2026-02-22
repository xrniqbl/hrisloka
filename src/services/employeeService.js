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

// Get all employees (optionally filtered by branch)
export async function getAllEmployees(branchId) {
    let query = supabase
        .from('employees')
        .select('*, branches(name, code)')
        .order('id');
    if (branchId) {
        query = query.eq('branch_id', branchId);
    }
    const { data, error } = await query;
    return { data: data || [], error };
}

// Get employees by branch
export async function getEmployeesByBranch(branchId) {
    const { data, error } = await supabase
        .from('employees')
        .select('*, branches(name, code)')
        .eq('branch_id', branchId)
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

// Update freely-editable profile fields (no HR approval needed)
export async function updateEmployeeDirectFields(id, fields) {
    // Only allow safe direct-edit fields
    const allowed = ['photo_url', 'address', 'phone', 'whatsapp', 'personal_email'];
    const safe = {};
    for (const key of Object.keys(fields)) {
        if (allowed.includes(key)) safe[key] = fields[key];
    }
    const { data, error } = await supabase
        .from('employees')
        .update(safe)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Upload profile photo to Supabase Storage
export async function uploadProfilePhoto(employeeId, file) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${employeeId}/avatar_${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file, { upsert: true });
    if (uploadErr) return { error: uploadErr };

    const { data: { publicUrl } } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);

    // Save URL to employees table
    const { data, error } = await supabase
        .from('employees')
        .update({ photo_url: publicUrl })
        .eq('id', employeeId)
        .select()
        .single();
    return { data, error, url: publicUrl };
}
