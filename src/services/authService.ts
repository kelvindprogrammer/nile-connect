// Auth is now fully session-based via Campus One OIDC.
// The nile_session httponly cookie is set by /api/auth/callback and read
// server-side by every protected Go handler.

export interface BackendUser {
    id: string;
    name: string;
    username: string;
    email: string;
    role: 'student' | 'staff' | 'employer';
    student_subtype?: string | null;
    student_id?: string | null;
    study_level?: string | null;
    level?: number | null;
    faculty_id?: string | null;
    department_id?: string | null;
    is_verified: boolean;
}

interface ApiEnvelope<T> { data: T; }

/** Fetch the currently signed-in user from the session cookie. */
export const getCurrentUser = async (): Promise<BackendUser | null> => {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return null;
        const body: ApiEnvelope<BackendUser> = await res.json();
        return body.data ?? null;
    } catch {
        return null;
    }
};

/** Initiate the Campus One OIDC sign-in flow. */
export const signIn = (next?: string): void => {
    const url = new URL('/api/auth/login', window.location.origin);
    if (next && next.startsWith('/')) url.searchParams.set('next', next);
    window.location.assign(url.toString());
};

/** Sign out by clearing the session cookie. */
export const signOut = async (): Promise<void> => {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
        // Ignore network errors — the redirect below will clear the UI.
    }
};

// ---------------------------------------------------------------------------
// Legacy exports kept for backward compatibility with any remaining callers.
// These are no-ops; actual auth is handled by Campus One OIDC.
// ---------------------------------------------------------------------------
export interface AuthResponse { user: BackendUser; token: string; }

export const deleteAccount = async (): Promise<void> => {
    await fetch('/api/auth/delete-account', { method: 'POST', credentials: 'include' });
};
