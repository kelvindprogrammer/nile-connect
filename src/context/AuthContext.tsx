import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signIn as ssoSignIn, signOut as ssoSignOut } from '../services/authService';
import type { BackendUser } from '../services/authService';

export interface User {
    id: string;
    name: string;
    username: string;
    email: string;
    role: 'student' | 'staff' | 'employer';
    type?: 'alumni' | 'current';
    studentId?: string;
    studyLevel?: string;
    level?: number;
    facultyId?: string;
    departmentId?: string;
    isVerified?: boolean;
    major?: string;
    graduationYear?: number;
    resumeUrl?: string;
    /** Resolved from departmentId for display only; may be undefined. */
    department?: string;
    /** Employer company name — populated from EmployerProfile, not auth/me. */
    company?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    /** Full-page redirect to Campus One SSO. Pass `next` to return to a specific path. */
    signIn: (next?: string) => void;
    logout: () => Promise<void>;
    // Kept for backward compatibility — these are no-ops in the OIDC flow.
    token: string | null;
    login: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapBackendUser = (bu: BackendUser): User => ({
    id: bu.id,
    name: bu.name,
    username: bu.username,
    email: bu.email,
    role: bu.role,
    type: bu.student_subtype === 'alumni' ? 'alumni' : 'current',
    studentId: bu.student_id ?? undefined,
    studyLevel: bu.study_level ?? undefined,
    level: bu.level ?? undefined,
    facultyId: bu.faculty_id ?? undefined,
    departmentId: bu.department_id ?? undefined,
    isVerified: bu.is_verified,
    major: bu.major ?? undefined,
    graduationYear: bu.graduation_year ?? undefined,
    resumeUrl: bu.resume_url ?? undefined,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount, resolve the current user from the session cookie via /api/auth/me.
    useEffect(() => {
        getCurrentUser()
            .then((bu) => { if (bu) setUser(mapBackendUser(bu)); })
            .finally(() => setIsLoading(false));
    }, []);

    const signIn = useCallback((next?: string) => {
        ssoSignIn(next);
    }, []);

    const logout = useCallback(async () => {
        await ssoSignOut();
        setUser(null);
        window.location.replace('/login');
    }, []);

    // ── Backward-compat no-op ─────────────────────────────────────────────────
    // Used by the old email/password flow. Left in place so any page that
    // still imports it compiles without errors.
    const login = useCallback((_userData: User) => {}, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                signIn,
                logout,
                token: null,
                login,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};
