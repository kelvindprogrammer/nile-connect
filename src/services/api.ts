import axios from 'axios';

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------
// Using empty baseURL so all calls use explicit absolute paths like /api/feed.
// This is immune to VITE_API_BASE_URL misconfiguration and Axios path-merging quirks.
// Every apiClient call MUST include the full /api/... prefix.
// Every aiClient call MUST include the full /api/ai/... prefix.
// ---------------------------------------------------------------------------

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
// Request interceptor – attach JWT bearer token on every request
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
// Response interceptor – handle 401 globally (token expired)
// ---------------------------------------------------------------------------

const handleAuthError = (error: any) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('nile_token');
        localStorage.removeItem('nile_user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, handleAuthError);
aiClient.interceptors.response.use((r) => r, handleAuthError);
