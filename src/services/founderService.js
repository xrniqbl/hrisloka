import { supabase } from '../lib/supabase';

// ── Subscription Plans ───────────────────────────────────────────────────────

export async function getAllPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');
  return { data: data || [], error };
}

export async function createPlan(payload) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updatePlan(id, payload) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deletePlan(id) {
  const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
  return { error };
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export async function getAllSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, companies(name, company_code, logo_url), subscription_plans(name, slug)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function getSubscriptionByCompany(companyId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(name, slug, price_monthly, price_yearly)')
    .eq('company_id', companyId)
    .maybeSingle();
  return { data, error };
}

export async function createSubscription(payload) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateSubscription(id, payload) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function cancelSubscription(id, reason) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), notes: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function getSubscriptionPayments(subscriptionId) {
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('payment_date', { ascending: false });
  return { data: data || [], error };
}

export async function addPayment(payload) {
  const { data, error } = await supabase
    .from('subscription_payments')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

// ── Vouchers ─────────────────────────────────────────────────────────────────

export async function getAllVouchers() {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createVoucher(payload) {
  const { data, error } = await supabase
    .from('vouchers')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateVoucher(id, payload) {
  const { data, error } = await supabase
    .from('vouchers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteVoucher(id) {
  const { error } = await supabase.from('vouchers').delete().eq('id', id);
  return { error };
}

export async function getVoucherUsage(voucherId) {
  const { data, error } = await supabase
    .from('voucher_usage')
    .select('*, companies(name)')
    .eq('voucher_id', voucherId)
    .order('used_at', { ascending: false });
  return { data: data || [], error };
}

export async function validateVoucherCode(code) {
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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'HRSLK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .insert({ ...payload, company_code: code })
    .select()
    .single();
  if (companyErr) return { data: null, error: companyErr };

  if (payload.plan_id) {
    await supabase.from('subscriptions').insert({
      company_id: company.id,
      plan_id: payload.plan_id,
      status: 'active',
      billing_cycle: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
    });
  }
  return { data: company, error: null };
}

// ── Broadcasts ────────────────────────────────────────────────────────────────

export async function getAllBroadcasts() {
  const { data, error } = await supabase
    .from('founder_broadcasts')
    .select('*')
    .order('sent_at', { ascending: false });
  return { data: data || [], error };
}

export async function sendBroadcast(payload) {
  const { data, error } = await supabase
    .from('founder_broadcasts')
    .insert({ ...payload, sent_at: new Date().toISOString() })
    .select()
    .single();

  // Realtime broadcast via Supabase channel
  if (!error) {
    supabase.channel('founder_broadcast').send({
      type: 'broadcast',
      event: 'new_broadcast',
      payload: data,
    });
  }
  return { data, error };
}

export async function deleteBroadcast(id) {
  const { error } = await supabase.from('founder_broadcasts').delete().eq('id', id);
  return { error };
}

// ── Client Complaints ─────────────────────────────────────────────────────────

export async function getAllComplaints() {
  const { data, error } = await supabase
    .from('client_complaints')
    .select('*, companies(name, company_code)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function submitComplaint(payload) {
  const { data, error } = await supabase
    .from('client_complaints')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateComplaintStatus(id, status) {
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
  const { data, error } = await supabase
    .from('complaint_replies')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at');
  return { data: data || [], error };
}

export async function addComplaintReply(complaintId, message, senderType = 'founder', senderName = 'Founder') {
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
  try {
    const [
      { data: companies },
      { data: subscriptions },
      { data: complaints },
      { data: broadcasts },
    ] = await Promise.all([
      supabase.from('companies').select('id, is_active, created_at'),
      supabase.from('subscriptions').select('status, amount, billing_cycle, subscription_plans(name, slug)'),
      supabase.from('client_complaints').select('status'),
      supabase.from('founder_broadcasts').select('id').limit(1),
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
