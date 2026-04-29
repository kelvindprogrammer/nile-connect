import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, GraduationCap, Shield, Briefcase } from 'lucide-react';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../layouts/AuthLayout';
import { login as apiLogin } from '../../services/authService';
import type { User } from '../../context/AuthContext';

// ── Demo credentials (one login, pick any role) ───────────────────────────────
const DEMO_EMAIL    = 'demo@nileconnect.com';
const DEMO_PASSWORD = 'demo1234';

const DEMO_USERS: Record<'student' | 'staff' | 'employer', User> = {
    student: {
        id: 'demo-student', name: 'Demo Student', username: 'demo_student',
        email: DEMO_EMAIL, role: 'student', type: 'current',
        major: 'Computer Science', graduationYear: 2025, isVerified: true,
    },
    staff: {
        id: 'demo-staff', name: 'Demo Staff', username: 'demo_staff',
        email: DEMO_EMAIL, role: 'staff', department: 'Career Services', isVerified: true,
    },
    employer: {
        id: 'demo-employer', name: 'Demo Employer', username: 'demo_employer',
        email: DEMO_EMAIL, role: 'employer', company: 'Demo Company', isVerified: true,
    },
};

// ── Component ─────────────────────────────────────────────────────────────────

const Login = () => {
    const navigate = useNavigate();
    const { login, loginWithResponse } = useAuth();
    const { showToast } = useToast();

    const [email,     setEmail]     = useState('');
    const [password,  setPassword]  = useState('');
    const [showPw,    setShowPw]    = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pickRole,  setPickRole]  = useState(false);

    const isDemo =
        email.trim().toLowerCase() === DEMO_EMAIL &&
        password === DEMO_PASSWORD;

    const handleDemoRole = (role: 'student' | 'staff' | 'employer') => {
        localStorage.setItem('nile_token', `demo_${role}_${Date.now()}`);
        login(DEMO_USERS[role]);
        showToast(`Entered as Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, 'success');
        navigate(role === 'student' ? '/student' : role === 'staff' ? '/staff' : '/employer');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            showToast('Please enter your email and password.', 'error');
            return;
        }
        // Demo bypass — skip API, show role picker
        if (isDemo) {
            setPickRole(true);
            return;
        }
        // Real login
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

                <div className="space-y-1.5">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-none">Welcome Back.</h1>
                    <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">SIGN IN TO YOUR ACCOUNT</p>
                </div>

                {/* ── Role picker (shown after demo credentials submitted) ── */}
                {pickRole ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-3.5 bg-nile-green/8 border-[2px] border-nile-green/20 rounded-[16px]">
                            <p className="text-[8px] font-black text-nile-green uppercase tracking-widest">✓ DEMO ACCESS GRANTED</p>
                            <p className="text-[10px] font-bold text-black/55 uppercase mt-0.5">Select which role to enter as:</p>
                        </div>

                        <div className="space-y-2.5">
                            {([
                                { role: 'student'  as const, label: 'Student',  sub: 'Job board · AI career · Feed · Network', icon: <GraduationCap size={18} />, accent: 'bg-nile-blue'  },
                                { role: 'staff'    as const, label: 'Staff',    sub: 'Dashboard · CRM · Applications · Jobs',   icon: <Shield        size={18} />, accent: 'bg-black'     },
                                { role: 'employer' as const, label: 'Employer', sub: 'Post jobs · Browse candidates · Feed',    icon: <Briefcase     size={18} />, accent: 'bg-nile-green'},
                            ] as const).map(({ role, label, sub, icon, accent }) => (
                                <button
                                    key={role}
                                    onClick={() => handleDemoRole(role)}
                                    className="w-full flex items-center gap-4 p-4 bg-white border-[2px] border-black rounded-[16px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all text-left group"
                                >
                                    <div className={`w-10 h-10 ${accent} text-white rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm uppercase text-black">{label}</p>
                                        <p className="text-[8px] font-bold text-black/35 uppercase tracking-widest mt-0.5">{sub}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-black/25 uppercase group-hover:text-nile-blue transition-colors">→</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setPickRole(false)}
                            className="w-full text-[8px] font-black text-black/25 uppercase tracking-widest hover:text-black transition-colors text-center"
                        >
                            ← BACK
                        </button>
                    </div>
                ) : (
                    /* ── Normal login form ── */
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
                            {isDemo ? 'CONTINUE — PICK A ROLE →' : 'SIGN IN TO CONNECT'}
                        </Button>

                        {/* Demo hint */}
                        <div className="p-3 bg-nile-white border border-black/8 rounded-xl">
                            <p className="text-[7px] font-black text-black/30 uppercase tracking-widest mb-1">DEMO ACCESS</p>
                            <p className="text-[9px] font-bold text-black/50">
                                Email: <span className="font-black text-nile-blue">demo@nileconnect.com</span><br />
                                Password: <span className="font-black text-nile-blue">demo1234</span>
                            </p>
                        </div>
                    </form>
                )}

                {!pickRole && (
                    <div className="pt-4 border-t-[2px] border-black/5 text-center">
                        <button onClick={() => navigate('/join-as')} className="text-[9px] font-black text-nile-blue/40 hover:text-black transition-colors uppercase tracking-widest">
                            NEW? CREATE AN ACCOUNT →
                        </button>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
};

export default Login;
