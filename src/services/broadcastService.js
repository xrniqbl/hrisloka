import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

/**
 * Send a broadcast announcement scoped to a company
 */
export async function sendAnnouncement(title, message, companyId) {
  if (!guardCompanyId(companyId, 'sendAnnouncement')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const payload = { title, message, company_id: companyId };

  const { data, error } = await supabase.from('announcements').insert(payload);

  if (!error) {
    // Broadcast to Supabase Realtime channel scoped by company.
    // channel.send() returns a promise — await + catch to avoid an
    // unhandled rejection if the channel isn't subscribed yet.
    const channelName = companyId ? `announcements-${companyId}` : 'announcements';
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'new_announcement',
      payload: { title, message },
    }).catch((e) => console.warn('[broadcastService] realtime send failed:', e?.message));
  }
  return { data, error };
}

/**
 * Get all announcements for a company
 */
export async function getAnnouncements(companyId) {
  if (!guardCompanyId(companyId, 'getAnnouncements')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

/**
 * Listen for announcements scoped by company (PWA)
 */
export function subscribeToAnnouncements(onMessage, companyId) {
  const channelName = companyId ? `announcements-${companyId}` : 'announcements';
  return supabase
    .channel(channelName)
    .on('broadcast', { event: 'new_announcement' }, ({ payload }) => {
      onMessage(payload);
      if (Notification.permission === 'granted') {
        new Notification(payload.title, { body: payload.message });
      }
    })
    .subscribe();
}
