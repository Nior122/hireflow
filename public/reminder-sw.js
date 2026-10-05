self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { /* ignore malformed payload */ }
  event.waitUntil(self.registration.showNotification('HireFlow interview reminder', {
    body: typeof payload.title === 'string' ? payload.title.slice(0, 160) : 'An interview is coming up.',
    tag: typeof payload.id === 'string' ? payload.id : 'hireflow-reminder',
    icon: '/favicon.ico',
    data: { url: '/dashboard' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/dashboard'));
});
