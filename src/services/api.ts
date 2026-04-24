import axios from 'axios';

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

// Go backend – set VITE_API_BASE_URL in .env (e.g. your Railway/Render URL).
// Falls back to localhost for local development.
const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    'https://nile-connect-production.up.railway.app';

// AI serverless functions – served by Vercel at /api/* in production.
// In local dev Vite proxies /api/* → localhost:5000 (see vite.config.ts).
const AI_BASE_URL =
    (import.meta as any).env?.VITE_AI_BASE_URL || '/api';

// ---------------------------------------------------------------------------
// Axios instances
// ---------------------------------------------------------------------------

/** Client for the Go backend (auth, jobs, employer, student, etc.) */
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
});

/** Client for the Python AI serverless functions */
export const aiClient = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 60_000, // AI can be slow
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
        // Redirect to login without hard-refreshing the React router
        window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, handleAuthError);
aiClient.interceptors.response.use((r) => r, handleAuthError);
