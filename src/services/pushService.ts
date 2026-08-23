import { apiClient } from './api';

interface Envelope<T> { data: T; }

/**
 * Web Push registration.
 *
 * Every function here is defensive about capability. Push is unavailable on
 * iOS Safari outside an installed PWA, in private windows, on http origins, and
 * whenever VAPID keys are not configured on the server. None of those are
 * errors the user should ever see — the app must work identically without push,
 * because the in-app notification tray is the durable record and push is only a
 * faster delivery of the same thing.
 */

export type PushState =
    | 'unsupported'   // the browser cannot do this at all
    | 'unconfigured'  // the server has no VAPID keys
    | 'denied'        // the user said no
    | 'subscribed'
    | 'unsubscribed';

/** Whether the browser has the APIs at all. */
export const isPushSupported = (): boolean =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

export const getPushPermission = (): NotificationPermission | 'unsupported' =>
    isPushSupported() ? Notification.permission : 'unsupported';

const getPublicKey = async (): Promise<string | null> => {
    try {
        const { data } = await apiClient.get<Envelope<{ public_key: string; configured: boolean }>>(
            '/api/social/push-key',
        );
        return data.data.configured ? data.data.public_key : null;
    } catch {
        return null;
    }
};

/**
 * The VAPID key arrives base64url; PushManager wants raw bytes.
 *
 * Backed by an explicitly allocated ArrayBuffer rather than the default,
 * because `applicationServerKey` requires a BufferSource over ArrayBuffer and
 * TypeScript will not accept the wider ArrayBufferLike a bare Uint8Array
 * carries.
 */
const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(normalised);
    const buffer = new ArrayBuffer(raw.length);
    const out = new Uint8Array(buffer);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
};

const arrayBufferToBase64Url = (buffer: ArrayBuffer | null): string => {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Registers the service worker that receives pushes. Idempotent. */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isPushSupported()) return null;
    try {
        return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
        return null;
    }
};

/** Reports the current state without prompting for permission. */
export const getPushState = async (): Promise<PushState> => {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    if (!(await getPublicKey())) return 'unconfigured';
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        return existing ? 'subscribed' : 'unsubscribed';
    } catch {
        return 'unsubscribed';
    }
};

/**
 * Subscribes this device. Prompts for permission, so call it from a user
 * gesture — browsers reject (and some permanently penalise) an unprompted ask.
 */
export const subscribeToPush = async (): Promise<PushState> => {
    if (!isPushSupported()) return 'unsupported';

    const publicKey = await getPublicKey();
    if (!publicKey) return 'unconfigured';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'unsubscribed';

    const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
    if (!registration) return 'unsupported';

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // required by Chrome; silent push is not permitted
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await apiClient.post('/api/social/push-subscribe', {
            endpoint: subscription.endpoint,
            p256dh: arrayBufferToBase64Url(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64Url(subscription.getKey('auth')),
            user_agent: navigator.userAgent.slice(0, 200),
        });
        return 'subscribed';
    } catch {
        return 'unsubscribed';
    }
};

/** Unsubscribes this device, both locally and on the server. */
export const unsubscribeFromPush = async (): Promise<PushState> => {
    if (!isPushSupported()) return 'unsupported';
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
            // Tell the server first: if the local unsubscribe succeeds but the
            // server call fails, we would keep pushing to a dead endpoint.
            await apiClient
                .delete(`/api/social/push-subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`)
                .catch(() => undefined);
            await subscription.unsubscribe();
        }
        return 'unsubscribed';
    } catch {
        return 'unsubscribed';
    }
};
