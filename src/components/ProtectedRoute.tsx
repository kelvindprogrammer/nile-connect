import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Simple mockup of a protected route component. 
// In a real application, you would check the user's role from auth context (e.g., Supabase session).
interface ProtectedRouteProps {
    allowedRoles?: ('student' | 'employer' | 'staff')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    // Mock user auth check
    const isAuthenticated = true; // Replace with e.g. `!!session`
    const userRole = 'student'; // Replace with actual user role
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole as any)) {
        // Redirection logic if user lacks correct permissions
        return <Navigate to="/onboarding" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
