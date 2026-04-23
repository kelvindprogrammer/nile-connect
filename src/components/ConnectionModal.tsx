import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Avatar from './Avatar';
import { Send, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    name: string;
    role: string;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose, name, role }) => {
    const { showToast } = useToast();
    const [message, setMessage] = useState(`Hi ${name.split(' ')[0]}, I'd like to connect with you!`);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            showToast(`Connection request sent to ${name}!`, 'success');
            onClose();
        }, 1200);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="CUSTOMIZE CONNECTION">
            <form onSubmit={handleSubmit} className="space-y-6 font-sans">
                <div className="flex items-center space-x-6 bg-nile-white p-6 rounded-3xl border-3 border-black">
                    <Avatar name={name} size="lg" />
                    <div>
                        <p className="text-[10px] font-black text-nile-blue uppercase tracking-widest mb-1">CONNECTING WITH</p>
                        <h3 className="text-xl font-black text-black uppercase leading-tight">{name}</h3>
                        <p className="text-xs font-bold text-nile-blue/70 uppercase mt-1">Nile University • {role}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-black tracking-widest uppercase">CONNECTION NOTE</label>
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full h-40 border-3 border-black rounded-2xl p-6 font-bold text-sm outline-none focus:shadow-brutalist-sm transition-all bg-white"
                        placeholder="Say hello and tell them why you'd like to connect..."
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                    <Button variant="outline" onClick={onClose} type="button">CANCEL</Button>
                    <Button variant="primary" type="submit" isLoading={isSubmitting}>
                        <UserPlus size={16} strokeWidth={3} /> SEND REQUEST
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ConnectionModal;
