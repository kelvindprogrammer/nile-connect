import React, { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getComments, addComment, type PostComment } from '../services/feedService';
import { timeAgo } from '../utils/formatDate';

interface CommentSectionProps {
    postId: string;
    onCommentAdded?: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, onCommentAdded }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const currentUser = user?.name || 'You';

    const [comments, setComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getComments(postId)
            .then(list => { if (!cancelled) setComments(list); })
            .catch(() => { if (!cancelled) setComments([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [postId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newComment.trim();
        if (!content || submitting) return;

        setSubmitting(true);
        try {
            const comment = await addComment(postId, content);
            setComments(prev => [...prev, comment]);
            setNewComment('');
            onCommentAdded?.();
        } catch {
            showToast('Could not post comment.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="px-4 py-4 bg-gray-50/60 border-t border-gray-100 space-y-3">
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 size={18} className="animate-spin text-gray-300" />
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No comments yet — start the conversation.</p>
                ) : comments.map(c => (
                    <div key={c.id} className="flex gap-2.5 items-start">
                        <Avatar name={c.author_name} size="sm" />
                        <div className="flex-1 bg-white border border-gray-100 rounded-2xl px-3 py-2 shadow-soft-xs">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-900 truncate">{c.author_name}</span>
                                <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2.5 pt-1">
                <Avatar name={currentUser} size="sm" />
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full bg-white border border-gray-200 rounded-full py-2.5 pl-4 pr-11 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || submitting}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-nile-blue text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-nile-blue-600"
                    >
                        {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CommentSection;
