/* Nile Connect service worker.
 *
 * Scope is deliberately narrow: receive Web Push, show a notification, and
 * focus or open the right page when it is clicked. It does NOT cache the app
 * shell or intercept fetches — a caching service worker on an authenticated,
 * cookie-driven app is a reliable way to serve one student's cached page to
 * another on a shared device, and the app already works offline-tolerantly
 * through its own error and retry states.
 */

self.addEventListener('install', () => {
    // Take over immediately rather than waiting for every old tab to close,
    // so a push registered now is handled by this version.
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch (err) {
        // A push that fails to parse must still surface something, or the user
        // sees nothing and the browser may revoke the push permission for
        // "userVisibleOnly" violations.
        payload = {};
    }

    const title = payload.title || 'Nile Connect';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/badge-72.png',
        // Tagging collapses a burst into one notification on the device, the
        // same way GroupKey collapses it in the in-app tray.
        tag: payload.tag || 'nile-connect',
        renotify: Boolean(payload.renotify),
        data: { url: payload.url || '/student' },
        // Vibration is short and single — a social update is not an alarm.
        vibrate: [80],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || '/student';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Prefer focusing an existing tab and navigating it: opening a new
            // tab every time a notification is tapped is how people end up
            // with twenty copies of the app.
            for (const client of clientList) {
                if ('focus' in client) {
                    if ('navigate' in client) {
                        return client.navigate(target).then(c => (c ? c.focus() : undefined));
                    }
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(target);
            }
            return undefined;
        }),
    );
});

/* Fired when the push service rotates a subscription. Without handling this,
 * the device silently stops receiving pushes and neither side notices. */
self.addEventListener('pushsubscriptionchange', event => {
    event.waitUntil(
        self.registration.pushManager
            .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
            .then(subscription => {
                const key = subscription.getKey('p256dh');
                const auth = subscription.getKey('auth');
                const toB64 = buffer => {
                    if (!buffer) return '';
                    const bytes = new Uint8Array(buffer);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                };
                return fetch('/api/social/push-subscribe', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint,
                        p256dh: toB64(key),
                        auth: toB64(auth),
                    }),
                });
            })
            .catch(() => undefined),
    );
});
