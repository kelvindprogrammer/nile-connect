import React, { useState } from 'react';
import Avatar from './Avatar';
import { Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Comment {
    id: number;
    user: string;
    content: string;
    time: string;
}

const CommentSection: React.FC = () => {
    const { user } = useAuth();
    const currentUser = user?.name || 'USER';

    const [comments, setComments] = useState<Comment[]>([
        { id: 1, user: 'John Doe', content: 'This is amazing! Definitely looking forward to it.', time: '1h ago' }
    ]);
    const [newComment, setNewComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: Date.now(),
            user: currentUser,
            content: newComment,
            time: 'Just now'
        };

        setComments([...comments, comment]);
        setNewComment('');
    };

    return (
        <div className="px-6 py-4 bg-nile-white/40 border-t-2 border-black/5 space-y-4 font-sans anime-fade-in">
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {comments.map((c) => (
                    <div key={c.id} className="flex space-x-3 items-start">
                        <Avatar name={c.user} size="sm" />
                        <div className="flex-1 bg-white border-[2px] border-black rounded-2xl p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black uppercase text-black">{c.user}</span>
                                <span className="text-[8px] font-bold text-nile-blue/50 uppercase">{c.time}</span>
                            </div>
                            <p className="text-[11px] font-bold text-nile-blue uppercase leading-tight">{c.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="relative flex items-center space-x-3 pt-2">
                <Avatar name={currentUser} size="sm" />
                <div className="flex-1 relative">
                    <input 
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="ADD A COMMENT..."
                        className="w-full bg-white border-[2px] border-black rounded-full py-3 pl-5 pr-12 font-bold text-[10px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all"
                    />
                    <button 
                        type="submit"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-nile-blue text-white rounded-full border-2 border-black shadow-sm active:scale-90 transition-all ${!newComment.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:rotate-12'}`}
                    >
                        <Send size={12} strokeWidth={3} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CommentSection;
