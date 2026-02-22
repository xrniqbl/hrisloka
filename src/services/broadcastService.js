import { supabase } from '../lib/supabase';

/**
 * Send a broadcast announcement (Admin)
 */
export async function sendAnnouncement(title, message) {
    // This could save to an 'announcements' table and trigger a broadcast channel
    const { data, error } = await supabase
        .from('announcements') // Note: Need to create this table
        .insert({ title, message });

    if (!error) {
        supabase.channel('announcements').send({
            type: 'broadcast',
            event: 'new_announcement',
            payload: { title, message }
        });
    }
    return { data, error };
}

/**
 * Listen for announcements (PWA)
 */
export function subscribeToAnnouncements(onMessage) {
    return supabase
        .channel('announcements')
        .on('broadcast', { event: 'new_announcement' }, ({ payload }) => {
            onMessage(payload);
            // Optionally show a browser notification if permitted
            if (Notification.permission === 'granted') {
                new Notification(payload.title, { body: payload.message });
            }
        })
        .subscribe();
}
