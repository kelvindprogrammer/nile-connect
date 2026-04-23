import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BackendUser, AuthResponse } from '../services/authService';

// ---------------------------------------------------------------------------
// Frontend User type – maps from backend's BackendUser
// ---------------------------------------------------------------------------

export interface User {
    id: string;
    name: string;
    username: string;
    email: string;
    role: 'student' | 'staff' | 'employer';
    type?: 'alumni' | 'current';
    avatar?: string;
    company?: string;
    department?: string;
    major?: string;
    graduationYear?: number;
    isVerified?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    /** Called after a successful API auth response */
    loginWithResponse: (resp: AuthResponse) => void;
    /** Manually set a user (local-only, no token) – kept for legacy flows */
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helper: map backend user → frontend User
// ---------------------------------------------------------------------------

export const mapBackendUser = (bu: BackendUser): User => ({
    id: bu.id,
    name: bu.full_name,
    username: bu.username,
    email: bu.email,
    role: bu.role as User['role'],
    type: bu.student_subtype === 'alumni' ? 'alumni' : 'current',
    major: bu.major ?? undefined,
    graduationYear: bu.graduation_year ?? undefined,
    isVerified: bu.is_verified,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Rehydrate on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('nile_user');
        const savedToken = localStorage.getItem('nile_token');
        if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
        }
        if (savedToken) setToken(savedToken);
    }, []);

    // Listen for token expiry events emitted by the axios interceptor
    useEffect(() => {
        const handleExpiry = () => logout();
        window.addEventListener('auth:expired', handleExpiry);
        return () => window.removeEventListener('auth:expired', handleExpiry);
    }, []);

    const loginWithResponse = useCallback((resp: AuthResponse) => {
        const mapped = mapBackendUser(resp.user);
        setUser(mapped);
        setToken(resp.token);
        localStorage.setItem('nile_user', JSON.stringify(mapped));
        localStorage.setItem('nile_token', resp.token);
    }, []);

    const login = useCallback((userData: User) => {
        setUser(userData);
        localStorage.setItem('nile_user', JSON.stringify(userData));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('nile_user');
        localStorage.removeItem('nile_token');
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, token, loginWithResponse, login, logout, isAuthenticated: !!user }}
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
