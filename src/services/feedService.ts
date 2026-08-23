import { apiClient } from './api';
import { emptyReactionSummary, type Audience, type ReactionSummary } from './socialService';

/**
 * Post kinds. Mirrors allowedPostKinds in api/feed.
 * The original four are kept at the front for backwards compatibility.
 */
export type PostKind =
    | 'text' | 'job' | 'achievement' | 'announcement'
    | 'image' | 'video' | 'link' | 'poll'
    | 'question' | 'event' | 'resource' | 'study'
    | 'repost' | 'quote';

export interface PostMedia {
    id: string;
    url: string;
    thumbnail_url?: string;
    kind: 'image' | 'video' | 'file';
    width?: number;
    height?: number;
    duration_ms?: number;
    alt_text?: string;
}

export interface PostAuthor {
    id: string;
    name: string;
    username: string;
    type: string;
    major?: string;
    is_verified: boolean;
}

export interface Post {
    id: string;
    author_id: string;
    author_type: string;
    author_name?: string;
    author?: PostAuthor;

    content: string;
    media_url?: string;
    media: PostMedia[];

    /** Parsed tokens, so the client highlights without re-implementing the parser. */
    mentions: string[];
    hashtags: string[];

    likes_count: number;
    comments_count: number;
    reposts_count: number;

    liked: boolean;
    reactions: ReactionSummary;
    bookmarked: boolean;
    reposted: boolean;

    job_id?: string;
    kind: PostKind;
    audience: Audience;
    group_id?: string;

    /** Set on a bare repost — render the original inline. */
    repost_of?: Post;
    /** Set on a quote post — render the original as an embedded card. */
    quote_of?: Post;

    link_url?: string;
    link_title?: string;
    /** An attached interactive poll, rendered by PollCard. */
    poll_id?: string;

    can_delete: boolean;
    edited_at?: string | null;
    created_at: string;
}

export interface PostComment {
    id: string;
    post_id: string;
    parent_id?: string | null;
    author_id: string;
    author_type: string;
    author_name: string;
    content: string;
    mentions: string[];
    replies_count: number;
    reactions: ReactionSummary;
    can_delete: boolean;
    created_at: string;
}

export interface CreatePostOptions {
    mediaUrl?: string;
    jobId?: string;
    kind?: PostKind;
    audience?: Audience;
    groupId?: string;
    quoteOfId?: string;
    linkUrl?: string;
    media?: Array<{
        url: string;
        thumbnail_url?: string;
        kind: 'image' | 'video' | 'file';
        width?: number;
        height?: number;
        duration_ms?: number;
        alt_text?: string;
    }>;
}

export type FeedMode = 'ranked' | 'latest';

export interface FeedPage {
    posts: Post[];
    has_more: boolean;
    next_offset: number;
    mode: FeedMode;
}

interface Envelope<T> { data: T; }

/**
 * Normalises a post from the wire.
 *
 * The server always sends the new fields, but a cached response from an older
 * deployment (or a 304 served during a rollout) can be missing them. Filling
 * them here means no component needs a null guard on `reactions.counts` or
 * `media.map`, which is exactly the nil-slice crash class this codebase has
 * hit before.
 */
const normalizePost = (raw: Post): Post => ({
    ...raw,
    media: raw.media ?? [],
    mentions: raw.mentions ?? [],
    hashtags: raw.hashtags ?? [],
    reactions: raw.reactions
        ? { ...emptyReactionSummary(), ...raw.reactions, counts: raw.reactions.counts ?? {}, top: raw.reactions.top ?? [] }
        : emptyReactionSummary(),
    likes_count: raw.likes_count ?? 0,
    comments_count: raw.comments_count ?? 0,
    reposts_count: raw.reposts_count ?? 0,
    audience: raw.audience ?? 'everyone',
    repost_of: raw.repost_of ? normalizePost(raw.repost_of) : undefined,
    quote_of: raw.quote_of ? normalizePost(raw.quote_of) : undefined,
});

const normalizeComment = (raw: PostComment): PostComment => ({
    ...raw,
    mentions: raw.mentions ?? [],
    replies_count: raw.replies_count ?? 0,
    reactions: raw.reactions
        ? { ...emptyReactionSummary(), ...raw.reactions, counts: raw.reactions.counts ?? {}, top: raw.reactions.top ?? [] }
        : emptyReactionSummary(),
});

export const getFeed = async (
    opts: { offset?: number; limit?: number; mode?: FeedMode; authorId?: string } = {},
): Promise<FeedPage> => {
    const params = new URLSearchParams();
    if (opts.offset) params.set('offset', String(opts.offset));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.mode) params.set('mode', opts.mode);
    if (opts.authorId) params.set('author_id', opts.authorId);
    const qs = params.toString();

    const { data } = await apiClient.get<Envelope<FeedPage>>(`/api/feed${qs ? `?${qs}` : ''}`);
    return {
        posts: (data.data.posts ?? []).map(normalizePost),
        has_more: !!data.data.has_more,
        next_offset: data.data.next_offset ?? 0,
        mode: data.data.mode ?? 'ranked',
    };
};

/** @deprecated Prefer getFeed, which paginates. Kept for existing callers. */
export const getPosts = async (): Promise<Post[]> => (await getFeed()).posts;

export const createPost = async (content: string, opts: CreatePostOptions = {}): Promise<Post> => {
    const { data } = await apiClient.post<Envelope<Post>>('/api/feed', {
        content,
        media_url: opts.mediaUrl,
        job_id: opts.jobId,
        kind: opts.kind,
        audience: opts.audience,
        group_id: opts.groupId,
        quote_of_id: opts.quoteOfId,
        link_url: opts.linkUrl,
        media: opts.media,
    });
    return normalizePost(data.data);
};

export const toggleLike = async (
    postId: string,
): Promise<{ liked: boolean; likes_count: number; reactions: ReactionSummary }> => {
    const { data } = await apiClient.post<Envelope<{ liked: boolean; likes_count: number; reactions: ReactionSummary }>>(
        `/api/feed/${postId}/like`,
    );
    return {
        liked: data.data.liked,
        likes_count: data.data.likes_count ?? 0,
        reactions: data.data.reactions ?? emptyReactionSummary(),
    };
};

export const repost = async (postId: string): Promise<{ reposted: boolean; reposts_count: number }> => {
    const { data } = await apiClient.post<Envelope<{ reposted: boolean; reposts_count: number }>>(
        `/api/feed/${postId}/repost`,
    );
    return data.data;
};

export const undoRepost = async (postId: string): Promise<{ reposted: boolean; reposts_count: number }> => {
    const { data } = await apiClient.delete<Envelope<{ reposted: boolean; reposts_count: number }>>(
        `/api/feed/${postId}/repost`,
    );
    return data.data;
};

export const getComments = async (postId: string): Promise<PostComment[]> => {
    const { data } = await apiClient.get<Envelope<{ comments: PostComment[] }>>(`/api/feed/${postId}/comments`);
    return (data.data.comments ?? []).map(normalizeComment);
};

export const addComment = async (
    postId: string,
    content: string,
    parentId?: string,
): Promise<PostComment> => {
    const { data } = await apiClient.post<Envelope<PostComment>>(`/api/feed/${postId}/comments`, {
        content,
        parent_id: parentId,
    });
    return normalizeComment(data.data);
};

export const deletePost = async (postId: string): Promise<void> => {
    await apiClient.delete(`/api/feed/${postId}`);
};

export const deleteComment = async (postId: string, commentId: string): Promise<void> => {
    await apiClient.delete(`/api/feed/${postId}/comments/${commentId}`);
};
