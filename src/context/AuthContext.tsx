import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BackendUser, AuthResponse } from '../services/authService';

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
    isLoading: boolean;
    isAuthenticated: boolean;
    loginWithResponse: (resp: AuthResponse) => void;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('nile_user');
        const savedToken = localStorage.getItem('nile_token');
        if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch { /* corrupt data, ignore */ }
        }
        if (savedToken) setToken(savedToken);
        setIsLoading(false);
    }, []);

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
            value={{ user, token, isLoading, isAuthenticated: !!user, loginWithResponse, login, logout }}
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
