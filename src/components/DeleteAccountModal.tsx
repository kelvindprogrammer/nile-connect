import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { deleteAccount } from '../services/authService';

interface DeleteAccountModalProps {
    onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const confirmed = confirmText === 'DELETE';

    const handleDelete = async () => {
        if (!confirmed) return;
        setIsDeleting(true);
        try {
            await deleteAccount();
            logout();
            showToast('Account deleted. Sorry to see you go.', 'success');
            navigate('/onboarding');
        } catch {
            showToast('Deletion failed. Please try again.', 'error');
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white border-[3px] border-black rounded-[28px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 md:p-8 space-y-6"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 border-2 border-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={18} className="text-red-500" strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-tight text-black">Delete Account</h3>
                            <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">PERMANENT · IRREVERSIBLE</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 border-2 border-black/10 rounded-lg hover:bg-black/5 transition-colors">
                        <X size={14} strokeWidth={3} />
                    </button>
                </div>

                {/* Warning */}
                <div className="p-4 bg-red-50 border-[2px] border-red-200 rounded-[16px] space-y-2">
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">This will permanently:</p>
                    <ul className="space-y-1">
                        {[
                            'Delete your account and all profile data',
                            'Remove all your applications and activity',
                            'Revoke access to Nile Connect immediately',
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-[10px] font-bold text-red-600 uppercase">
                                <span className="mt-0.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Confirm input */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-black/50 uppercase tracking-widest">
                        Type <span className="text-red-500 font-black">DELETE</span> to confirm
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value.toUpperCase())}
                        placeholder="DELETE"
                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-sm uppercase outline-none focus:border-red-500 focus:shadow-[3px_3px_0px_0px_rgba(239,68,68,0.3)] transition-all"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border-[2px] border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={!confirmed || isDeleting}
                        className="flex-1 py-3 bg-red-500 text-white border-[2px] border-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-30 disabled:translate-x-0 disabled:translate-y-0 flex items-center justify-center gap-2"
                    >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
                        {isDeleting ? 'DELETING...' : 'DELETE ACCOUNT'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
