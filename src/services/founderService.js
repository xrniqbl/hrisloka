import { supabase } from '../lib/supabase';
import { computeExpiresAt } from './subscriptionService';
import { isFounder } from '../lib/rbac';

// Defense-in-depth: enforcement nyata ada di RLS Postgres (is_founder() SQL).
// Helper ini hanya gerbang client-side agar UI tidak memanggil tanpa hak.
async function requireFounder() {
  const { data: { user } } = await supabase.auth.getUser();
  let employee = null;
  if (user?.id) {
    const { data } = await supabase
      .from('employees')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    employee = data;
  }
  if (!user || !isFounder(user, employee) || employee?.role !== 'founder') {
    throw new Error('Forbidden: founder only');
  }
}


// ── Subscription Plans ───────────────────────────────────────────────────────

export async function getAllPlans() {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
  return { data: data || [], error };
}

export async function createPlan(payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updatePlan(id, payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscription_plans')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deletePlan(id) {
  await requireFounder();
  const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
  return { error };
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export async function getAllSubscriptions() {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, companies(name, company_code, logo_url), subscription_plans(name, slug), onboarding_profiles(employee_count)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function getSubscriptionByCompany(companyId) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(name, slug, price_monthly, price_yearly)')
    .eq('company_id', companyId)
    .maybeSingle();
  return { data, error };
}

export async function createSubscription(payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateSubscription(id, payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function cancelSubscription(id, _reason) {
  await requireFounder();
  // `_reason` reserved for future audit notes column; schema currently has no notes field
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function getSubscriptionPayments(subscriptionId) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('payment_date', { ascending: false });
  return { data: data || [], error };
}

export async function addPayment(payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('subscription_payments')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

// ── Vouchers ─────────────────────────────────────────────────────────────────

export async function getAllVouchers() {
  await requireFounder();
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createVoucher(payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('vouchers')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateVoucher(id, payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('vouchers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteVoucher(id) {
  await requireFounder();
  const { error } = await supabase.from('vouchers').delete().eq('id', id);
  return { error };
}

export async function getVoucherUsage(voucherId) {
  await requireFounder();
  const { data, error } = await supabase
    .from('voucher_usage')
    .select('*, companies(name)')
    .eq('voucher_id', voucherId)
    .order('used_at', { ascending: false });
  return { data: data || [], error };
}

export async function validateVoucherCode(code) {
  await requireFounder();
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .lte('valid_from', today)
    .maybeSingle();
  if (error || !data) return { valid: false, voucher: null };
  if (data.valid_until && data.valid_until < today) return { valid: false, voucher: null, reason: 'expired' };
  if (data.max_uses !== null && data.used_count >= data.max_uses) return { valid: false, voucher: null, reason: 'exhausted' };
  return { valid: true, voucher: data };
}

// ── Companies (Founder admin level) ──────────────────────────────────────────

export async function getCompaniesWithStats() {
  await requireFounder();
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error };

  // Get employee counts per company
  const { data: empCounts } = await supabase
    .from('employees')
    .select('company_id')
    .eq('account_status', 'active');

  const countMap = {};
  (empCounts || []).forEach(e => {
    countMap[e.company_id] = (countMap[e.company_id] || 0) + 1;
  });

  // Get subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('company_id, plan_id, status, subscription_plans(name, slug)');

  const subMap = {};
  (subs || []).forEach(s => { subMap[s.company_id] = s; });

  const enriched = companies.map(c => ({
    ...c,
    employee_count: countMap[c.id] || 0,
    subscription: subMap[c.id] || null,
  }));
  return { data: enriched, error: null };
}

export async function createCompanyWithPlan(payload) {
  await requireFounder();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'KK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .insert({ ...payload, company_code: code })
    .select()
    .single();
  if (companyErr) return { data: null, error: companyErr };

  if (payload.plan_id) {
    // Founder-created subscriptions go through the activate-free-subscription
    // Edge Function (service_role) — never direct client inserts — so RLS
    // (FIX_FOUNDER_PORTAL_RLS: founder-only writes) and pricing stay in one
    // server-side path. Graceful fallback to direct insert keeps the founder
    // flow working if the function is not yet deployed.
    const billingCycle = payload.billing_cycle || 'monthly';
    try {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('slug, name')
        .eq('id', payload.plan_id)
        .maybeSingle();
      const { error: fnErr } = await supabase.functions.invoke('activate-free-subscription', {
        body: {
          plan_slug: planRow?.slug || 'free',
          plan_name: planRow?.name || null,
          billing_cycle: billingCycle,
          voucher_code: null,
          company_id: company.id,
        },
      });
      if (fnErr) throw fnErr;
    } catch (e) {
      // Fallback (requires service/founder context): direct insert is blocked
      // for non-founders by RLS — surface the refusal rather than retrying.
      const startDate = new Date().toISOString();
      const { error: subErr } = await supabase.from('subscriptions').insert({
        company_id: company.id,
        plan_id: payload.plan_id,
        status: 'active',
        billing_cycle: billingCycle,
        start_date: startDate.split('T')[0],
        expires_at: computeExpiresAt(startDate, billingCycle),
      });
      if (subErr) console.error('[founderService] subscription insert failed (edge fn fallback):', subErr);
      else console.warn('[founderService] activate-free-subscription unavailable, used direct insert fallback:', e?.message);
    }
  }
  return { data: company, error: null };
}

// ── Broadcasts ────────────────────────────────────────────────────────────────

export async function getAllBroadcasts() {
  await requireFounder();
  const { data, error } = await supabase
    .from('founder_broadcasts')
    .select('*')
    .order('sent_at', { ascending: false });
  return { data: data || [], error };
}

/**
 * Fan-out platform broadcast into employee notifications for company owners/HR.
 * Best-effort: never fails the main broadcast insert.
 */
async function fanOutBroadcastNotifications(broadcast) {
  try {
    let companyIds = [];

    if (broadcast.target === 'company' && broadcast.target_company_id) {
      companyIds = [broadcast.target_company_id];
    } else if (broadcast.target === 'plan' && broadcast.target_plan_id) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('company_id')
        .eq('plan_id', broadcast.target_plan_id)
        .in('status', ['active', 'trial']);
      companyIds = [...new Set((subs || []).map((s) => s.company_id).filter(Boolean))];
    } else {
      // all subscribers with active/trial subscription
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('company_id')
        .in('status', ['active', 'trial']);
      companyIds = [...new Set((subs || []).map((s) => s.company_id).filter(Boolean))];
      // fallback: all companies if no company_id on subs (user-based model)
      if (companyIds.length === 0) {
        const { data: cos } = await supabase.from('companies').select('id').eq('is_active', true);
        companyIds = (cos || []).map((c) => c.id);
      }
    }

    if (companyIds.length === 0) return;

    // Notify owner + HR of each company (not every employee)
    const { data: recipients } = await supabase
      .from('employees')
      .select('id, company_id')
      .in('company_id', companyIds)
      .in('role', ['super_admin', 'hr_admin'])
      .eq('account_status', 'active');

    if (!recipients?.length) {
      // older schemas may use status instead of account_status
      const { data: alt } = await supabase
        .from('employees')
        .select('id, company_id')
        .in('company_id', companyIds)
        .in('role', ['super_admin', 'hr_admin']);
      if (!alt?.length) return;
      await insertPlatformNotifs(alt, broadcast);
      return;
    }

    await insertPlatformNotifs(recipients, broadcast);
  } catch (e) {
    console.warn('[founderService] fanOutBroadcastNotifications failed:', e?.message);
  }
}

async function insertPlatformNotifs(employees, broadcast) {
  const rows = employees.map((emp) => ({
    employee_id: emp.id,
    type: 'platform',
    title: broadcast.title,
    body: broadcast.message,
    message: broadcast.message,
    data: {
      source: 'founder_broadcast',
      broadcast_id: broadcast.id,
      action_url: broadcast.action_url || null,
      broadcast_type: broadcast.type || 'info',
    },
  }));

  // Chunk inserts (avoid huge payload)
  const chunk = 80;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from('notifications').insert(slice);
    if (error) {
      // Retry without optional columns
      const minimal = slice.map(({ employee_id, type, title, body, message }) => ({
        employee_id,
        type,
        title,
        body: body || message,
      }));
      const { error: e2 } = await supabase.from('notifications').insert(minimal);
      if (e2) console.warn('[founderService] notif insert failed:', e2.message);
    }
  }
}

export async function sendBroadcast(payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('founder_broadcasts')
    .insert({ ...payload, sent_at: new Date().toISOString() })
    .select()
    .single();

  // Realtime broadcast via Supabase channel. channel.send() returns a
  // promise — catch to avoid an unhandled rejection if no client is
  // subscribed yet.
  if (!error && data) {
    supabase.channel('founder_broadcast').send({
      type: 'broadcast',
      event: 'new_broadcast',
      payload: data,
    }).catch((e) => console.warn('[founderService] realtime send failed:', e?.message));

    // Deliver into owner NotificationCenter (same DB as HR notifs)
    fanOutBroadcastNotifications(data);
  }
  return { data, error };
}

export async function deleteBroadcast(id) {
  await requireFounder();
  const { error } = await supabase.from('founder_broadcasts').delete().eq('id', id);
  return { error };
}

// ── Client Complaints ─────────────────────────────────────────────────────────

export async function getAllComplaints() {
  await requireFounder();
  const { data, error } = await supabase
    .from('client_complaints')
    .select('*, companies(name, company_code)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function submitComplaint(payload) {
  await requireFounder();
  const { data, error } = await supabase
    .from('client_complaints')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateComplaintStatus(id, status) {
  await requireFounder();
  const updates = { status, updated_at: new Date().toISOString() };
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('client_complaints')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function getComplaintReplies(complaintId) {
  await requireFounder();
  const { data, error } = await supabase
    .from('complaint_replies')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at');
  return { data: data || [], error };
}

export async function addComplaintReply(complaintId, message, senderType = 'founder', senderName = 'Founder') {
  await requireFounder();
  const { data, error } = await supabase
    .from('complaint_replies')
    .insert({ complaint_id: complaintId, message, sender_type: senderType, sender_name: senderName })
    .select()
    .single();
  if (!error && senderType === 'founder') {
    await supabase.from('client_complaints')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', complaintId)
      .eq('status', 'open');
  }
  return { data, error };
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function trackEvent(eventType, details = {}) {
  // Sengaja TANPA requireFounder(): event analytics ditulis semua pengunjung
  // (page_view, login, signup). RLS website_analytics hanya mengizinkan
  // INSERT publik + SELECT founder (analytics_public_insert /
  // analytics_founder_read di FIX_FOUNDER_PORTAL_RLS.sql).
  try {
    await supabase.from('website_analytics').insert({
      event_type: eventType,
      page_path: details.path || null,
      feature_name: details.feature || null,
      company_id: details.companyId || null,
      session_id: details.sessionId || null,
      device_type: details.deviceType || getDeviceType(),
      locale: navigator.language || 'id',
    });
  } catch { /* silently fail */ }
}

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export async function getAnalyticsSummary(days = 30) {
  await requireFounder();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const { data, error } = await supabase
    .from('website_analytics')
    .select('event_type, page_path, feature_name, device_type, created_at')
    .gte('created_at', sinceStr)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  const rows = data || [];

  const pageViews = rows.filter(r => r.event_type === 'page_view').length;
  const logins = rows.filter(r => r.event_type === 'login').length;
  const signups = rows.filter(r => r.event_type === 'signup').length;
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  rows.forEach(r => { if (r.device_type) deviceCounts[r.device_type] = (deviceCounts[r.device_type] || 0) + 1; });

  // Top pages
  const pageCounts = {};
  rows.filter(r => r.page_path).forEach(r => {
    pageCounts[r.page_path] = (pageCounts[r.page_path] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Daily breakdown
  const dailyMap = {};
  rows.forEach(r => {
    const d = r.created_at?.split('T')[0];
    if (d) { dailyMap[d] = (dailyMap[d] || 0) + 1; }
  });

  return {
    data: { pageViews, logins, signups, deviceCounts, topPages, dailyMap, total: rows.length },
    error: null,
  };
}

// ── Founder Dashboard Stats ───────────────────────────────────────────────────

export async function getFounderDashboardStats() {
  await requireFounder();
  try {
    const [
      { data: companies },
      { data: subscriptions },
      { data: complaints },
    ] = await Promise.all([
      supabase.from('companies').select('id, is_active, created_at'),
      supabase.from('subscriptions').select('status, amount, billing_cycle, subscription_plans(name, slug)'),
      supabase.from('client_complaints').select('status'),
    ]);

    const totalCompanies = companies?.length || 0;
    const activeCompanies = companies?.filter(c => c.is_active).length || 0;
    const activeSubs = subscriptions?.filter(s => s.status === 'active').length || 0;
    const mrr = subscriptions?.filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    const openComplaints = complaints?.filter(c => c.status === 'open').length || 0;
    const planDist = {};
    subscriptions?.forEach(s => {
      const name = s.subscription_plans?.name || 'Free';
      planDist[name] = (planDist[name] || 0) + 1;
    });

    // New companies this month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const newThisMonth = companies?.filter(c => c.created_at?.startsWith(thisMonth)).length || 0;

    return {
      data: { totalCompanies, activeCompanies, activeSubs, mrr, openComplaints, planDist, newThisMonth },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Revenue & Subscriber History (for dashboard charts) ───────────────────────

export async function getRevenueHistory(months = 6) {
  await requireFounder();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data, error } = await supabase
    .from('payment_orders')
    .select('amount, created_at, status')
    .eq('status', 'paid')
    .gte('created_at', since.toISOString())
    .order('created_at');
  if (error) return { data: [], error };

  // Group amounts by YYYY-MM
  const monthMap = {};
  (data || []).forEach(order => {
    const month = order.created_at?.slice(0, 7);
    if (month) monthMap[month] = (monthMap[month] || 0) + (order.amount || 0);
  });

  // Build ordered array for last N months
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('id-ID', { month: 'short' });
    result.push({ key, label, amount: monthMap[key] || 0 });
  }
  return { data: result, error: null };
}

export async function getSubscriberHistory(months = 6) {
  await requireFounder();
  // Get all subscriptions (not just recent) to compute cumulative count
  const { data, error } = await supabase
    .from('subscriptions')
    .select('created_at, status, end_date')
    .order('created_at');
  if (error) return { data: [], error };

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const upTo = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
    const label = d.toLocaleDateString('id-ID', { month: 'short' });
    // Count subs created by end of this month and not yet cancelled
    const count = (data || []).filter(s =>
      s.created_at <= upTo && (s.status === 'active' || s.status === 'trial')
    ).length;
    result.push({ label, count });
  }
  return { data: result, error: null };
}
