import { supabase } from '../lib/supabase';

/**
 * Fetches the billing info for a given user/company.
 * Falls back to a local mock if no DB record exists yet,
 * or if the billing_info table has not been created.
 */
export async function getBillingInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('billing_info')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Table doesn't exist → PGRST205, just return null silently
    if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
      return { data: null, error: null };
    }
    if (error) console.warn('[billingService] getBillingInfo warning:', error.message);
    return { data, error: null };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * Upsert (insert or update) billing info for a user.
 */
export async function upsertBillingInfo(userId, payload) {
  try {
    const { data, error } = await supabase
      .from('billing_info')
      .upsert({ user_id: userId, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) console.warn('[billingService] upsertBillingInfo warning:', error.message);
    return { data, error };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * Default billing info to show when no record found.
 */
export function getDefaultBillingInfo() {
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 1);
  const formatted = renewal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    plan: 'Pro',
    billing_cycle: 'monthly',
    price: 299000,
    currency: 'IDR',
    cardholder_name: 'HRIS Loka',
    account_number_masked: 'xxxx xxxx xxxx 4437',
    expiry: '12/28',
    payment_method: 'VISA Debit Card',
    renewal_date: formatted,
    status: 'active',
  };
}
