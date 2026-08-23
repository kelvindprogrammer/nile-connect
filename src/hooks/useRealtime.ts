import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Real-time event stream over Server-Sent Events.
 *
 * Why SSE: Vercel serverless cannot hold a WebSocket — there is no long-lived
 * process to own one. SSE is the transport that genuinely works on this stack.
 *
 * The server streams for ~25 seconds (inside the function's 30s limit) and then
 * sends a `reconnect` event carrying the resume point. This hook reconnects
 * immediately with that cursor, so the seam between windows loses nothing and
 * the user perceives a continuous connection.
 *
 * Network reality for this audience shaped three decisions:
 *
 *   - Reconnect uses exponential backoff with jitter, so 15,000 students
 *     coming back after a campus-wide drop do not retry in lockstep and
 *     stampede the server.
 *   - The stream is suspended while the tab is hidden and resumed on return,
 *     because holding a connection open in a background tab burns mobile data
 *     and battery for events nobody is looking at.
 *   - Failure is silent and non-fatal. If the stream never connects, the app
 *     still works — every screen fetches its own state; real-time only makes
 *     it arrive sooner.
 */

export type RealtimeEventType = 'connected' | 'reconnect' | 'notification' | 'message';

export interface RealtimeEvent<T = unknown> {
    type: RealtimeEventType;
    data: T;
}

export interface NotificationEvent {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string;
    is_read: boolean;
    actor_count: number;
    subject_type?: string;
    subject_id?: string;
    created_at: string;
}

export interface MessageEvent {
    id: string;
    sender_id: string;
    content: string;
    media_type?: string;
    created_at: string;
}

export type ConnectionState = 'connecting' | 'open' | 'offline';

interface Options {
    onNotification?: (event: NotificationEvent) => void;
    onMessage?: (event: MessageEvent) => void;
    /** Set false to keep the stream closed (e.g. on a signed-out screen). */
    enabled?: boolean;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export function useRealtime({ onNotification, onMessage, enabled = true }: Options = {}) {
    const [state, setState] = useState<ConnectionState>('connecting');

    const sourceRef = useRef<EventSource | null>(null);
    const retryRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cursorRef = useRef<string | null>(null);
    const closedByUs = useRef(false);

    // Handlers live in refs so a parent re-render does not tear down and
    // rebuild the connection — that would reconnect on every keystroke in a
    // component that owns this hook.
    const notifyRef = useRef(onNotification);
    const messageRef = useRef(onMessage);
    useEffect(() => { notifyRef.current = onNotification; }, [onNotification]);
    useEffect(() => { messageRef.current = onMessage; }, [onMessage]);

    const cleanup = useCallback(() => {
        closedByUs.current = true;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        sourceRef.current?.close();
        sourceRef.current = null;
    }, []);

    const connect = useCallback(() => {
        if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
        closedByUs.current = false;

        const params = new URLSearchParams();
        if (cursorRef.current) params.set('since', cursorRef.current);
        const url = `/api/social/stream${params.toString() ? `?${params}` : ''}`;

        // withCredentials carries the session cookie; the stream is authenticated.
        const source = new EventSource(url, { withCredentials: true });
        sourceRef.current = source;

        source.addEventListener('connected', () => {
            retryRef.current = 0; // a successful connect resets the backoff
            setState('open');
        });

        source.addEventListener('notification', ev => {
            try {
                const payload = JSON.parse((ev as globalThis.MessageEvent).data) as NotificationEvent;
                cursorRef.current = (ev as globalThis.MessageEvent).lastEventId || cursorRef.current;
                notifyRef.current?.(payload);
            } catch {
                /* a malformed frame must not kill the stream */
            }
        });

        source.addEventListener('message', ev => {
            try {
                const payload = JSON.parse((ev as globalThis.MessageEvent).data) as MessageEvent;
                cursorRef.current = (ev as globalThis.MessageEvent).lastEventId || cursorRef.current;
                messageRef.current?.(payload);
            } catch {
                /* ignore */
            }
        });

        // The server hit its time budget. This is an expected, healthy close —
        // reconnect at once rather than backing off, so the seam is invisible.
        source.addEventListener('reconnect', ev => {
            try {
                const payload = JSON.parse((ev as globalThis.MessageEvent).data) as { since: string };
                if (payload.since) cursorRef.current = payload.since;
            } catch {
                /* keep the previous cursor */
            }
            source.close();
            sourceRef.current = null;
            if (!closedByUs.current) {
                timerRef.current = setTimeout(connect, 250);
            }
        });

        source.onerror = () => {
            source.close();
            sourceRef.current = null;
            if (closedByUs.current) return;

            setState('offline');
            // Exponential backoff with jitter. The jitter is what stops a
            // synchronised reconnect storm after a shared outage.
            const attempt = Math.min(retryRef.current++, 5);
            const backoff = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
            const jittered = backoff * (0.5 + Math.random() * 0.5);
            timerRef.current = setTimeout(connect, jittered);
        };
    }, []);

    useEffect(() => {
        if (!enabled) {
            cleanup();
            return;
        }

        // Only hold the connection open while the tab is actually visible.
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                if (!sourceRef.current) {
                    retryRef.current = 0;
                    setState('connecting');
                    connect();
                }
            } else {
                cleanup();
            }
        };

        // A device coming back online should retry immediately rather than
        // waiting out a long backoff it accrued while disconnected.
        const handleOnline = () => {
            if (document.visibilityState === 'visible' && !sourceRef.current) {
                retryRef.current = 0;
                connect();
            }
        };

        if (document.visibilityState === 'visible') connect();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('online', handleOnline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('online', handleOnline);
            cleanup();
        };
    }, [enabled, connect, cleanup]);

    return { state, isLive: state === 'open' };
}
