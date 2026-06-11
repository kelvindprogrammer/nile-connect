// Relative "time ago" label, e.g. "Just now", "5m ago", "3h ago", "2d ago".
export function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Clock time for today's messages, otherwise a short date — e.g. "14:32" / "5 Jun".
export function formatClockTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
        ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

// True if the user's last heartbeat was within the last ~2 minutes.
export function isOnline(lastActiveAt?: string): boolean {
    if (!lastActiveAt) return false;
    return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}

// "Active now" / "Active 5m ago" — null if presence is unknown.
export function presenceLabel(lastActiveAt?: string): string | null {
    if (!lastActiveAt) return null;
    return isOnline(lastActiveAt) ? 'Active now' : `Active ${timeAgo(lastActiveAt)}`;
}
