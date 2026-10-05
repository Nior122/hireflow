'use client';
import { useEffect } from 'react';
import { getReminders, getReminderPreferences } from '@/actions/reminders';
export function ReminderNotifier() {
  useEffect(() => {
    if (!('Notification' in window)) return;
    async function check() {
      if (Notification.permission !== 'granted') return;
      const prefs = await getReminderPreferences();
      if (!prefs.enabled) return;
      const result = await getReminders();
      if (!result.success) return;
      for (const reminder of result.data ?? []) {
        const time = new Date(reminder.dueDate).getTime();
        if (reminder.isCompleted || time < Date.now() || time > Date.now() + 24*60*60*1000) continue;
        const key = `hireflow-reminder-${reminder.id}-${new Date().toISOString().slice(0,10)}`;
        if (sessionStorage.getItem(key)) continue;
        new Notification('Interview reminder', { body: reminder.title });
        sessionStorage.setItem(key, 'shown');
      }
    }
    void check(); const timer = setInterval(() => void check(), 15*60*1000);
    return () => clearInterval(timer);
  }, []);
  return null;
}
