import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all holidays — scoped by company
export async function getAllHolidays(year, companyId) {
  if (!guardCompanyId(companyId, 'getAllHolidays')) return { data: [], error: null };
  let query = supabase
    .from('holidays')
    .select('*')
    .eq('company_id', companyId)
    .order('date');
  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);
  }
  const { data, error } = await query;
  return { data: data || [], error };
}

// Create holiday — always attach company_id
export async function createHoliday(holiday, companyId) {
  if (!guardCompanyId(companyId, 'createHoliday')) return { data: null, error: { message: 'company_id required' } };
  const { data, error } = await supabase
    .from('holidays')
    .insert({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || null,
      company_id: companyId,
    })
    .select()
    .single();
  return { data, error };
}

// Update holiday — verify ownership
export async function updateHoliday(id, holiday, companyId) {
  if (!guardCompanyId(companyId, 'updateHoliday')) return { data: null, error: { message: 'company_id required' } };
  const { data, error } = await supabase
    .from('holidays')
    .update({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description,
    })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

// Delete holiday — verify ownership
export async function deleteHoliday(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteHoliday')) return { error: { message: 'company_id required' } };
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  return { error };
}
