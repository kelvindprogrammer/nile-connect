import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Plus, Heart, Send, Loader2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api';

interface Post {
    id: string;
    author_id: string;
    author_type: string;
    content: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    liked?: boolean;
}

const EmployerFeed = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [newPost, setNewPost] = useState('');
    const [posting, setPosting] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await apiClient.get<{ data: { posts: Post[] } }>('/api/feed');
            setPosts(data.data.posts ?? []);
        } catch {
            showToast('Failed to load feed.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        setPosting(true);
        try {
            const { data } = await apiClient.post<{ data: Post }>('/api/feed', { content: newPost.trim() });
            setPosts(p => [data.data, ...p]);
            setNewPost('');
            setShowCompose(false);
            showToast('Posted!', 'success');
        } catch {
            showToast('Failed to post.', 'error');
        } finally {
            setPosting(false);
        }
    };

    const toggleLike = (id: string) => {
        setPosts(p => p.map(post =>
            post.id === id
                ? { ...post, liked: !post.liked, likes_count: post.liked ? post.likes_count - 1 : post.likes_count + 1 }
                : post
        ));
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'JUST NOW';
        if (mins < 60) return `${mins}M AGO`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}H AGO`;
        return `${Math.floor(hrs / 24)}D AGO`;
    };

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Community .</h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">NILE CONNECT LIVE FEED</p>
                </div>
                <button onClick={() => setShowCompose(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all">
                    {showCompose ? <X size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
                    {showCompose ? 'CANCEL' : 'POST'}
                </button>
            </div>

            {/* Compose */}
            {showCompose && (
                <div className="bg-white border-[2px] border-black rounded-[24px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] anime-fade-in">
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-3">NEW POST · VISIBLE TO ALL STUDENTS</p>
                    <form onSubmit={handlePost}>
                        <textarea
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            placeholder="Share a job opening, company update, hiring tips..."
                            rows={4}
                            className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 resize-none transition-all"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-3">
                            <button type="button" onClick={() => setShowCompose(false)}
                                className="px-4 py-2 border-2 border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all">
                                CANCEL
                            </button>
                            <button type="submit" disabled={!newPost.trim() || posting}
                                className="flex items-center gap-2 px-5 py-2 bg-nile-blue text-white border-2 border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40">
                                {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                {posting ? 'POSTING...' : 'PUBLISH'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Feed */}
            {loading ? (
                <div className="space-y-6 animate-pulse">
                    {[1,2,3].map(i => <div key={i} className="h-40 bg-black/5 rounded-[24px]" />)}
                </div>
            ) : posts.length === 0 ? (
                <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
                    <MessageCircle size={28} className="text-black/15 mx-auto mb-4" />
                    <p className="text-[9px] font-black text-black/30 uppercase">No posts yet — be the first to post!</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white border-[2px] border-black rounded-[24px] overflow-hidden hover:translate-y-[-1px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(30,73,157,0.2)] transition-all">
                            <div className="p-5 md:p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                                            {post.author_type === 'employer' ? '🏢' : post.author_type === 'staff' ? '🎓' : '👤'}
                                        </div>
                                        <div>
                                            <p className="font-black text-[10px] uppercase text-black">
                                                {post.author_id === user?.id ? 'YOU' : post.author_type === 'employer' ? 'COMPANY' : post.author_type.toUpperCase()}
                                            </p>
                                            <p className="text-[7px] font-black text-black/30 uppercase tracking-widest">{timeAgo(post.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-black leading-relaxed">{post.content}</p>
                                <div className="flex gap-5 mt-5 pt-4 border-t-[2px] border-black/5">
                                    <button onClick={() => toggleLike(post.id)}
                                        className={`flex items-center gap-1.5 font-black text-[9px] uppercase transition-colors ${post.liked ? 'text-black' : 'text-black/30 hover:text-black'}`}>
                                        <Heart size={14} strokeWidth={post.liked ? 3 : 2} fill={post.liked ? '#000' : 'none'} />
                                        {post.likes_count}
                                    </button>
                                    <button className="flex items-center gap-1.5 font-black text-[9px] uppercase text-black/30 hover:text-black transition-colors">
                                        <MessageCircle size={14} strokeWidth={2} />
                                        {post.comments_count}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployerFeed;
