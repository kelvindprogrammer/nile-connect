import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasSeenOnboarding, dashboardPathForRole } from '../utils/onboardingState';

/**
 * Decides what "/" means for the current visitor.
 *
 * It previously meant "/onboarding", always — so a signed-in user who typed
 * the bare domain was dropped back into the three-slide welcome carousel, and
 * clicking through it kicked off a fresh SSO round trip that re-displayed
 * Campus One's consent screen. The root now resolves in priority order:
 *
 *   1. an active session   -> that user's dashboard
 *   2. onboarding already seen -> the login page
 *   3. otherwise           -> the welcome carousel
 */
const RootRedirect = () => {
    const { user, isLoading } = useAuth();

    // Wait for /api/auth/me rather than guessing; redirecting early would send
    // a signed-in user to /login and back again.
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="w-8 h-8 rounded-full border-2 border-nile-blue border-t-transparent animate-spin" />
            </div>
        );
    }

    if (user) return <Navigate to={dashboardPathForRole(user.role)} replace />;
    return <Navigate to={hasSeenOnboarding() ? '/login' : '/onboarding'} replace />;
};

export default RootRedirect;
