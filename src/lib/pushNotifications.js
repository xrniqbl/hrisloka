import { supabase } from './supabase';

// VAPID public key MUST match the server's private key pair.
// No hardcoded fallback: a mismatch causes every push delivery to silently fail.
// If unset, push notifications are disabled (subscribeForPush returns null).
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request permission for push notifications and subscribe the user.
 * Returns { success: boolean, error?: string }
 */
export async function subscribeToPushNotifications(employeeId) {
  // Respect platform feature flag (Founder Portal → Feature Flags)
  try {
    const raw = localStorage.getItem('founder_feature_flags');
    if (raw) {
      const flags = JSON.parse(raw);
      if (flags && flags.push_notifications === false) {
        return { success: false, error: 'Push notifications dinonaktifkan oleh administrator platform.' };
      }
    }
  } catch { /* ignore parse errors */ }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push notifications tidak didukung oleh browser ini.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'Push notifications belum dikonfigurasi di server.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Izin notifikasi ditolak.' };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Save subscription to Supabase
    const subJson = subscription.toJSON();
    await supabase.from('push_subscriptions').upsert({
      employee_id: employeeId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      created_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

    return { success: true, subscription };
  } catch (err) {
    console.error('Push subscription error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if push notifications are currently subscribed.
 */
export async function getPushSubscriptionStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false };
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { supported: true, subscribed: false };
  const subscription = await registration.pushManager.getSubscription();
  return {
    supported: true,
    subscribed: !!subscription,
    permission: Notification.permission,
  };
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    // Remove from Supabase
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  }
}
