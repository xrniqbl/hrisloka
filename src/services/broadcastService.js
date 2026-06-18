import { supabase } from '../lib/supabase';

/**
 * Send a broadcast announcement scoped to a company
 */
export async function sendAnnouncement(title, message, companyId) {
  const payload = { title, message };
  if (companyId) payload.company_id = companyId;

  const { data, error } = await supabase.from('announcements').insert(payload);

  if (!error) {
    // Broadcast to Supabase Realtime channel scoped by company
    const channelName = companyId ? `announcements-${companyId}` : 'announcements';
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'new_announcement',
      payload: { title, message },
    });
  }
  return { data, error };
}

/**
 * Get all announcements for a company
 */
export async function getAnnouncements(companyId) {
  let query = supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
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
