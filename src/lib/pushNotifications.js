import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 
  'BMzRwwjkGjrPI3-R071Bd5FOlJZNoqCf0F1ZYjzOKAo1mZqud-vzq5ypIwzB-I9zutHXw00sq04NcRVDJkUPGW4';

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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push notifications tidak didukung oleh browser ini.' };
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
