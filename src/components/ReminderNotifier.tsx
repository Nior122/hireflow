'use client';
import { useEffect } from 'react';
import { getReminderPreferences } from '@/actions/reminders';
import { subscribeToReminders } from '@/lib/reminder-subscribe';
/** Refresh an existing browser subscription on dashboard visits. Never prompt outside a click. */
export function ReminderNotifier() {
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    getReminderPreferences().then(({ enabled }) => {
      if (enabled) void subscribeToReminders().catch(() => {});
    }).catch(() => {});
  }, []);
  return null;
}
