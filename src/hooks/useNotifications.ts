import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getNotifications, getUnreadNotificationCount,
    markNotificationRead, markAllNotificationsRead,
} from '../services/notificationService';
import type { AppNotification } from '../types/notification';

const POLL_MS = 20000;

export function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshUnreadCount = useCallback(async () => {
        try {
            setUnreadCount(await getUnreadNotificationCount());
        } catch { /* ignore */ }
    }, []);

    const refreshNotifications = useCallback(async () => {
        try {
            const list = await getNotifications();
            setNotifications(list);
            setUnreadCount(list.filter(n => !n.is_read).length);
            setLoaded(true);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        const initial = setTimeout(refreshUnreadCount, 0);

        const tick = () => {
            if (document.visibilityState === 'visible') refreshUnreadCount();
        };
        pollRef.current = setInterval(tick, POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearTimeout(initial);
            if (pollRef.current) clearInterval(pollRef.current);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [refreshUnreadCount]);

    const markRead = useCallback(async (id: string) => {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount(c => Math.max(0, c - 1));
        try { await markNotificationRead(id); } catch { /* ignore */ }
    }, []);

    const markAllRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        try { await markAllNotificationsRead(); } catch { /* ignore */ }
    }, []);

    return { notifications, unreadCount, loaded, refreshNotifications, markRead, markAllRead };
}
