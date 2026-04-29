import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, Shield, Briefcase, ArrowRight,
    Eye, EyeOff, ChevronRight, Sparkles, Copy, Check,
} from 'lucide-react';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { User } from '../../context/AuthContext';

// ── Demo account definitions ──────────────────────────────────────────────────

const DEMO_ACCOUNTS: {
    role: User['role'];
    name: string;
    username: string;
    email: string;
    password: string;
    subtitle: string;
    detail: string;
    icon: React.ReactNode;
    bg: string;
    border: string;
    shadow: string;
    tag: string;
    user: User;
}[] = [
    {
        role: 'student',
        name: 'Kelvin Ibilib C.',
        username: 'kelvin_student',
        email: 'kelvin@student.nileuniversity.edu.ng',
        password: 'Demo@2025',
        subtitle: 'Computer Science · L400',
        detail: 'Access job board, AI career tools, mock interviews, network, feed and events.',
        icon: <GraduationCap size={24} strokeWidth={2} />,
        bg: 'bg-nile-blue',
        border: 'border-nile-blue/20',
        shadow: 'shadow-[4px_4px_0px_0px_rgba(30,73,157,1)]',
        tag: 'STUDENT',
        user: {
            id: 'demo-student-001',
            name: 'Kelvin Ibilib C.',
            username: 'kelvin_student',
            email: 'kelvin@student.nileuniversity.edu.ng',
            role: 'student',
            type: 'current',
            major: 'Computer Science',
            graduationYear: 2025,
            isVerified: true,
        },
    },
    {
        role: 'staff',
        name: 'Sarah Admin',
        username: 'sarah_staff',
        email: 'sarah@staff.nileuniversity.edu.ng',
        password: 'Demo@2025',
        subtitle: 'Career Services · Staff',
        detail: 'Manage students, approve employers, oversee jobs, view analytics and CRM tools.',
        icon: <Shield size={24} strokeWidth={2} />,
        bg: 'bg-black',
        border: 'border-black/20',
        shadow: 'shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]',
        tag: 'STAFF',
        user: {
            id: 'demo-staff-001',
            name: 'Sarah Admin',
            username: 'sarah_staff',
            email: 'sarah@staff.nileuniversity.edu.ng',
            role: 'staff',
            department: 'Career Services',
            isVerified: true,
        },
    },
    {
        role: 'employer',
        name: 'Jennifer Okafor',
        username: 'jennifer_employer',
        email: 'jennifer@microsoft.com',
        password: 'Demo@2025',
        subtitle: 'HR Director · Microsoft Nigeria',
        detail: 'Post jobs, browse candidates, manage applications and engage with the student community.',
        icon: <Briefcase size={24} strokeWidth={2} />,
        bg: 'bg-nile-green',
        border: 'border-nile-green/20',
        shadow: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
        tag: 'EMPLOYER',
        user: {
            id: 'demo-employer-001',
            name: 'Jennifer Okafor',
            username: 'jennifer_employer',
            email: 'jennifer@microsoft.com',
            role: 'employer',
            company: 'Microsoft Nigeria',
            isVerified: true,
        },
    },
];

// ── Copy button ───────────────────────────────────────────────────────────────

const CopyBtn = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };
    return (
        <button onClick={copy} className="p-1 text-black/20 hover:text-nile-blue transition-colors flex-shrink-0" title="Copy">
            {copied ? <Check size={11} strokeWidth={3} className="text-nile-green" /> : <Copy size={11} strokeWidth={3} />}
        </button>
    );
};

// ── Role Card ─────────────────────────────────────────────────────────────────

const RoleCard = ({
    account, onLogin, loading,
}: {
    account: typeof DEMO_ACCOUNTS[0];
    onLogin: () => void;
    loading: boolean;
}) => {
    const [showPw, setShowPw] = useState(false);

    return (
        <div className={`bg-white border-[2px] border-black rounded-[24px] ${account.shadow} overflow-hidden transition-all hover:translate-y-[-2px]`}>
            {/* Header */}
            <div className={`${account.bg} text-white px-6 py-5 flex items-start justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
                        {account.icon}
                    </div>
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">{account.tag}</span>
                        <p className="font-black text-base leading-tight">{account.name}</p>
                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5">{account.subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Credentials */}
            <div className="px-5 py-4 space-y-3 border-b border-black/5 bg-nile-white/40">
                <div className="space-y-2">
                    {/* Email */}
                    <div className="flex items-center justify-between bg-white border border-black/10 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                            <p className="text-[6px] font-black text-black/30 uppercase tracking-widest">EMAIL</p>
                            <p className="text-[9px] font-black text-black truncate">{account.email}</p>
                        </div>
                        <CopyBtn text={account.email} />
                    </div>
                    {/* Password */}
                    <div className="flex items-center justify-between bg-white border border-black/10 rounded-xl px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-[6px] font-black text-black/30 uppercase tracking-widest">PASSWORD</p>
                            <p className="text-[9px] font-black text-black font-mono tracking-wider">
                                {showPw ? account.password : '•••••••••'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setShowPw(v => !v)} className="p-1 text-black/20 hover:text-nile-blue transition-colors">
                                {showPw ? <EyeOff size={11} strokeWidth={3} /> : <Eye size={11} strokeWidth={3} />}
                            </button>
                            <CopyBtn text={account.password} />
                        </div>
                    </div>
                </div>

                <p className="text-[9px] font-bold text-black/40 leading-relaxed">{account.detail}</p>
            </div>

            {/* Login button */}
            <div className="px-5 py-4">
                <button
                    onClick={onLogin}
                    disabled={loading}
                    className={`w-full flex items-center justify-center gap-2 py-3 ${account.bg} text-white font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-50`}
                >
                    {loading ? (
                        <span className="animate-pulse">ENTERING...</span>
                    ) : (
                        <>
                            ENTER AS {account.tag}
                            <ArrowRight size={14} strokeWidth={3} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const DemoLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { showToast } = useToast();
    const [loadingRole, setLoadingRole] = useState<string | null>(null);

    const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
        setLoadingRole(account.role);

        // Small delay for UX feel
        setTimeout(() => {
            // Set demo token so API calls include an auth header
            localStorage.setItem('nile_token', `demo_token_${account.role}_${Date.now()}`);
            // Set user in context
            login(account.user);

            showToast(`Welcome, ${account.user.name.split(' ')[0]}! Logged in as ${account.tag}.`, 'success');

            const routes: Record<string, string> = {
                student: '/student',
                staff: '/staff',
                employer: '/employer',
            };
            navigate(routes[account.role]);
        }, 600);
    };

    return (
        <div className="min-h-screen bg-nile-white font-sans flex flex-col items-center justify-start py-8 px-4">

            {/* Header */}
            <div className="w-full max-w-4xl mb-8 text-center space-y-4">
                <NileConnectLogo size="md" showText showTagline animated textColor="dark" className="mx-auto" />

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-nile-blue/8 border border-nile-blue/20 rounded-full">
                    <Sparkles size={12} className="text-nile-blue" />
                    <span className="text-[9px] font-black text-nile-blue uppercase tracking-[0.25em]">DEMO ACCESS — ALL ROLES</span>
                </div>

                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tighter leading-none">
                        One Password<span className="text-nile-green">.</span> Every Role<span className="text-nile-blue">.</span>
                    </h1>
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">
                        Click any role below to instantly enter the platform — no setup required.
                    </p>
                </div>
            </div>

            {/* Role cards */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {DEMO_ACCOUNTS.map(account => (
                    <RoleCard
                        key={account.role}
                        account={account}
                        onLogin={() => handleDemoLogin(account)}
                        loading={loadingRole === account.role}
                    />
                ))}
            </div>

            {/* Quick-reference credentials table */}
            <div className="w-full max-w-4xl bg-white border-[2px] border-black rounded-[20px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden mb-6">
                <div className="px-5 py-3 border-b border-black/5 bg-nile-white/60 flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-black/40">QUICK REFERENCE</span>
                    <span className="text-[7px] font-black text-nile-blue/50 uppercase">— ALL ACCOUNTS USE THE SAME PASSWORD</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-black/5 bg-nile-white/30">
                                {['ROLE','NAME','EMAIL','PASSWORD'].map(h => (
                                    <th key={h} className="px-5 py-2.5 text-[7px] font-black text-black/30 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DEMO_ACCOUNTS.map((a, i) => (
                                <tr key={a.role} className={`border-b border-black/5 hover:bg-nile-white/50 transition-colors ${i === DEMO_ACCOUNTS.length - 1 ? 'border-0' : ''}`}>
                                    <td className="px-5 py-3">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white uppercase ${a.bg}`}>{a.tag}</span>
                                    </td>
                                    <td className="px-5 py-3 text-[10px] font-black text-black uppercase">{a.name}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-bold text-nile-blue">{a.email}</span>
                                            <CopyBtn text={a.email} />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-bold font-mono text-black">{a.password}</span>
                                            <CopyBtn text={a.password} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer links */}
            <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest text-black/30">
                <button onClick={() => navigate('/login')} className="hover:text-nile-blue transition-colors flex items-center gap-1">
                    SIGN IN WITH REAL ACCOUNT <ChevronRight size={10} strokeWidth={3} />
                </button>
                <span>·</span>
                <button onClick={() => navigate('/join-as')} className="hover:text-nile-green transition-colors flex items-center gap-1">
                    CREATE ACCOUNT <ChevronRight size={10} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default DemoLogin;
