import React, { useState, useEffect } from 'react';
import Card from './Card';
import Avatar from './Avatar';
import { MessageSquare, RefreshCcw, Send, MoreHorizontal, ThumbsUp, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import CommentSection from './CommentSection';
import { apiClient } from '../services/api';

interface ApiPost {
    id: string;
    author_id: string;
    author_type: string;
    content: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
}

interface ApiEnvelope<T> { data: T; }

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

interface FeedProps {
    newPost?: { content: string } | null;
    onPostConsumed?: () => void;
}

const Feed: React.FC<FeedProps> = ({ newPost, onPostConsumed }) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [openComments, setOpenComments] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const fetchPosts = () => {
        apiClient
            .get<ApiEnvelope<{ posts: ApiPost[] }>>('/api/feed')
            .then(({ data }) => setPosts(data.data.posts ?? []))
            .catch(() => setPosts([]))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => { fetchPosts(); }, []);

    useEffect(() => {
        if (!newPost) return;
        apiClient
            .post<ApiEnvelope<ApiPost>>('/api/feed', { content: newPost.content })
            .then(({ data }) => {
                setPosts(prev => [data.data, ...prev]);
                showToast('Post published!', 'success');
            })
            .catch(() => showToast('Could not publish post.', 'error'))
            .finally(() => onPostConsumed?.());
    }, [newPost]);

    const toggleLike = (id: string) => {
        setLikedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, likes_count: likedIds.has(id) ? p.likes_count - 1 : p.likes_count + 1 } : p
        ));
    };

    const toggleComments = (id: string) => {
        setOpenComments(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const authorLabel = (p: ApiPost) => {
        if (user && p.author_id === user.id) return user.name;
        const roleMap: Record<string, string> = { student: 'STUDENT', staff: 'CAREER SERVICES', employer: 'EMPLOYER' };
        return roleMap[p.author_type] || 'COMMUNITY';
    };

    const roleTag = (p: ApiPost) => {
        if (user && p.author_id === user.id) return `${(user.role || 'USER').toUpperCase()} • YOU`;
        const tagMap: Record<string, string> = { student: 'STUDENT • NILE UNIVERSITY', staff: 'STAFF • CAREER SERVICES', employer: 'EMPLOYER • PARTNER' };
        return tagMap[p.author_type] || 'NILE COMMUNITY';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-nile-blue/40" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-16 text-center border-[2px] border-dashed border-black/10 rounded-[24px]">
                <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.2em]">NO POSTS YET — BE THE FIRST!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full max-w-lg mx-auto pb-10 font-sans">
            {posts.map((post) => (
                <Card key={post.id} variant="flat" className="p-0 border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">
                    <div className="p-4 pb-2 flex justify-between items-start">
                        <div className="flex space-x-3">
                            <div className="relative">
                                <Avatar name={authorLabel(post)} size="sm" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white border border-black rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-nile-green rounded-full pulse-green"></div>
                                </div>
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-black uppercase tracking-tight text-xs hover:text-nile-blue cursor-pointer leading-none">{authorLabel(post)}</h4>
                                <p className="text-[8px] font-black text-nile-blue/40 uppercase tracking-widest mt-0.5">{roleTag(post)}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-[7px] font-black text-black/20 uppercase">{timeAgo(post.created_at)}</span>
                            <button className="text-black/30 hover:text-black transition-colors">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 py-3 text-left">
                        <p className="text-xs font-bold text-nile-blue leading-relaxed uppercase tracking-wide">{post.content}</p>
                    </div>

                    <div className="px-4 py-2 flex justify-between items-center border-y-[2px] border-black/5 bg-nile-white/20">
                        <div className="flex items-center space-x-1.5">
                            <div className="z-10 bg-nile-blue text-white rounded-full p-1 border border-white">
                                <ThumbsUp size={7} strokeWidth={3} />
                            </div>
                            <span className="text-[9px] font-black text-black/50 uppercase tracking-widest">
                                {post.likes_count + (likedIds.has(post.id) ? 1 : 0)} REPS
                            </span>
                        </div>
                        <button onClick={() => toggleComments(post.id)} className="text-[9px] font-black text-nile-blue/30 uppercase tracking-widest hover:text-black">
                            {post.comments_count} REPLIES
                        </button>
                    </div>

                    <div className="px-3 py-1.5 grid grid-cols-4 gap-1.5 bg-white">
                        <button
                            onClick={() => toggleLike(post.id)}
                            className={`flex flex-col items-center py-2 rounded-xl transition-all ${likedIds.has(post.id) ? 'text-nile-blue bg-nile-blue/5' : 'text-black/30 hover:bg-nile-white'}`}
                        >
                            <ThumbsUp size={16} strokeWidth={likedIds.has(post.id) ? 3 : 2} />
                            <span className="text-[7px] font-black uppercase mt-1">Like</span>
                        </button>
                        <button
                            onClick={() => toggleComments(post.id)}
                            className={`flex flex-col items-center py-2 rounded-xl transition-all ${openComments.has(post.id) ? 'text-nile-blue bg-nile-blue/5' : 'text-black/30 hover:bg-nile-white'}`}
                        >
                            <MessageSquare size={16} strokeWidth={2} />
                            <span className="text-[7px] font-black uppercase mt-1">Comment</span>
                        </button>
                        <button
                            onClick={() => showToast('Repost coming soon!', 'success')}
                            className="flex flex-col items-center py-2 rounded-xl text-black/30 hover:bg-nile-white transition-all"
                        >
                            <RefreshCcw size={16} strokeWidth={2} />
                            <span className="text-[7px] font-black uppercase mt-1">Repost</span>
                        </button>
                        <button
                            onClick={() => showToast('Messaging coming soon!', 'success')}
                            className="flex flex-col items-center py-2 rounded-xl text-black/30 hover:bg-nile-white transition-all"
                        >
                            <Send size={16} strokeWidth={2} />
                            <span className="text-[7px] font-black uppercase mt-1">Send</span>
                        </button>
                    </div>

                    {openComments.has(post.id) && (
                        <div className="border-t-[2px] border-black/5 bg-nile-white/10 animate-in slide-in-from-top-1">
                            <CommentSection />
                        </div>
                    )}
                </Card>
            ))}

            <button
                onClick={fetchPosts}
                className="w-full py-6 border-[2px] border-dashed border-black/10 rounded-3xl text-[9px] font-black text-black/20 hover:border-black hover:text-black transition-all uppercase tracking-[0.2em]"
            >
                Refresh Feed
            </button>
        </div>
    );
};

export default Feed;
