import type webPush from 'web-push';

export type PushSubscriptionRecord = webPush.PushSubscription;
export interface NotificationPrefs {
  interviewReminders?: boolean;
  subscriptions?: PushSubscriptionRecord[];
  sentReminderIds?: string[];
}
export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const prefs = value as Record<string, unknown>;
  return {
    ...prefs,
    interviewReminders: prefs.interviewReminders === true,
    subscriptions: Array.isArray(prefs.subscriptions) ? prefs.subscriptions.filter(isSubscription).slice(0, 5) : [],
    sentReminderIds: Array.isArray(prefs.sentReminderIds) ? prefs.sentReminderIds.filter((v): v is string => typeof v === 'string').slice(-500) : [],
  };
}
export function isSubscription(value: unknown): value is PushSubscriptionRecord {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  const keys = s.keys as Record<string, unknown> | undefined;
  return typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 2048 &&
    !!keys && typeof keys.p256dh === 'string' && typeof keys.auth === 'string' &&
    keys.p256dh.length < 512 && keys.auth.length < 512;
}
