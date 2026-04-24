import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Lock } from 'lucide-react';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../layouts/AuthLayout';
import { login as apiLogin } from '../../services/authService';

const Login = () => {
    const navigate = useNavigate();
    const { loginWithResponse } = useAuth();
    const { showToast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'student' | 'staff' | 'employer'>('student');
    const [isLoading, setIsLoading] = useState(false);

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
            const route =
                resp.user.role === 'student'
                    ? '/student'
                    : resp.user.role === 'staff'
                    ? '/staff'
                    : '/employer';
            navigate(route);
        } catch (err: any) {
            const msg =
                err?.response?.data?.error ||
                'Login failed. Please check your credentials.';
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center">
            <div className="relative z-10 w-24 h-24 bg-white border-[2px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] flex items-center justify-center mb-10">
                <KeyRound size={48} strokeWidth={2.5} className="text-black" />
            </div>
            <div className="space-y-1">
                <p className="text-xl font-black text-white uppercase tracking-[0.2em] leading-none">
                    Nile Connect
                </p>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.4em]">
                    Propelling Futures
                </p>
            </div>

            <div className="mt-10 p-4 bg-white/10 border border-white/20 rounded-xl text-left">
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-2">
                    Access
                </p>
                <p className="text-[8px] text-white/70">
                    Use your registered credentials to sign in.
                </p>
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="max-w-sm mx-auto w-full space-y-10 anime-fade-in text-left">
                {/* Heading */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight">
                        Login Hub
                    </h1>
                    <p className="text-[9px] font-black text-nile-blue uppercase tracking-[0.2em]">
                        ENTER AUTHORIZED CREDENTIALS
                    </p>
                </div>

                {/* Role Selector */}
                <div className="flex bg-nile-white/40 p-1 rounded-xl border-[2px] border-black shadow-sm">
                    {(['student', 'staff', 'employer'] as const).map((r) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`flex-1 py-3 font-black uppercase tracking-widest text-[8px] rounded-lg transition-all ${
                                role === r
                                    ? 'bg-nile-blue text-white shadow-[2px_2px_0px_0px_#6CBB56] border-2 border-black'
                                    : 'text-nile-blue/40 hover:text-black'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <InputField
                        label="EMAIL ADDRESS"
                        icon={<Mail size={16} />}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={
                            role === 'student'
                                ? 'YOUR@STUDENT.EDU.NG'
                                : role === 'staff'
                                ? 'YOUR@STAFF.EDU.NG'
                                : 'YOUR@COMPANY.COM'
                        }
                        required
                    />

                    <InputField
                        label="PASSWORD"
                        icon={<Lock size={16} />}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    <div className="pt-2">
                        <Button
                            type="submit"
                            fullWidth
                            size="md"
                            isLoading={isLoading}
                        >
                            CONTINUE TO HUB
                        </Button>
                    </div>
                </form>

                {/* Footer */}
                <div className="pt-8 border-t-[2px] border-black/5 text-center">
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.15em] mb-4">
                        NEW TO NILE CONNECT?
                    </p>
                    <button
                        onClick={() => navigate('/join-as')}
                        className="text-[10px] font-black text-nile-blue hover:text-nile-green transition-colors uppercase tracking-[0.2em] border-b-[1px] border-nile-blue/20 hover:border-nile-green pb-0.5"
                    >
                        CREATE PROFESSIONAL PROFILE
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Login;
