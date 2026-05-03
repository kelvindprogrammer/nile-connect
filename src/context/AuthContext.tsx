import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

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
    logout: () => void;
    isAuthenticated: boolean;
    // Keeping these for backwards compatibility if needed, but they are no-ops now
    loginWithResponse: (resp: any) => void;
    login: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch centralized session on mount
    useEffect(() => {
        const fetchSession = async () => {
            try {
                // Request hits the local /api/auth/session proxy, which forwards the cookie to Campus One
                const { data } = await apiClient.get('/api/auth/session', { withCredentials: true });
                if (data && data.user) {
                    setUser({
                        id: data.user.id,
                        name: data.user.name,
                        username: data.user.email.split('@')[0], // Extract username from email
                        email: data.user.email,
                        role: data.user.role as any,
                        isVerified: true
                    });
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.warn("Session check failed or no active session.");
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        // Delegate to portal sign-out
        window.location.href = `https://portal.builtbysalih.com/sign-out?callbackURL=${encodeURIComponent(window.location.href)}`;
    }, []);

    // No-ops for legacy local auth flow
    const loginWithResponse = useCallback(() => {}, []);
    const login = useCallback(() => {}, []);

    return (
        <AuthContext.Provider
            value={{ 
                user, 
                token: null, // Tokens are no longer managed client-side
                isLoading, 
                logout, 
                isAuthenticated: !!user,
                loginWithResponse,
                login
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
