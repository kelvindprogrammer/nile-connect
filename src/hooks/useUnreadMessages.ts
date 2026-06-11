import { useState, useEffect, useCallback } from 'react';
import { getConversations } from '../services/messageService';

const POLL_MS = 15000;

export function useUnreadMessages() {
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const convs = await getConversations();
            setUnreadCount(convs.reduce((sum, c) => sum + (c.unread || 0), 0));
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        const initial = setTimeout(refresh, 0);
        const tick = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        const id = setInterval(tick, POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearTimeout(initial);
            clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [refresh]);

    return { unreadCount, refresh };
}
