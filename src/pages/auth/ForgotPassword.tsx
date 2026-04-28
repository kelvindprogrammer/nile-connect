import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api';

type Step = 'email' | 'sent' | 'reset' | 'done';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            showToast('Please enter your email address.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await apiClient.post('/api/auth/forgot-password', { email });
            setStep('sent');
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to send reset link. Please try again.';
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) { showToast('Please enter the reset token from your email.', 'error'); return; }
        if (newPassword.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
        if (newPassword !== confirmPassword) { showToast('Passwords do not match.', 'error'); return; }
        setIsLoading(true);
        try {
            await apiClient.post('/api/auth/reset-password', { token, new_password: newPassword });
            setStep('done');
            showToast('Password reset successfully!', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Reset failed. The token may have expired.';
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center gap-6">
            <NileConnectLogo size="md" showText showTagline animated textColor="white" />
            <div className="p-4 bg-white/10 border border-white/20 rounded-xl text-left max-w-xs">
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-2">PASSWORD RESET</p>
                <p className="text-[10px] text-white/70 font-bold leading-relaxed uppercase">
                    Enter your registered email and we'll send you a secure reset link.
                </p>
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="max-w-sm mx-auto w-full space-y-8 anime-fade-in text-left">

                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => step === 'reset' ? setStep('sent') : navigate('/login')}
                        className="p-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all"
                    >
                        <ArrowLeft size={16} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-black uppercase tracking-tight leading-none">
                            {step === 'email' ? 'Forgot Password' : step === 'sent' ? 'Check Email' : step === 'reset' ? 'New Password' : 'All Done!'}
                        </h1>
                        <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">
                            {step === 'email' ? 'RESET YOUR ACCESS' : step === 'sent' ? 'RESET LINK SENT' : step === 'reset' ? 'CHOOSE STRONG PASSWORD' : 'PASSWORD CHANGED'}
                        </p>
                    </div>
                </div>

                {/* Step: Email entry */}
                {step === 'email' && (
                    <form onSubmit={handleRequestReset} className="space-y-6">
                        <p className="text-xs font-bold text-black/60 uppercase leading-relaxed">
                            Enter the email address associated with your Nile Connect account. We'll send you a password reset link.
                        </p>
                        <InputField
                            label="EMAIL ADDRESS"
                            icon={<Mail size={16} />}
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                        <Button type="submit" fullWidth size="md" isLoading={isLoading}>
                            SEND RESET LINK
                        </Button>
                    </form>
                )}

                {/* Step: Email sent confirmation */}
                {step === 'sent' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center text-center gap-4 p-6 bg-nile-green/5 border-[2px] border-nile-green/20 rounded-[20px]">
                            <div className="w-14 h-14 bg-nile-green/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-nile-green" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase text-black">Check Your Inbox</p>
                                <p className="text-[10px] font-bold text-black/60 uppercase mt-1 leading-relaxed">
                                    We sent a reset link to<br />
                                    <span className="text-nile-blue font-black">{email}</span>
                                </p>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-black/50 uppercase leading-relaxed text-center">
                            Got your reset token from the email?
                        </p>
                        <Button fullWidth onClick={() => setStep('reset')}>
                            I HAVE THE TOKEN →
                        </Button>
                        <button
                            onClick={handleRequestReset}
                            disabled={isLoading}
                            className="w-full text-[9px] font-black text-nile-blue/50 uppercase tracking-widest hover:text-nile-blue transition-colors text-center"
                        >
                            {isLoading ? 'RESENDING...' : 'RESEND LINK'}
                        </button>
                    </div>
                )}

                {/* Step: Enter token + new password */}
                {step === 'reset' && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-black uppercase tracking-widest">RESET TOKEN (FROM EMAIL)</label>
                            <input
                                type="text"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="Paste your reset token here"
                                required
                                className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-black uppercase tracking-widest">NEW PASSWORD</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    required
                                    minLength={8}
                                    className="w-full border-[2px] border-black rounded-xl py-3 pl-10 pr-12 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors">
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-black uppercase tracking-widest">CONFIRM PASSWORD</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat your new password"
                                    required
                                    className="w-full border-[2px] border-black rounded-xl py-3 pl-10 pr-4 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                                />
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-[9px] font-black text-red-500 uppercase">Passwords do not match</p>
                            )}
                        </div>

                        {/* Strength indicator */}
                        {newPassword && (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[8, 12, 16].map((len, i) => (
                                        <div key={i} className={`flex-1 h-1 rounded-full transition-all ${newPassword.length >= len ? (i === 0 ? 'bg-red-400' : i === 1 ? 'bg-yellow-400' : 'bg-nile-green') : 'bg-black/10'}`} />
                                    ))}
                                </div>
                                <p className="text-[8px] font-black text-black/40 uppercase">
                                    {newPassword.length < 8 ? 'TOO SHORT' : newPassword.length < 12 ? 'WEAK' : newPassword.length < 16 ? 'GOOD' : 'STRONG'}
                                </p>
                            </div>
                        )}

                        <Button type="submit" fullWidth size="md" isLoading={isLoading}>
                            RESET PASSWORD
                        </Button>
                    </form>
                )}

                {/* Step: Done */}
                {step === 'done' && (
                    <div className="space-y-6 text-center">
                        <div className="flex flex-col items-center gap-4 p-8 bg-nile-green/5 border-[2px] border-nile-green/20 rounded-[20px]">
                            <div className="w-16 h-16 bg-nile-green rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="font-black text-lg uppercase text-black">Password Reset!</p>
                                <p className="text-[10px] font-bold text-black/60 uppercase mt-1">Your password has been changed successfully.</p>
                            </div>
                        </div>
                        <Button fullWidth size="md" onClick={() => navigate('/login')}>
                            SIGN IN NOW →
                        </Button>
                    </div>
                )}

                {step !== 'done' && (
                    <div className="pt-4 border-t-[2px] border-black/5 text-center">
                        <button onClick={() => navigate('/login')} className="text-[9px] font-black text-nile-blue/40 hover:text-black transition-colors uppercase tracking-widest">
                            ← BACK TO SIGN IN
                        </button>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
};

export default ForgotPassword;
