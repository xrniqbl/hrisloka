import { supabase } from '../lib/supabase';

// Get all offboarding records
export async function getAllOffboarding() {
    const { data, error } = await supabase
        .from('offboarding')
        .select('*, employees(name, nip, division, position), offboarding_checklist(*)')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Get offboarding by ID
export async function getOffboardingById(id) {
    const { data, error } = await supabase
        .from('offboarding')
        .select('*, employees(name, nip, division, position), offboarding_checklist(*, assets:asset_id(name))')
        .eq('id', id)
        .single();
    return { data, error };
}

// Create offboarding record with checklist
export async function createOffboarding(offboardingData) {
    const { data: record, error: recError } = await supabase
        .from('offboarding')
        .insert({
            employee_id: offboardingData.employeeId,
            type: offboardingData.type,
            status: 'initiated',
            reason: offboardingData.reason,
            last_working_day: offboardingData.lastWorkingDay,
            pro_rata_salary: offboardingData.proRataSalary || 0,
            severance_pay: offboardingData.severancePay || 0,
        })
        .select()
        .single();
    if (recError) return { error: recError };

    // Default checklist items
    const defaultItems = [
        'Pengembalian Laptop',
        'Pengembalian Akses Kartu',
        'Penutupan Email Perusahaan',
        'Penutupan Akses Database/VPN',
        'Kalkulasi Sisa Gaji Pro-rata',
        'Transfer Knowledge',
    ];
    const checklistData = defaultItems.map(item => ({
        offboarding_id: record.id,
        item,
        completed: false,
    }));
    await supabase.from('offboarding_checklist').insert(checklistData);

    return { data: record, error: null };
}

// Update offboarding status
export async function updateOffboarding(id, updates) {
    const { data, error } = await supabase
        .from('offboarding')
        .update({
            status: updates.status,
            last_working_day: updates.lastWorkingDay,
            pro_rata_salary: updates.proRataSalary,
            severance_pay: updates.severancePay,
        })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Toggle checklist item
export async function toggleChecklistItem(itemId, completed) {
    const { data, error } = await supabase
        .from('offboarding_checklist')
        .update({ completed })
        .eq('id', itemId)
        .select()
        .single();
    return { data, error };
}

// Delete offboarding (cascades checklist)
export async function deleteOffboarding(id) {
    const { error } = await supabase.from('offboarding').delete().eq('id', id);
    return { error };
}
