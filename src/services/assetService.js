import { supabase } from '../lib/supabase';

// Get all assets
export async function getAllAssets() {
    const { data, error } = await supabase
        .from('assets')
        .select('*, employees:assigned_to(name, division)')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
}

// Get asset by ID
export async function getAssetById(id) {
    const { data, error } = await supabase
        .from('assets')
        .select('*, employees:assigned_to(name, division)')
        .eq('id', id)
        .single();
    return { data, error };
}

// Create asset
export async function createAsset(asset) {
    const { data, error } = await supabase
        .from('assets')
        .insert({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            brand: asset.brand,
            serial: asset.serial,
            purchase_date: asset.purchaseDate,
            status: asset.status || 'available',
            assigned_to: asset.assignedTo || null,
            condition: asset.condition || 'Good',
            notes: asset.notes,
        })
        .select()
        .single();
    return { data, error };
}

// Update asset
export async function updateAsset(id, asset) {
    const { data, error } = await supabase
        .from('assets')
        .update({
            name: asset.name,
            category: asset.category,
            brand: asset.brand,
            serial: asset.serial,
            purchase_date: asset.purchaseDate,
            status: asset.status,
            assigned_to: asset.assignedTo,
            condition: asset.condition,
            notes: asset.notes,
        })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete asset
export async function deleteAsset(id) {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    return { error };
}

// Assign asset to employee
export async function assignAsset(assetId, employeeId) {
    const { data, error } = await supabase
        .from('assets')
        .update({ assigned_to: employeeId, status: 'in-use' })
        .eq('id', assetId)
        .select()
        .single();
    return { data, error };
}

// Unassign asset
export async function unassignAsset(assetId) {
    const { data, error } = await supabase
        .from('assets')
        .update({ assigned_to: null, status: 'available' })
        .eq('id', assetId)
        .select()
        .single();
    return { data, error };
}
