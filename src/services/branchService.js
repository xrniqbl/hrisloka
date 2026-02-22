import { supabase } from '../lib/supabase';

// Get all branches (with manager name joined)
export async function getAllBranches() {
    const { data, error } = await supabase
        .from('branches')
        .select('*, manager:employees!branches_manager_id_fkey(id, name, position, photo_url)')
        .order('name');
    return { data: data || [], error };
}

// Get active branches only
export async function getActiveBranches() {
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
    return { data: data || [], error };
}

// Get branch by ID
export async function getBranchById(id) {
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

// Create branch
export async function createBranch(branch) {
    const { data, error } = await supabase
        .from('branches')
        .insert({
            name: branch.name,
            code: branch.code,
            address: branch.address || null,
            phone: branch.phone || null,
            latitude: branch.latitude,
            longitude: branch.longitude,
            radius_meters: branch.radius_meters || 100,
            timezone: branch.timezone || 'Asia/Jakarta',
            is_active: branch.is_active !== false,
            location_type: branch.location_type || 'branch_office',
            manager_id: branch.manager_id || null,
        })
        .select()
        .single();
    return { data, error };
}

// Update branch
export async function updateBranch(id, branch) {
    const { data, error } = await supabase
        .from('branches')
        .update({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            latitude: branch.latitude,
            longitude: branch.longitude,
            radius_meters: branch.radius_meters,
            timezone: branch.timezone,
            is_active: branch.is_active,
            location_type: branch.location_type,
            manager_id: branch.manager_id || null,
        })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete branch
export async function deleteBranch(id) {
    const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
    return { error };
}

// Get employee count per branch
export async function getBranchEmployeeCounts() {
    const { data, error } = await supabase
        .from('employees')
        .select('branch_id');
    if (error) return { data: {}, error };
    const counts = {};
    (data || []).forEach(e => {
        const bid = e.branch_id || 'unassigned';
        counts[bid] = (counts[bid] || 0) + 1;
    });
    return { data: counts, error: null };
}

// Get branch holidays
export async function getBranchHolidays(branchId) {
    const { data, error } = await supabase
        .from('branch_holidays')
        .select('*, holidays(*)')
        .eq('branch_id', branchId);
    return { data: data || [], error };
}

// Assign holiday to branch
export async function assignHolidayToBranch(branchId, holidayId) {
    const { data, error } = await supabase
        .from('branch_holidays')
        .upsert({ branch_id: branchId, holiday_id: holidayId }, { onConflict: 'branch_id,holiday_id' })
        .select()
        .single();
    return { data, error };
}

// Remove holiday from branch
export async function removeHolidayFromBranch(branchId, holidayId) {
    const { error } = await supabase
        .from('branch_holidays')
        .delete()
        .eq('branch_id', branchId)
        .eq('holiday_id', holidayId);
    return { error };
}
