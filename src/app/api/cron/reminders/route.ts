import { deliverUpcomingReminders } from '@/lib/reminder-delivery';
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try { return Response.json(await deliverUpcomingReminders()); }
  catch (e) { console.error('Reminder delivery failed', e); return Response.json({ error: 'Delivery failed' }, { status: 500 }); }
}
