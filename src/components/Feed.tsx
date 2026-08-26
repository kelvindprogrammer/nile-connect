import React, { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import PostBar from './PostBar';
import CommentSection from './CommentSection';
import SharePostModal from './SharePostModal';
import ReactionBar, { ReactionCount } from './social/ReactionBar';
import PostActionsMenu from './social/PostActionsMenu';
import PostBody from './social/PostBody';
import StoryTrayRail from './stories/StoryTray';
import PollCard from './social/PollCard';
import {
    MessageCircle, Send, Loader2, Trophy, Megaphone, Repeat2,
    Globe, Users as UsersIcon, Lock, Star, AlertCircle, Sparkles, Clock,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
    getFeed, deletePost, repost as doRepost, undoRepost,
    type Post, type FeedMode,
} from '../services/feedService';
import type { ReactionSummary, Audience } from '../services/socialService';
import { getErrorMessage } from '../services/api';
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

/** Audience badge. Public posts show nothing — the default needs no label. */
const AUDIENCE_BADGE: Partial<Record<Audience, { Icon: typeof Globe; label: string }>> = {
    connections: { Icon: UsersIcon, label: 'Connections' },
    close_friends: { Icon: Star, label: 'Close friends' },
    only_me: { Icon: Lock, label: 'Only you' },
    group: { Icon: UsersIcon, label: 'Group' },
};

const PAGE_SIZE = 20;

const Feed: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [openComments, setOpenComments] = useState<Set<string>>(new Set());
    const [sharePost, setSharePost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextOffset, setNextOffset] = useState(0);
    const [mode, setMode] = useState<FeedMode>('ranked');
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const sentinelRef = useRef<HTMLDivElement>(null);
    // Guards against a stale response from a previous mode overwriting the
    // current one when the user toggles quickly.
    const requestSeq = useRef(0);

    // ── Initial load / mode change ────────────────────────────────────────
    useEffect(() => {
        const seq = ++requestSeq.current;
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        getFeed({ limit: PAGE_SIZE, mode })
            .then(page => {
                if (cancelled || seq !== requestSeq.current) return;
                setPosts(page.posts);
                setHasMore(page.has_more);
                setNextOffset(page.next_offset);
            })
            .catch(err => {
                if (cancelled || seq !== requestSeq.current) return;
                setPosts([]);
                setError(getErrorMessage(err, 'We could not load your feed. Check your connection and try again.'));
            })
            .finally(() => {
                if (!cancelled && seq === requestSeq.current) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [mode, reloadToken]);

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const seq = requestSeq.current;

        getFeed({ limit: PAGE_SIZE, offset: nextOffset, mode })
            .then(page => {
                if (seq !== requestSeq.current) return;
                // Deduplicate by id: ranking can shift between requests, and a
                // duplicate key would both break React and show the post twice.
                setPosts(prev => {
                    const seen = new Set(prev.map(p => p.id));
                    return [...prev, ...page.posts.filter(p => !seen.has(p.id))];
                });
                setHasMore(page.has_more);
                setNextOffset(page.next_offset);
            })
            .catch(() => {
                if (seq === requestSeq.current) {
                    showToast('Could not load more posts.', 'error');
                }
            })
            .finally(() => setLoadingMore(false));
    }, [loadingMore, hasMore, nextOffset, mode, showToast]);

    // Infinite scroll. IntersectionObserver rather than a scroll listener:
    // it does no work while the sentinel is off-screen, which matters on the
    // low-end devices much of this audience is using.
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore) return;
        const observer = new IntersectionObserver(
            entries => { if (entries[0]?.isIntersecting) loadMore(); },
            { rootMargin: '400px' }, // start fetching before the user arrives
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    // ── Mutations ─────────────────────────────────────────────────────────

    const handlePostCreated = (post: Post) => setPosts(prev => [post, ...prev]);

    const patchPost = (id: string, patch: Partial<Post>) =>
        setPosts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));

    const handleReactionChange = (postId: string, summary: ReactionSummary) =>
        patchPost(postId, {
            reactions: summary,
            liked: !!summary.mine,
            likes_count: summary.total,
        });

    const handleRepost = async (post: Post) => {
        const target = post.repost_of?.id ?? post.id;
        const was = post.reposted;
        // Optimistic.
        patchPost(post.id, {
            reposted: !was,
            reposts_count: Math.max(0, post.reposts_count + (was ? -1 : 1)),
        });
        try {
            const res = was ? await undoRepost(target) : await doRepost(target);
            patchPost(post.id, { reposted: res.reposted, reposts_count: res.reposts_count });
            showToast(res.reposted ? 'Reposted to your profile' : 'Repost removed', 'success');
        } catch (err) {
            patchPost(post.id, { reposted: was, reposts_count: post.reposts_count });
            showToast(getErrorMessage(err, 'Could not repost.'), 'error');
        }
    };

    const toggleComments = (id: string) =>
        setOpenComments(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const handleCommentAdded = (postId: string) =>
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)));

    const handleCommentDeleted = (postId: string) =>
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p)));

    const canModerate = user?.role === 'staff';

    const handleDeletePost = async (id: string) => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        const index = posts.findIndex(p => p.id === id);
        const removed = posts[index];
        setPosts(prev => prev.filter(p => p.id !== id));
        try {
            await deletePost(id);
        } catch {
            // Restore at the same index rather than re-sorting the whole feed,
            // which would jump the reader's scroll position.
            if (removed) {
                setPosts(prev => {
                    const next = [...prev];
                    next.splice(Math.min(index, next.length), 0, removed);
                    return next;
                });
            }
            showToast('Could not delete post.', 'error');
        }
    };

    const handleHidden = (postId: string) => setPosts(prev => prev.filter(p => p.id !== postId));

    const authorName = (p: Post) => {
        if (user && p.author_id === user.id) return 'You';
        return p.author?.name || p.author_name || ROLE_LABELS[p.author_type] || 'Community member';
    };

    const roleTag = (p: Post) => {
        if (user && p.author_id === user.id) return ROLE_LABELS[user.role || ''] || 'You';
        return ROLE_LABELS[p.author_type] || 'Nile Connect';
    };

    // ── Render ────────────────────────────────────────────────────────────

    const renderMedia = (post: Post) => {
        if (post.media.length > 0) {
            return (
                <div className={`mx-4 mb-1 grid gap-1 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {post.media.slice(0, 4).map((m, i) => (
                        <div
                            key={m.id || i}
                            className="social-media relative overflow-hidden rounded-xl bg-paper-100"
                            // Reserving the aspect box before load is what stops
                            // the feed shifting under the reader's thumb.
                            style={m.width && m.height ? { aspectRatio: `${m.width} / ${m.height}` } : undefined}
                        >
                            {m.kind === 'video' ? (
                                <video
                                    src={m.url}
                                    poster={m.thumbnail_url}
                                    controls
                                    preload="metadata"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={m.thumbnail_url || m.url}
                                    alt={m.alt_text || 'Post attachment'}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {post.media.length > 4 && i === 3 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-semibold">
                                    +{post.media.length - 4}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        if (post.media_url) {
            return (
                <div className="social-media mx-4 mb-1">
                    <img src={post.media_url} alt="Post attachment" loading="lazy" decoding="async" />
                </div>
            );
        }
        return null;
    };

    /** The embedded original inside a quote post. */
    const renderQuoted = (quoted: Post) => (
        <div className="mx-4 mb-2 border border-paper-300 rounded-xl overflow-hidden bg-paper-100/50">
            <div className="p-3 pb-1.5 flex items-center gap-2">
                <Avatar name={quoted.author?.name || quoted.author_name || 'Member'} size="sm" />
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-800 truncate">
                        {quoted.author?.name || quoted.author_name || 'Community member'}
                    </p>
                    <p className="text-[10px] text-paper-600">{timeAgo(quoted.created_at)}</p>
                </div>
            </div>
            <div className="px-3 pb-3">
                <PostBody content={quoted.content} className="text-xs text-ink-700" />
            </div>
        </div>
    );

    const renderPostCard = (post: Post) => {
        // A bare repost renders the ORIGINAL, with a "reposted by" header.
        const isBareRepost = !!post.repost_of;
        const display = post.repost_of ?? post;
        const badge = KIND_BADGE[display.kind];
        const audienceBadge = AUDIENCE_BADGE[post.audience];
        const isOwn = user?.id === post.author_id;

        return (
            <article key={post.id} className="social-card overflow-hidden">
                {isBareRepost && (
                    <div className="px-4 pt-3 flex items-center gap-1.5 text-[11px] text-paper-600">
                        <Repeat2 size={12} />
                        <span>{authorName(post)} reposted</span>
                    </div>
                )}

                <div className="p-4 pb-2 flex justify-between items-start gap-2">
                    <div className="flex gap-3 min-w-0">
                        <Avatar
                            name={display.author?.name || display.author_name || 'Member'}
                            size="sm"
                            isSelf={user?.id === display.author_id}
                        />
                        <div className="text-left min-w-0">
                            <h4 className="font-semibold text-ink-800 text-sm leading-tight truncate">
                                {authorName(display)}
                            </h4>
                            <p className="text-xs text-paper-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>{roleTag(display)}</span>
                                <span aria-hidden>·</span>
                                <span>{timeAgo(display.created_at)}</span>
                                {display.edited_at && (
                                    <><span aria-hidden>·</span><span>edited</span></>
                                )}
                                {audienceBadge && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span className="inline-flex items-center gap-0.5" title={audienceBadge.label}>
                                            <audienceBadge.Icon size={10} />
                                            <span className="sr-only">{audienceBadge.label}</span>
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        {badge && (
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${badge.className}`}>
                                <badge.Icon size={11} />{badge.label}
                            </span>
                        )}
                        <PostActionsMenu
                            postId={post.id}
                            authorId={display.author_id}
                            authorName={display.author?.name || display.author_name || 'this person'}
                            isOwnPost={isOwn}
                            canDelete={post.can_delete || canModerate}
                            bookmarked={post.bookmarked}
                            onHidden={handleHidden}
                            onBookmarkChange={(id, b) => patchPost(id, { bookmarked: b })}
                            onDelete={handleDeletePost}
                        />
                    </div>
                </div>

                {/* A quote post shows its own commentary, then the original. */}
                {post.content && (
                    <div className="px-4 py-2">
                        <PostBody content={post.content} />
                    </div>
                )}
                {post.quote_of && renderQuoted(post.quote_of)}

                {isBareRepost && display.content && (
                    <div className="px-4 py-2">
                        <PostBody content={display.content} />
                    </div>
                )}

                {renderMedia(display)}

                {display.poll_id && (
                    <div className="px-4 pb-2">
                        <PollCard pollId={display.poll_id} />
                    </div>
                )}

                {display.kind === 'job' && display.job_id && <JobShareCard jobId={display.job_id} />}

                {(post.reactions.total > 0 || post.comments_count > 0 || post.reposts_count > 0) && (
                    <div className="px-4 py-2 flex justify-between items-center text-xs text-paper-600">
                        <ReactionCount summary={post.reactions} />
                        <div className="flex items-center gap-3">
                            {post.reposts_count > 0 && (
                                <span>{post.reposts_count} {post.reposts_count === 1 ? 'repost' : 'reposts'}</span>
                            )}
                            {post.comments_count > 0 && (
                                <button
                                    onClick={() => toggleComments(post.id)}
                                    className="hover:text-ink-700 transition-colors"
                                >
                                    {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="px-2 py-1 flex items-center justify-between gap-1 border-t border-paper-300">
                    <ReactionBar
                        subjectType="post"
                        subjectId={post.id}
                        summary={post.reactions}
                        onChange={s => handleReactionChange(post.id, s)}
                        onError={msg => showToast(msg, 'error')}
                    />
                    <button
                        onClick={() => toggleComments(post.id)}
                        aria-expanded={openComments.has(post.id)}
                        className={`action-btn ${openComments.has(post.id) ? 'active' : ''}`}
                    >
                        <MessageCircle size={16} />
                        <span className="hidden sm:inline">Comment</span>
                    </button>
                    <button
                        onClick={() => handleRepost(post)}
                        aria-pressed={post.reposted}
                        aria-label={post.reposted ? 'Undo repost' : 'Repost'}
                        className={`action-btn ${post.reposted ? 'active text-nile-green' : ''}`}
                    >
                        <Repeat2 size={16} />
                        <span className="hidden sm:inline">Repost</span>
                    </button>
                    <button onClick={() => setSharePost(post)} className="action-btn">
                        <Send size={16} />
                        <span className="hidden sm:inline">Send</span>
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
            </article>
        );
    };

    return (
        <div className="space-y-4 w-full max-w-2xl mx-auto pb-10">
            <StoryTrayRail />
            <PostBar onPostCreated={handlePostCreated} />

            {/* The chronological escape hatch. Offering a real "Latest" mode is
                a transparency requirement, not a nicety — a student who does not
                trust the ranked feed must be able to opt out of it entirely. */}
            <div className="flex items-center gap-1 px-1" role="tablist" aria-label="Feed order">
                {([
                    { value: 'ranked' as const, label: 'For you', Icon: Sparkles },
                    { value: 'latest' as const, label: 'Latest', Icon: Clock },
                ]).map(({ value, label, Icon }) => (
                    <button
                        key={value}
                        role="tab"
                        aria-selected={mode === value}
                        onClick={() => setMode(value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                            ${mode === value ? 'bg-nile-blue text-white' : 'text-paper-700 hover:bg-paper-200'}`}
                    >
                        <Icon size={12} />
                        {label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                // Skeletons rather than a spinner: the layout is known, so the
                // page should not jump when content arrives.
                <div className="space-y-4" aria-busy="true" aria-label="Loading feed">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="social-card p-4 space-y-3 animate-pulse">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-xl bg-paper-200" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-3 bg-paper-200 rounded w-1/3" />
                                    <div className="h-2 bg-paper-200 rounded w-1/4" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-paper-200 rounded w-full" />
                                <div className="h-3 bg-paper-200 rounded w-4/5" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="social-card py-12 text-center space-y-3">
                    <AlertCircle size={26} className="text-red-300 mx-auto" />
                    <p className="text-sm text-paper-700">{error}</p>
                    <button
                        onClick={() => setReloadToken(t => t + 1)}
                        className="text-xs font-medium text-nile-blue hover:underline"
                    >
                        Try again
                    </button>
                </div>
            ) : posts.length === 0 ? (
                <div className="social-card py-14 text-center">
                    <MessageCircle size={28} className="text-paper-400 mx-auto mb-3" />
                    <p className="text-sm text-paper-700">Your feed is quiet right now.</p>
                    <p className="text-xs text-paper-600 mt-1">
                        Follow a few classmates or share something to get started.
                    </p>
                </div>
            ) : (
                posts.map(renderPostCard)
            )}

            {/* Infinite-scroll sentinel */}
            {hasMore && !isLoading && !error && (
                <div ref={sentinelRef} className="py-6 flex items-center justify-center">
                    {loadingMore ? (
                        <Loader2 size={18} className="animate-spin text-paper-500" />
                    ) : (
                        <button
                            onClick={loadMore}
                            className="text-xs font-medium text-paper-600 hover:text-paper-700 transition-colors"
                        >
                            Load more
                        </button>
                    )}
                </div>
            )}

            {!hasMore && posts.length > 0 && !isLoading && (
                <p className="py-6 text-center text-xs text-paper-500">You're all caught up.</p>
            )}

            {sharePost && (
                <SharePostModal isOpen={!!sharePost} onClose={() => setSharePost(null)} post={sharePost} />
            )}
        </div>
    );
};

export default Feed;
