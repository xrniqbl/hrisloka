import { supabase } from '../lib/supabase';

// ── Notifications ─────────────────────────────────────────────────
export async function getNotifications(employeeId) {
  return supabase
    .from('notifications')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(50);
}

export async function getUnreadCount(employeeId) {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('read', false);
  return count || 0;
}

export async function markRead(id) {
  return supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead(employeeId) {
  return supabase.from('notifications')
    .update({ read: true })
    .eq('employee_id', employeeId)
    .eq('read', false);
}

export async function createNotification({ employeeId, type, title, body, data = {} }) {
  return supabase.from('notifications').insert({
    employee_id: employeeId,
    type,
    title,
    body,
    data,
  });
}

export async function deleteNotification(id) {
  return supabase.from('notifications').delete().eq('id', id);
}
