import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../layouts/AuthLayout';
import { login as apiLogin } from '../../services/authService';
import { apiClient } from '../../services/api';

const Login = () => {
    const navigate = useNavigate();
    const { loginWithResponse } = useAuth();
    const { showToast } = useToast();

    const [email,     setEmail]     = useState('');
    const [password,  setPassword]  = useState('');
    const [showPw,    setShowPw]    = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionMsg, setSessionMsg] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('reason') === 'session_expired') {
            setSessionMsg('Your session expired. Please sign in again to continue.');
        }
        // Ensure demo accounts exist for presentation
        apiClient.post('/api/auth/seed-demo').catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            showToast('Please enter your email and password.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const resp = await apiLogin({ email, password });
            loginWithResponse(resp);
            showToast(`Welcome back, ${resp.user.full_name.split(' ')[0]}!`, 'success');
            const route = resp.user.role === 'student' ? '/student' : resp.user.role === 'staff' ? '/staff' : '/employer';
            navigate(route);
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Login failed. Please check your credentials.';
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

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
                {sessionMsg && (
                    <div className="p-3 bg-yellow-50 border-[2px] border-yellow-300 rounded-xl flex items-start gap-2">
                        <span className="text-yellow-500 text-sm flex-shrink-0">⚠</span>
                        <p className="text-[9px] font-bold text-yellow-700 leading-snug">{sessionMsg}</p>
                    </div>
                )}
                <div className="space-y-1.5">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-none">Welcome Back.</h1>
                    <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">SIGN IN TO YOUR ACCOUNT</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <InputField
                        label="EMAIL ADDRESS"
                        icon={<Mail size={15} />}
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                    />

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">PASSWORD</label>
                            <button type="button" onClick={() => navigate('/forgot-password')} className="text-[8px] font-black text-nile-blue/50 uppercase hover:text-nile-blue transition-colors tracking-widest">
                                FORGOT?
                            </button>
                        </div>
                        <div className="relative">
                            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full border-[2px] border-black rounded-xl py-3 pl-10 pr-12 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors">
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" fullWidth size="md" isLoading={isLoading}>
                        SIGN IN TO CONNECT
                    </Button>
                </form>

                <div className="pt-4 border-t-[2px] border-black/5 space-y-3">
                    <div className="text-center">
                        <button onClick={() => navigate('/join-as')} className="text-[9px] font-black text-nile-blue/40 hover:text-black transition-colors uppercase tracking-widest">
                            NEW? CREATE AN ACCOUNT →
                        </button>
                    </div>
                    {/* Demo accounts - remove before production */}
                    <div className="p-3 bg-nile-white border border-black/10 rounded-xl space-y-1.5">
                        <p className="text-[7px] font-black text-black/30 uppercase tracking-widest">DEMO ACCOUNTS</p>
                        {[
                            { role: 'STUDENT', email: 'student@demo.nileconnect.com' },
                            { role: 'STAFF',   email: 'staff@demo.nileconnect.com'   },
                            { role: 'EMPLOYER',email: 'employer@demo.nileconnect.com' },
                        ].map(d => (
                            <button key={d.role} onClick={() => { setEmail(d.email); setPassword('NileDemo2025!'); }}
                                className="w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors group">
                                <span className="text-[8px] font-black text-black/50 uppercase group-hover:text-black">{d.role}</span>
                                <span className="text-[7px] font-bold text-black/30 group-hover:text-nile-blue">{d.email}</span>
                            </button>
                        ))}
                        <p className="text-[7px] font-black text-black/20 uppercase">Password: NileDemo2025!</p>
                    </div>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Login;
