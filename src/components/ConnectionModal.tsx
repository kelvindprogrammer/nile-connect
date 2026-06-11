import React, { useState } from 'react';
import axios from 'axios';
import { X, UserPlus, Loader2 } from 'lucide-react';
import Avatar from './Avatar';
import { useToast } from '../context/ToastContext';
import { requestConnection, type ConnectionItem } from '../services/connectionService';

interface ConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSent: (connection: ConnectionItem) => void;
    userId: string;
    name: string;
    role: string;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose, onSent, userId, name, role }) => {
    const { showToast } = useToast();
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setSending(true);
        try {
            const conn = await requestConnection(userId);
            showToast(`Connection request sent to ${name.split(' ')[0]}`, 'success');
            onSent(conn);
            onClose();
        } catch (err) {
            const msg = axios.isAxiosError(err) && err.response?.status === 409
                ? 'A connection request already exists with this person.'
                : 'Could not send connection request.';
            showToast(msg, 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 anime-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-soft-lg border border-gray-100 w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900">Send connection request</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 flex items-center gap-3">
                    <Avatar name={name} size="md" />
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{role}</p>
                    </div>
                </div>

                <p className="px-5 pb-1 text-sm text-gray-500">
                    {name.split(' ')[0]} will be notified and can accept your request to connect.
                </p>

                <div className="p-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={sending}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-nile-blue text-white hover:bg-nile-blue-600 transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        Send request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConnectionModal;
