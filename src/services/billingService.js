import { supabase } from '../lib/supabase';
import { CANONICAL_PLANS } from '../lib/plans';

/**
 * Billing info is user-scoped (subscriber). Always force current auth user —
 * never accept another userId from the client without check.
 */
async function requireCurrentUserId(userId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { userId: null, error: { message: 'Not authenticated' } };
  if (userId && userId !== user.id) {
    return { userId: null, error: { message: 'tenant isolation: tidak boleh akses billing user lain' } };
  }
  return { userId: user.id, error: null };
}

/**
 * Fetches billing info for the authenticated user only.
 */
export async function getBillingInfo(userId) {
  const { userId: uid, error: authErr } = await requireCurrentUserId(userId);
  if (authErr || !uid) return { data: null, error: authErr };

  try {
    const { data, error } = await supabase
      .from('billing_info')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

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
 * Upsert billing info for the authenticated user only.
 */
export async function upsertBillingInfo(userId, payload) {
  const { userId: uid, error: authErr } = await requireCurrentUserId(userId);
  if (authErr || !uid) return { data: null, error: authErr };

  try {
    // Never allow client to spoof user_id
    const { user_id: _drop, ...safe } = payload || {};
    const { data, error } = await supabase
      .from('billing_info')
      .upsert(
        { user_id: uid, ...safe, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single();

    if (error) console.warn('[billingService] upsertBillingInfo warning:', error.message);
    return { data, error };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * Default billing placeholder when no record exists (UI only).
 */
export function getDefaultBillingInfo() {
  const pro = CANONICAL_PLANS.find((p) => p.slug === 'pro');
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 1);
  const formatted = renewal.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return {
    plan: pro?.name || 'Pro',
    billing_cycle: 'monthly',
    price: pro?.price_monthly ?? 299000,
    currency: 'IDR',
    cardholder_name: 'HRIS Loka',
    account_number_masked: 'xxxx xxxx xxxx ----',
    expiry: '--/--',
    payment_method: 'Midtrans',
    renewal_date: formatted,
    status: 'active',
  };
}
