/**
 * Owner ↔ Founder platform bridge
 * - Client support tickets (owner → founder)
 * - Platform broadcasts (founder → owner)
 */
import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Support tickets (client_complaints) ──────────────────────────────────────

/**
 * List tickets for the owner's company only.
 */
export async function getMyCompanyComplaints(companyId) {
  if (!guardCompanyId(companyId, 'getMyCompanyComplaints')) {
    return { data: [], error: { message: 'company_id required' } };
  }

  const { data, error } = await supabase
    .from('client_complaints')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Owner submits a support ticket to founder.
 */
export async function submitCompanyComplaint({
  companyId,
  contactName,
  contactEmail,
  subject,
  message,
  category = 'general',
  priority = 'medium',
}) {
  if (!guardCompanyId(companyId, 'submitCompanyComplaint')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  if (!subject?.trim() || !message?.trim()) {
    return { data: null, error: { message: 'Subject dan pesan wajib diisi' } };
  }

  const { data, error } = await supabase
    .from('client_complaints')
    .insert({
      company_id: companyId,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      subject: subject.trim(),
      message: message.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      status: 'open',
    })
    .select()
    .single();

  return { data, error };
}

export async function getComplaintThread(complaintId, companyId) {
  if (!complaintId) return { data: [], error: { message: 'complaint_id required' } };

  // Verify ticket belongs to company when companyId provided
  if (companyId) {
    const { data: ticket } = await supabase
      .from('client_complaints')
      .select('id, company_id')
      .eq('id', complaintId)
      .maybeSingle();
    if (!ticket || String(ticket.company_id) !== String(companyId)) {
      return { data: [], error: { message: 'tenant isolation' } };
    }
  }

  const { data, error } = await supabase
    .from('complaint_replies')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });

  return { data: data || [], error };
}

/**
 * Owner replies on their ticket.
 */
export async function replyAsClient(complaintId, message, senderName, companyId) {
  if (!complaintId || !message?.trim()) {
    return { data: null, error: { message: 'pesan wajib diisi' } };
  }

  if (companyId) {
    const { data: ticket } = await supabase
      .from('client_complaints')
      .select('id, company_id, status')
      .eq('id', complaintId)
      .maybeSingle();
    if (!ticket || String(ticket.company_id) !== String(companyId)) {
      return { data: null, error: { message: 'tenant isolation' } };
    }
  }

  const { data, error } = await supabase
    .from('complaint_replies')
    .insert({
      complaint_id: complaintId,
      message: message.trim(),
      sender_type: 'client',
      sender_name: senderName || 'Owner',
    })
    .select()
    .single();

  return { data, error };
}

// ── Platform broadcasts (founder_broadcasts) ─────────────────────────────────

/**
 * Broadcasts visible to this company (all / plan / company targets).
 */
export async function getPlatformBroadcasts({ companyId, planId = null, limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('founder_broadcasts')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(Math.min(limit, 50));

  if (error) return { data: [], error };

  const rows = (data || []).filter((b) => {
    if (!b.target || b.target === 'all') return true;
    if (b.target === 'company') {
      return companyId != null && String(b.target_company_id) === String(companyId);
    }
    if (b.target === 'plan') {
      return planId != null && String(b.target_plan_id) === String(planId);
    }
    return true;
  });

  return { data: rows, error: null };
}

/**
 * Latest unread platform broadcast for banner (respects local dismiss list).
 */
export function getDismissedBroadcastIds() {
  try {
    const raw = localStorage.getItem('kinikerja_dismissed_broadcasts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function dismissBroadcastLocally(id) {
  const ids = getDismissedBroadcastIds();
  if (!ids.includes(id)) {
    ids.push(id);
    // keep last 50
    localStorage.setItem(
      'kinikerja_dismissed_broadcasts',
      JSON.stringify(ids.slice(-50)),
    );
  }
}
