import { isSubscription, parseNotificationPrefs } from './reminder-push';
test('ignores unsafe subscriptions and keeps other preferences', () => {
 expect(isSubscription({ endpoint: 'javascript:bad', keys: { p256dh: 'a', auth: 'b' } })).toBe(false);
 const prefs = parseNotificationPrefs({ emailSummaries: true, interviewReminders: true, subscriptions: [null, {endpoint:'https://push.example/1',keys:{p256dh:'a',auth:'b'}}] });
 expect(prefs.subscriptions).toHaveLength(1);
 expect((prefs as Record<string, unknown>).emailSummaries).toBe(true);
});
