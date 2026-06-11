import React, { useEffect, useState } from 'react';
import { X, Loader2, Send, Users as UsersIcon } from 'lucide-react';
import Avatar from './Avatar';
import { getConversations, sendMessage, type Conversation } from '../services/messageService';
import { useToast } from '../context/ToastContext';
import type { Post } from '../services/feedService';

interface SharePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
}

const SharePostModal: React.FC<SharePostModalProps> = ({ isOpen, onClose, post }) => {
    const { showToast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingTo, setSendingTo] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        getConversations()
            .then(list => { if (!cancelled) setConversations(list); })
            .catch(() => { if (!cancelled) setConversations([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSend = async (userId: string) => {
        setSendingTo(userId);
        try {
            const snippet = post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content;
            await sendMessage(userId, `Shared a post: "${snippet}"`);
            showToast('Post shared!', 'success');
            onClose();
        } catch {
            showToast('Could not share post.', 'error');
        } finally {
            setSendingTo(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 anime-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-soft-lg border border-gray-100 w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <h3 className="font-semibold text-sm text-gray-900">Send to</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={20} className="animate-spin text-gray-300" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
                            <UsersIcon size={28} className="text-gray-200" />
                            <p className="text-sm text-gray-400">Start a conversation first to share posts.</p>
                        </div>
                    ) : conversations.map(c => (
                        <button
                            key={c.user_id}
                            onClick={() => handleSend(c.user_id)}
                            disabled={sendingTo !== null}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <Avatar name={c.full_name} size="sm" />
                            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{c.full_name}</span>
                            {sendingTo === c.user_id
                                ? <Loader2 size={16} className="animate-spin text-gray-400" />
                                : <Send size={16} className="text-gray-300" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SharePostModal;
