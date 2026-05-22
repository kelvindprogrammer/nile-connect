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
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{item}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="max-w-sm mx-auto w-full space-y-8 anime-fade-in text-left">

                {sessionExpired && (
                    <div className="p-3 bg-yellow-50 border-[2px] border-yellow-300 rounded-xl flex items-start gap-2">
                        <span className="text-yellow-500 text-sm flex-shrink-0">⚠</span>
                        <p className="text-[9px] font-bold text-yellow-700 leading-snug">
                            Your session expired. Please sign in again to continue.
                        </p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-none">
                        Welcome Back.
                    </h1>
                    <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">
                        SIGN IN WITH YOUR NILE UNIVERSITY ACCOUNT
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="p-4 bg-nile-white border-[2px] border-black/10 rounded-xl space-y-3">
                        <p className="text-[9px] font-black text-black/50 uppercase tracking-widest">
                            SINGLE SIGN-ON
                        </p>
                        <p className="text-xs text-black/60 leading-relaxed">
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
                            SIGN IN WITH CAMPUS ONE
                        </span>
                    </Button>
                </div>

                <div className="pt-4 border-t-[2px] border-black/5 text-center">
                    <p className="text-[8px] font-black text-black/30 uppercase tracking-widest leading-relaxed">
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
