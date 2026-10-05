'use client';
import { saveReminderPushSubscription, removeReminderPushSubscription } from '@/actions/reminders';

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
export async function subscribeToReminders(): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('Push notifications are not configured');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('This browser does not support push notifications');
  if (Notification.permission !== 'granted') throw new Error('Allow notifications to enable reminders');
  const registration = await navigator.serviceWorker.register('/reminder-sw.js');
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64Url(publicKey) });
  try { await saveReminderPushSubscription(subscription.toJSON()); }
  catch (error) { if (!existing) await subscription.unsubscribe(); throw error; }
}
export async function unsubscribeFromReminders(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/reminder-sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await removeReminderPushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
}
