import axios from 'axios';

// Both clients send cookies automatically (session-based auth via nile_session
// httponly cookie set by /api/auth/callback).
export const apiClient = axios.create({
    baseURL: '',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
    withCredentials: true,
});

export const aiClient = axios.create({
    baseURL: '',
    timeout: 60_000,
    withCredentials: true,
});

// ---------------------------------------------------------------------------
// Response interceptor — redirect to /login on 401 (session expired / gone)
// ---------------------------------------------------------------------------
const handleAuthError = (error: any) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';

    if (status === 401) {
        // Only redirect for authenticated API routes, not the me/logout endpoints
        // themselves (which legitimately return 401 when not signed in).
        const isAuthEndpoint =
            url.includes('/api/auth/me') ||
            url.includes('/api/auth/logout');
        if (!isAuthEndpoint) {
            window.location.replace('/login?reason=session_expired');
        }
        return Promise.reject(error);
    }

    // 403 on role-gated routes means the session role doesn't match the portal.
    const isRoleGated =
        url.includes('/api/staff/') ||
        url.includes('/api/employer/') ||
        url.includes('/api/student/') ||
        url.includes('/api/messages/') ||
        url.includes('/api/events') ||
        url.includes('/api/feed');

    if (status === 403 && isRoleGated) {
        window.location.replace('/login?reason=session_expired');
        return Promise.reject(error);
    }

    return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, handleAuthError);
aiClient.interceptors.response.use((r) => r, handleAuthError);
