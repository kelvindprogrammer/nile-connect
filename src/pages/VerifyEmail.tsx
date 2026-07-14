import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, BadgeCheck } from 'lucide-react';
import NileConnectLogo from '../components/NileConnectLogo';

type Status = 'success' | 'invalid' | 'expired' | 'already-verified';

const CONFIG: Record<Status, { icon: React.ReactNode; title: string; message: string; tone: string }> = {
    success: {
        icon: <CheckCircle2 size={40} strokeWidth={2.5} />,
        title: 'Email confirmed',
        message: 'Your employer account email has been verified. You now have a verified badge on your company profile.',
        tone: 'bg-nile-green/10 text-nile-green border-nile-green/30',
    },
    'already-verified': {
        icon: <BadgeCheck size={40} strokeWidth={2.5} />,
        title: 'Already verified',
        message: 'This email address has already been confirmed. No further action is needed.',
        tone: 'bg-nile-blue/10 text-nile-blue border-nile-blue/30',
    },
    expired: {
        icon: <Clock size={40} strokeWidth={2.5} />,
        title: 'Link expired',
        message: 'This verification link has expired. Please request a new one from your employer dashboard, or contact support.',
        tone: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    },
    invalid: {
        icon: <XCircle size={40} strokeWidth={2.5} />,
        title: 'Invalid link',
        message: 'We couldn\'t verify this link. It may have already been used, or the URL may be incomplete. Contact support if this keeps happening.',
        tone: 'bg-red-50 text-red-500 border-red-200',
    },
};

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const statusParam = searchParams.get('status');
    const status: Status = (['success', 'invalid', 'expired', 'already-verified'] as Status[]).includes(statusParam as Status)
        ? (statusParam as Status)
        : 'invalid';

    const cfg = CONFIG[status];

    return (
        <div className="min-h-screen flex items-center justify-center bg-nile-white p-4 font-sans">
            <div className="max-w-md w-full bg-white border-[2px] border-black rounded-[28px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <NileConnectLogo />
                </div>
                <div className={`w-20 h-20 mx-auto rounded-full border-[2px] flex items-center justify-center ${cfg.tone}`}>
                    {cfg.icon}
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-black uppercase tracking-wide text-black">{cfg.title}</h1>
                    <p className="text-sm font-semibold text-black/60 leading-relaxed">{cfg.message}</p>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                    <Link
                        to="/employer"
                        className="w-full py-3 bg-black text-white border-[2px] border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-nile-blue transition-colors"
                    >
                        Go to employer dashboard
                    </Link>
                    <Link
                        to="/login"
                        className="w-full py-3 bg-white text-black border-[2px] border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-nile-white transition-colors"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
