import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
});

export const aiClient = axios.create({
    baseURL: '',
    timeout: 60_000,
});

// ---------------------------------------------------------------------------
// Attach JWT on every request
// ---------------------------------------------------------------------------
const attachToken = (config: any) => {
    const token = localStorage.getItem('nile_token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

apiClient.interceptors.request.use(attachToken, (err) => Promise.reject(err));
aiClient.interceptors.request.use(attachToken, (err) => Promise.reject(err));

// ---------------------------------------------------------------------------
// Clear stale auth and dispatch logout event
// ---------------------------------------------------------------------------
const clearAuth = () => {
    localStorage.removeItem('nile_token');
    localStorage.removeItem('nile_user');
    window.dispatchEvent(new CustomEvent('auth:expired'));
};

// ---------------------------------------------------------------------------
// Response interceptor
// 401 = invalid/expired token       → force re-login
// 403 on role-protected endpoints   = JWT has wrong role (stale SSO token)
//                                    → force re-login so user gets fresh JWT
// We do NOT clear auth on 403 for /api/auth/login (employer pending approval)
// ---------------------------------------------------------------------------
const handleAuthError = (error: any) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';

    if (status === 401) {
        clearAuth();
        return Promise.reject(error);
    }

    // 403 on role-gated API routes = stale JWT with wrong/missing role
    const isRoleGated =
        url.includes('/api/staff/') ||
        url.includes('/api/employer/') ||
        url.includes('/api/student/') ||
        url.includes('/api/messages/') ||
        url.includes('/api/events') ||
        url.includes('/api/feed');

    if (status === 403 && isRoleGated) {
        clearAuth();
        return Promise.reject(error);
    }

    return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, handleAuthError);
aiClient.interceptors.response.use((r) => r, handleAuthError);
