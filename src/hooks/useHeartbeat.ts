import { useEffect } from 'react';
import { sendHeartbeat } from '../services/messageService';

const HEARTBEAT_MS = 30000;

// Pings the backend every ~30s while the tab is visible so other users
// can see this user's presence ("Active now" / "Active Xm ago").
export function useHeartbeat() {
    useEffect(() => {
        sendHeartbeat();
        const tick = () => {
            if (document.visibilityState === 'visible') sendHeartbeat();
        };
        const id = setInterval(tick, HEARTBEAT_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
        };
    }, []);
}
