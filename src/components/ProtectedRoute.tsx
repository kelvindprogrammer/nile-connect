import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeUrl } from '../utils/subdomain';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('student' | 'staff' | 'employer')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show a loading spinner while checking session with the proxy
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Force redirect to centralized login
        console.warn('Unauthorized access attempt. Redirecting to Campus One sign-in.');
        const callbackUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://portal.builtbysalih.com/sign-in?callbackURL=${callbackUrl}`;
        return null;
    }


    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        console.error(`User role ${user.role} not allowed for this route.`);
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-nile-gray/20 font-sans">
                <h1 className="text-4xl font-black text-red-600 mb-4 uppercase tracking-widest">Access Denied</h1>
                <p className="text-xl font-bold text-black mb-8 text-center max-w-md">
                    Your current role ({user.role}) does not have permission to access this portal.
                </p>
                <button 
                    onClick={() => window.location.href = 'https://portal.builtbysalih.com'}
                    className="px-6 py-3 bg-black text-white font-black uppercase tracking-widest border-2 border-black hover:bg-nile-blue transition-colors"
                >
                    Return to Portal
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
