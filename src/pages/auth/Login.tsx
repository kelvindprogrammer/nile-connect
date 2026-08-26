import { AlertCircle } from 'lucide-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NileConnectLogo from '../../components/NileConnectLogo';
import Button from '../../components/Button';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../context/AuthContext';

const CampusOneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const Login = () => {
    const navigate = useNavigate();
    const { user, isLoading, signIn } = useAuth();

    // If already authenticated, redirect to the appropriate portal.
    useEffect(() => {
        if (!isLoading && user) {
            const route = user.role === 'staff' ? '/staff'
                : user.role === 'employer' ? '/employer'
                : '/student';
            navigate(route, { replace: true });
        }
    }, [user, isLoading, navigate]);

    const handleSignIn = () => {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') ?? '';
        signIn(next || undefined);
    };

    const sessionExpired = new URLSearchParams(window.location.search).get('reason') === 'session_expired';

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center gap-8">
            <NileConnectLogo size="md" showText showTagline animated textColor="white" />
            <div className="space-y-3 max-w-xs">
                {['Connect with employers & alumni', 'AI-powered career coaching', 'Real-time messaging & video calls'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-left p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="w-1.5 h-1.5 bg-nile-green rounded-full flex-shrink-0" />
                        <p className="text-[11px] font-bold text-white/70 tracking-tight">{item}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="max-w-sm mx-auto w-full space-y-8 anime-fade-in text-left">

                {sessionExpired && (
                    <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-xl flex items-start gap-2">
                        <AlertCircle size={15} strokeWidth={1.75} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-yellow-700 leading-snug">
                            Your session expired. Please sign in again to continue.
                        </p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <h1 className="co-display text-4xl text-ink-800 leading-none">
                        Welcome back
                    </h1>
                    <p className="text-[11px] font-semibold text-nile-blue/50 uppercase tracking-[0.14em]">
                        SIGN IN WITH YOUR NILE UNIVERSITY ACCOUNT
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="p-4 bg-nile-white border border-paper-400/10 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold text-paper-700 tracking-tight">
                            SINGLE SIGN-ON
                        </p>
                        <p className="text-xs text-paper-700 leading-relaxed">
                            Use your Nile University Campus One account. No separate
                            password needed — just sign in with your university credentials.
                        </p>
                    </div>

                    <Button
                        type="button"
                        fullWidth
                        size="md"
                        onClick={handleSignIn}
                        isLoading={isLoading}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <CampusOneIcon />
                            Sign in with Campus One
                        </span>
                    </Button>

                    {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium text-amber-900 uppercase tracking-[0.14em]">
                                    Local dev sign-in
                                </p>
                                <span className="text-[10px] font-medium bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Dev only</span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-snug">
                                Signs in against the local database without Campus One credentials. The endpoint
                                refuses any request that is not to a loopback host.
                            </p>
                            <div className="grid grid-cols-3 gap-2 pt-1">
                                {(['student', 'employer', 'staff'] as const).map(role => (
                                    <a
                                        key={role}
                                        href={`/api/auth/dev-login?role=${role}`}
                                        className="px-2 py-2 text-center text-xs font-medium bg-white border border-amber-300 hover:border-amber-500 rounded-md text-amber-900 shadow-soft-xs transition-colors capitalize"
                                    >
                                        {role}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t-[2px] border-paper-400/5 text-center">
                    <p className="text-[8px] font-semibold text-paper-600 tracking-tight leading-relaxed">
                        By signing in you agree to Nile Connect's terms of service.
                        <br />
                        Your identity is verified by Campus One (Nile University SSO).
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Login;
