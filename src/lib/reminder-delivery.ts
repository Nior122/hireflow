import { prisma } from '@/lib/prisma';
import { parseNotificationPrefs } from '@/lib/reminder-push';

/** Called by authenticated cron; delivers each reminder at most once per user (best effort). */
export async function deliverUpcomingReminders(now = new Date()) {
  const { default: webPush } = await import('web-push');
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error('VAPID keys and subject are required');
  webPush.setVapidDetails(subject, publicKey, privateKey);
  const end = new Date(now.getTime() + 24 * 3600_000);
  const reminders = await prisma.reminder.findMany({ where: { isCompleted: false, application: { status: 'INTERVIEW' }, dueDate: { gt: now, lte: end } }, orderBy: { dueDate: 'asc' }, take: 500 });
  let sent = 0;
  for (const reminder of reminders) {
    const user = await prisma.user.findUnique({ where: { id: reminder.userId }, select: { notificationPrefs: true } });
    const prefs = parseNotificationPrefs(user?.notificationPrefs);
    if (!prefs.interviewReminders || !prefs.subscriptions?.length || prefs.sentReminderIds?.includes(reminder.id)) continue;
    const valid = [];
    let delivered = false;
    for (const sub of prefs.subscriptions) {
      try {
        await webPush.sendNotification(sub, JSON.stringify({ id: reminder.id, title: reminder.title }), { TTL: 86400 });
        delivered = true; valid.push(sub); sent++;
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode !== 404 && statusCode !== 410) valid.push(sub);
      }
    }
    if (delivered || valid.length !== prefs.subscriptions.length) {
      await prisma.user.update({ where: { id: reminder.userId }, data: { notificationPrefs: {
        ...prefs, subscriptions: valid,
        sentReminderIds: delivered ? [...(prefs.sentReminderIds ?? []), reminder.id].slice(-500) : prefs.sentReminderIds,
      } } });
    }
  }
  return { sent, checked: reminders.length };
}
