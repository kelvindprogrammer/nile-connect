import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('student' | 'staff' | 'employer')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 font-sans">
                <h1 className="text-4xl font-black text-red-600 mb-4 uppercase tracking-widest">Access Denied</h1>
                <p className="text-xl font-bold text-black mb-8 text-center max-w-md">
                    Your current role ({user.role}) does not have permission to access this portal.
                </p>
                <button
                    onClick={() => window.location.href = '/login'}
                    className="px-6 py-3 bg-black text-white font-black uppercase tracking-widest border-2 border-black hover:bg-blue-800 transition-colors"
                >
                    Return to Login
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
