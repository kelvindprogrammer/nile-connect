import React, { useEffect, useState } from 'react';
import Avatar from './Avatar';
import PostBar from './PostBar';
import CommentSection from './CommentSection';
import SharePostModal from './SharePostModal';
import { MessageCircle, RefreshCcw, Send, ThumbsUp, Loader2, Trash2, Trophy, Megaphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getPosts, toggleLike, deletePost, type Post } from '../services/feedService';
import { timeAgo } from '../utils/formatDate';
import JobShareCard from './JobShareCard';

const KIND_BADGE: Record<string, { label: string; className: string; Icon: typeof Trophy } | undefined> = {
    achievement: { label: 'Achievement', className: 'bg-nile-green/10 text-nile-green', Icon: Trophy },
    announcement: { label: 'Announcement', className: 'bg-nile-blue/10 text-nile-blue', Icon: Megaphone },
};

const ROLE_LABELS: Record<string, string> = {
    student: 'Student',
    staff: 'Career Services',
    employer: 'Employer',
};

const Feed: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [openComments, setOpenComments] = useState<Set<string>>(new Set());
    const [sharePost, setSharePost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPosts = (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        getPosts()
            .then(setPosts)
            .catch(() => setPosts([]))
            .finally(() => { setIsLoading(false); setRefreshing(false); });
    };

    useEffect(() => {
        let cancelled = false;
        getPosts()
            .then(list => { if (!cancelled) setPosts(list); })
            .catch(() => { if (!cancelled) setPosts([]); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handlePostCreated = (post: Post) => {
        setPosts(prev => [post, ...prev]);
    };

    const handleToggleLike = async (id: string) => {
        const target = posts.find(p => p.id === id);
        if (!target) return;
        const wasLiked = target.liked;

        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, liked: !wasLiked, likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1 } : p
        ));

        try {
            const result = await toggleLike(id);
            setPosts(prev => prev.map(p =>
                p.id === id ? { ...p, liked: result.liked, likes_count: result.likes_count } : p
            ));
        } catch {
            setPosts(prev => prev.map(p =>
                p.id === id ? { ...p, liked: wasLiked, likes_count: target.likes_count } : p
            ));
            showToast('Could not update like.', 'error');
        }
    };

    const toggleComments = (id: string) => {
        setOpenComments(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleCommentAdded = (postId: string) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
    };

    const handleCommentDeleted = (postId: string) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
    };

    const canModerate = user?.role === 'staff';

    const canDeletePost = (post: Post) => canModerate || user?.id === post.author_id;

    const handleDeletePost = async (id: string) => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        const removed = posts.find(p => p.id === id);
        setPosts(prev => prev.filter(p => p.id !== id));
        try {
            await deletePost(id);
        } catch {
            if (removed) setPosts(prev => [removed, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            showToast('Could not delete post.', 'error');
        }
    };

    const authorName = (p: Post) => {
        if (user && p.author_id === user.id) return 'You';
        return p.author_name || ROLE_LABELS[p.author_type] || 'Community member';
    };

    const roleTag = (p: Post) => {
        if (user && p.author_id === user.id) return ROLE_LABELS[user.role || ''] || 'You';
        return ROLE_LABELS[p.author_type] || 'Nile Connect';
    };

    return (
        <div className="space-y-4 w-full max-w-2xl mx-auto pb-10">
            <PostBar onPostCreated={handlePostCreated} />

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-gray-300" />
                </div>
            ) : posts.length === 0 ? (
                <div className="social-card py-14 text-center">
                    <MessageCircle size={28} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No posts yet — be the first to share something.</p>
                </div>
            ) : posts.map((post) => (
                <div key={post.id} className="social-card overflow-hidden">
                    <div className="p-4 pb-2 flex justify-between items-start">
                        <div className="flex gap-3">
                            <Avatar name={authorName(post)} size="sm" isSelf={user?.id === post.author_id} />
                            <div className="text-left min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">{authorName(post)}</h4>
                                <p className="text-xs text-gray-400 mt-0.5">{roleTag(post)} · {timeAgo(post.created_at)}</p>
                            </div>
                        </div>
                        {KIND_BADGE[post.kind] && (() => {
                            const badge = KIND_BADGE[post.kind]!;
                            const Icon = badge.Icon;
                            return (
                                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium flex-shrink-0 ${badge.className}`}>
                                    <Icon size={11} />{badge.label}
                                </span>
                            );
                        })()}
                        {canDeletePost(post) && (
                            <button
                                onClick={() => handleDeletePost(post.id)}
                                title="Delete post"
                                className="p-1.5 -m-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>

                    <div className="px-4 py-2">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {post.media_url && (
                        <div className="social-media mx-4 mb-1">
                            <img src={post.media_url} alt="Post attachment" loading="lazy" />
                        </div>
                    )}

                    {post.kind === 'job' && post.job_id && <JobShareCard jobId={post.job_id} />}

                    {(post.likes_count > 0 || post.comments_count > 0) && (
                        <div className="px-4 py-2 flex justify-between items-center text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                                {post.likes_count > 0 && (
                                    <>
                                        <span className="w-4 h-4 rounded-full bg-nile-blue text-white flex items-center justify-center flex-shrink-0">
                                            <ThumbsUp size={9} strokeWidth={3} />
                                        </span>
                                        <span>{post.likes_count}</span>
                                    </>
                                )}
                            </div>
                            {post.comments_count > 0 && (
                                <button onClick={() => toggleComments(post.id)} className="hover:text-gray-700 transition-colors">
                                    {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="px-2 py-1 grid grid-cols-3 gap-1 border-t border-gray-100">
                        <button
                            onClick={() => handleToggleLike(post.id)}
                            className={`action-btn ${post.liked ? 'active' : ''}`}
                        >
                            <ThumbsUp size={16} strokeWidth={post.liked ? 2.5 : 2} />
                            Like
                        </button>
                        <button
                            onClick={() => toggleComments(post.id)}
                            className={`action-btn ${openComments.has(post.id) ? 'active' : ''}`}
                        >
                            <MessageCircle size={16} />
                            Comment
                        </button>
                        <button
                            onClick={() => setSharePost(post)}
                            className="action-btn"
                        >
                            <Send size={16} />
                            Send
                        </button>
                    </div>

                    {openComments.has(post.id) && (
                        <CommentSection
                            postId={post.id}
                            onCommentAdded={() => handleCommentAdded(post.id)}
                            onCommentDeleted={() => handleCommentDeleted(post.id)}
                            canModerate={canModerate}
                        />
                    )}
                </div>
            ))}

            <button
                onClick={() => fetchPosts(true)}
                disabled={refreshing}
                className="w-full py-3 border border-dashed border-gray-200 rounded-2xl text-xs font-medium text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
                {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                Refresh feed
            </button>

            {sharePost && (
                <SharePostModal isOpen={!!sharePost} onClose={() => setSharePost(null)} post={sharePost} />
            )}
        </div>
    );
};

export default Feed;
