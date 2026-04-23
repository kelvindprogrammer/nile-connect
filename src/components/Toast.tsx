import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-10 right-10 z-[100] border-4 border-black rounded-2xl p-5 shadow-brutalist flex items-center space-x-4 anime-fade-in
            ${type === 'success' ? 'bg-nile-green text-white' : 'bg-red-500 text-white'}
        `}>
            {type === 'success' ? <CheckCircle2 size={24} strokeWidth={3} /> : <XCircle size={24} strokeWidth={3} />}
            <span className="font-black uppercase tracking-widest text-xs">{message}</span>
            <button onClick={onClose} className="hover:scale-110 transition-transform">
                <X size={20} strokeWidth={3} />
            </button>
        </div>
    );
};

export default Toast;
