import { supabase } from '../lib/supabase';

// Get all holidays
export async function getAllHolidays(year) {
    let query = supabase
        .from('holidays')
        .select('*')
        .order('date');
    if (year) {
        query = query
            .gte('date', `${year}-01-01`)
            .lte('date', `${year}-12-31`);
    }
    const { data, error } = await query;
    return { data: data || [], error };
}

// Create holiday
export async function createHoliday(holiday) {
    const { data, error } = await supabase
        .from('holidays')
        .insert({
            name: holiday.name,
            date: holiday.date,
            description: holiday.description || null,
        })
        .select()
        .single();
    return { data, error };
}

// Update holiday
export async function updateHoliday(id, holiday) {
    const { data, error } = await supabase
        .from('holidays')
        .update({
            name: holiday.name,
            date: holiday.date,
            description: holiday.description,
        })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete holiday
export async function deleteHoliday(id) {
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    return { error };
}
