import { supabase } from '../lib/supabase';

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
 * Build billing card from real subscription (never fake Pro plan).
 */
export function billingFromSubscription(sub) {
  if (!sub) return null;
  const planName =
    sub.plan_name ||
    sub.plan_label ||
    sub.subscription_plans?.name ||
    sub.plan_slug ||
    'Free';
  const cycle = sub.billing_cycle || 'monthly';
  const next = sub.expires_at || sub.end_date || null;
  const nextLabel = next
    ? new Date(next).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return {
    plan: planName,
    billing_cycle: cycle,
    price: sub.price_paid ?? sub.price_monthly ?? sub.amount ?? null,
    currency: 'IDR',
    payment_method: sub.payment_method || 'Midtrans',
    renewal_date: nextLabel,
    next_billing: nextLabel,
    status: sub.computed_status || sub.status || 'active',
    source: 'subscription',
  };
}

/**
 * Default when no subscription — honest Free, not fake Pro.
 */
export function getDefaultBillingInfo() {
  return {
    plan: 'Free',
    billing_cycle: '—',
    price: 0,
    currency: 'IDR',
    payment_method: '—',
    renewal_date: null,
    next_billing: null,
    status: 'none',
    source: 'default',
  };
}

/**
 * Prefer billing_info row; else derive from subscription.
 */
export async function getBillingForUser(userId, subscription = null) {
  const { data: row } = await getBillingInfo(userId);
  if (row) {
    return {
      data: {
        plan: row.plan || row.plan_name,
        billing_cycle: row.billing_cycle,
        next_billing: row.next_billing || row.renewal_date,
        renewal_date: row.renewal_date || row.next_billing,
        status: row.status || 'active',
        payment_method: row.payment_method,
        source: 'billing_info',
        ...row,
      },
      error: null,
    };
  }
  if (subscription) {
    return { data: billingFromSubscription(subscription), error: null };
  }
  return { data: getDefaultBillingInfo(), error: null };
}
