import { apiClient } from './api';

interface Envelope<T> { data: T; }

// ── Shared shapes ─────────────────────────────────────────────────────────────

/** The compact person shape every social list endpoint returns. */
export interface PersonSummary {
    id: string;
    name: string;
    username: string;
    role: string;
    major?: string;
    avatar_url?: string;
    is_verified: boolean;
}

export interface Paged<T> {
    items: T[];
    total: number;
    has_more: boolean;
}

// ── Reactions ─────────────────────────────────────────────────────────────────

/**
 * Reaction kinds. Mirrors lib/reactions on the server.
 *
 * There is deliberately no negative reaction: a public downvote on a named
 * classmate is a bullying vector. Negative feedback goes through
 * `sendFeedSignal('not_interested')`, which is private.
 */
export type ReactionKind = 'like' | 'love' | 'celebrate' | 'insightful' | 'support' | 'funny';

export interface ReactionMeta {
    kind: ReactionKind;
    label: string;
    emoji: string;
}

export interface ReactionSummary {
    counts: Partial<Record<ReactionKind, number>>;
    total: number;
    /** The caller's own reaction, absent when they have not reacted. */
    mine?: ReactionKind;
    top: ReactionKind[];
}

export const emptyReactionSummary = (): ReactionSummary => ({ counts: {}, total: 0, top: [] });

/**
 * The catalog is served by the API so all clients show identical labels and
 * emoji. This local copy is the fallback used before the fetch resolves (and
 * if it fails), so the reaction bar never renders empty.
 */
export const REACTION_FALLBACK: ReactionMeta[] = [
    { kind: 'like', label: 'Like', emoji: '👍' },
    { kind: 'love', label: 'Love', emoji: '❤️' },
    { kind: 'celebrate', label: 'Celebrate', emoji: '🎉' },
    { kind: 'insightful', label: 'Insightful', emoji: '💡' },
    { kind: 'support', label: 'Support', emoji: '🤝' },
    { kind: 'funny', label: 'Funny', emoji: '😄' },
];

export const getReactionCatalog = async (): Promise<ReactionMeta[]> => {
    const { data } = await apiClient.get<Envelope<{ reactions: ReactionMeta[] }>>(
        '/api/social/reaction-catalog',
    );
    return data.data.reactions ?? REACTION_FALLBACK;
};

export type ReactionSubject = 'post' | 'comment' | 'story';

export interface ReactResult {
    summary: ReactionSummary;
    added: boolean;
    changed: boolean;
    removed: boolean;
}

export const react = async (
    subjectType: ReactionSubject,
    subjectId: string,
    reaction: ReactionKind,
): Promise<ReactResult> => {
    const { data } = await apiClient.post<Envelope<ReactResult>>('/api/social/react', {
        subject_type: subjectType,
        subject_id: subjectId,
        reaction,
    });
    return data.data;
};

export const listReactors = async (
    subjectType: ReactionSubject,
    subjectId: string,
    reaction?: ReactionKind,
): Promise<{ users: PersonSummary[]; summary: ReactionSummary }> => {
    const params = new URLSearchParams({ subject_type: subjectType, id: subjectId });
    if (reaction) params.set('reaction', reaction);
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[]; summary: ReactionSummary }>>(
        `/api/social/reactions?${params}`,
    );
    return { users: data.data.users ?? [], summary: data.data.summary ?? emptyReactionSummary() };
};

// ── Social graph ──────────────────────────────────────────────────────────────

export interface Relation {
    following: boolean;
    followed_by: boolean;
    connected: boolean;
    pending: boolean;
    close_friend: boolean;
    muted: boolean;
    blocked_by_me: boolean;
    blocks_me: boolean;
    can_interact: boolean;
    can_message?: boolean;
    can_mention?: boolean;
    can_view_profile?: boolean;
    counts?: { followers: number; following: number; connections: number };
    mutual_connections?: PersonSummary[];
}

export const getRelation = async (userId: string): Promise<Relation> => {
    const { data } = await apiClient.get<Envelope<Relation>>(
        `/api/social/relation?id=${encodeURIComponent(userId)}`,
    );
    return data.data;
};

export const followUser = async (userId: string): Promise<void> => {
    await apiClient.post(`/api/social/follow?id=${encodeURIComponent(userId)}`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/social/follow?id=${encodeURIComponent(userId)}`);
};

export const blockUser = async (userId: string, reason?: string): Promise<void> => {
    await apiClient.post(`/api/social/block?id=${encodeURIComponent(userId)}`, { reason });
};

export const unblockUser = async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/social/block?id=${encodeURIComponent(userId)}`);
};

export const listBlockedUsers = async (): Promise<PersonSummary[]> => {
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[] }>>(
        '/api/social/block?id=list',
    );
    return data.data.users ?? [];
};

export type MuteScope = 'all' | 'posts' | 'stories';

export const muteUser = async (userId: string, scope: MuteScope = 'all', duration?: string): Promise<void> => {
    await apiClient.post(`/api/social/mute?id=${encodeURIComponent(userId)}`, { scope, duration });
};

export const unmuteUser = async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/social/mute?id=${encodeURIComponent(userId)}`);
};

export const listCloseFriends = async (): Promise<PersonSummary[]> => {
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[] }>>('/api/social/close-friends');
    return data.data.users ?? [];
};

export const addCloseFriend = async (userId: string): Promise<void> => {
    await apiClient.post(`/api/social/close-friends?id=${encodeURIComponent(userId)}`);
};

export const removeCloseFriend = async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/social/close-friends?id=${encodeURIComponent(userId)}`);
};

export const listFollowers = async (userId?: string, offset = 0): Promise<Paged<PersonSummary>> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (userId) params.set('id', userId);
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[]; total: number; has_more: boolean }>>(
        `/api/social/followers?${params}`,
    );
    return { items: data.data.users ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

export const listFollowing = async (userId?: string, offset = 0): Promise<Paged<PersonSummary>> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (userId) params.set('id', userId);
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[]; total: number; has_more: boolean }>>(
        `/api/social/following?${params}`,
    );
    return { items: data.data.users ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

// ── Privacy ───────────────────────────────────────────────────────────────────

export type Audience = 'everyone' | 'connections' | 'close_friends' | 'only_me' | 'group' | 'custom';
export type Gate = 'everyone' | 'connections' | 'no_one';

export interface PrivacySettings {
    user_id: string;
    profile_visibility: Audience;
    default_post_audience: Audience;
    default_story_audience: Audience;
    who_can_mention: Gate;
    who_can_message: Gate;
    who_can_add_to_groups: Gate;
    who_can_comment: Gate;
    show_online_status: boolean;
    show_activity_status: boolean;
    discoverable_in_search: boolean;
    allow_story_resharing: boolean;
}

/** Human labels for audiences, defined once so every surface agrees. */
export const AUDIENCE_LABELS: Record<Audience, string> = {
    everyone: 'Everyone',
    connections: 'Connections only',
    close_friends: 'Close friends',
    only_me: 'Only me',
    group: 'Group members',
    custom: 'Selected people',
};

export const GATE_LABELS: Record<Gate, string> = {
    everyone: 'Everyone',
    connections: 'Connections only',
    no_one: 'No one',
};

export const getPrivacySettings = async (): Promise<{ settings: PrivacySettings; audiences: Audience[] }> => {
    const { data } = await apiClient.get<Envelope<{ settings: PrivacySettings; audiences: Audience[] }>>(
        '/api/social/privacy',
    );
    return { settings: data.data.settings, audiences: data.data.audiences ?? ['everyone', 'connections', 'only_me'] };
};

export const updatePrivacySettings = async (
    patch: Partial<PrivacySettings>,
): Promise<PrivacySettings> => {
    const { data } = await apiClient.put<Envelope<{ settings: PrivacySettings }>>(
        '/api/social/privacy',
        patch,
    );
    return data.data.settings;
};

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export type BookmarkSubject = 'post' | 'job' | 'event' | 'document';

export interface Bookmark {
    id: string;
    subject_type: BookmarkSubject;
    subject_id: string;
    collection_id?: string | null;
    note?: string;
    created_at: string;
}

export interface Collection {
    id: string;
    name: string;
    items_count: number;
    created_at: string;
}

export const saveBookmark = async (
    subjectType: BookmarkSubject,
    subjectId: string,
    collectionId?: string | null,
    note?: string,
): Promise<void> => {
    await apiClient.post('/api/social/bookmark', {
        subject_type: subjectType,
        subject_id: subjectId,
        collection_id: collectionId ?? null,
        note,
    });
};

export const removeBookmark = async (subjectType: BookmarkSubject, subjectId: string): Promise<void> => {
    await apiClient.delete(
        `/api/social/bookmark?subject_type=${subjectType}&id=${encodeURIComponent(subjectId)}`,
    );
};

export const listBookmarks = async (
    subjectType?: BookmarkSubject,
    collectionId?: string,
    offset = 0,
): Promise<Paged<Bookmark>> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (subjectType) params.set('subject_type', subjectType);
    if (collectionId) params.set('collection_id', collectionId);
    const { data } = await apiClient.get<Envelope<{ bookmarks: Bookmark[]; total: number; has_more: boolean }>>(
        `/api/social/bookmarks?${params}`,
    );
    return { items: data.data.bookmarks ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

export const listCollections = async (): Promise<Collection[]> => {
    const { data } = await apiClient.get<Envelope<{ collections: Collection[] }>>('/api/social/collections');
    return data.data.collections ?? [];
};

export const createCollection = async (name: string): Promise<Collection> => {
    const { data } = await apiClient.post<Envelope<{ collection: Collection }>>(
        '/api/social/collections',
        { name },
    );
    return data.data.collection;
};

export const deleteCollection = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/social/collections?id=${encodeURIComponent(id)}`);
};

// ── Feed control ──────────────────────────────────────────────────────────────

export type FeedSignal = 'not_interested' | 'hide_post' | 'mute_hashtag';

/**
 * Records private negative feedback. The server treats these as absolute:
 * a hidden post is removed from the feed, not merely down-ranked.
 */
export const sendFeedSignal = async (
    signal: FeedSignal,
    subjectType: 'post' | 'hashtag' | 'author',
    subjectId: string,
): Promise<void> => {
    await apiClient.post('/api/social/feed-signal', {
        signal,
        subject_type: subjectType,
        subject_id: subjectId,
    });
};

export const undoFeedSignal = async (
    signal: FeedSignal,
    subjectType: 'post' | 'hashtag' | 'author',
    subjectId: string,
): Promise<void> => {
    await apiClient.delete(
        `/api/social/feed-signal?signal=${signal}&subject_type=${subjectType}&id=${encodeURIComponent(subjectId)}`,
    );
};

// ── Moderation ────────────────────────────────────────────────────────────────

export type ReportSubject = 'post' | 'comment' | 'story' | 'user' | 'group' | 'message';

export interface ReportReason {
    reason: string;
    label: string;
    help: string;
}

export const getReportReasons = async (): Promise<ReportReason[]> => {
    const { data } = await apiClient.get<Envelope<{ reasons: ReportReason[] }>>('/api/social/report-reasons');
    return data.data.reasons ?? [];
};

export const submitReport = async (
    subjectType: ReportSubject,
    subjectId: string,
    reason: string,
    details?: string,
): Promise<{ report_id: string; message: string }> => {
    const { data } = await apiClient.post<Envelope<{ report_id: string; message: string }>>(
        '/api/social/report',
        { subject_type: subjectType, subject_id: subjectId, reason, details },
    );
    return data.data;
};

export interface ModReport {
    id: string;
    reporter_id: string;
    subject_type: ReportSubject;
    subject_id: string;
    subject_owner_id: string;
    reason: string;
    details: string;
    status: 'open' | 'triaged' | 'resolved' | 'dismissed';
    priority: number;
    resolution: string;
    snapshot_content: string;
    created_at: string;
    resolved_at?: string | null;
}

export interface ModQueueItem {
    report: ModReport;
    reporter: PersonSummary;
    subject_owner: PersonSummary;
    is_urgent: boolean;
}

export const getModQueue = async (
    status = 'open',
    offset = 0,
): Promise<Paged<ModQueueItem>> => {
    const { data } = await apiClient.get<Envelope<{ reports: ModQueueItem[]; total: number; has_more: boolean }>>(
        `/api/social/mod/queue?status=${status}&offset=${offset}`,
    );
    return { items: data.data.reports ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

export const resolveReport = async (
    reportId: string,
    status: 'triaged' | 'resolved' | 'dismissed',
    resolution: string,
): Promise<void> => {
    await apiClient.post('/api/social/mod/resolve', { report_id: reportId, status, resolution });
};

export const moderateContent = async (
    subjectType: ReportSubject,
    subjectId: string,
    status: 'active' | 'hidden' | 'removed',
    reason: string,
    reportId?: string,
): Promise<void> => {
    await apiClient.post('/api/social/mod/content', {
        subject_type: subjectType,
        subject_id: subjectId,
        status,
        reason,
        report_id: reportId,
    });
};

export type RestrictionType = 'banned' | 'post_restricted' | 'comment_restricted' | 'message_restricted';

export const restrictUser = async (
    userId: string,
    type: RestrictionType,
    reason: string,
    duration?: string,
    reportId?: string,
): Promise<void> => {
    await apiClient.post('/api/social/mod/restrict', {
        user_id: userId, type, reason, duration, report_id: reportId,
    });
};

export const liftRestriction = async (
    userId: string,
    type: RestrictionType,
    reason: string,
): Promise<void> => {
    await apiClient.post('/api/social/mod/restrict', { user_id: userId, type, reason, lift: true });
};

export interface ModAction {
    id: string;
    actor_id: string;
    action_type: string;
    subject_type: string;
    subject_id: string;
    subject_owner_id: string;
    report_id: string;
    reason: string;
    metadata: string;
    created_at: string;
}

export const getModHistory = async (params: {
    userId?: string;
    moderatorId?: string;
    subjectType?: string;
    subjectId?: string;
}): Promise<{ actions: ModAction[]; people: Record<string, PersonSummary> }> => {
    const qs = new URLSearchParams();
    if (params.userId) qs.set('user_id', params.userId);
    if (params.moderatorId) qs.set('moderator_id', params.moderatorId);
    if (params.subjectId) qs.set('id', params.subjectId);
    if (params.subjectType) qs.set('subject_type', params.subjectType);
    const { data } = await apiClient.get<Envelope<{ actions: ModAction[]; people: Record<string, PersonSummary> }>>(
        `/api/social/mod/history?${qs}`,
    );
    return { actions: data.data.actions ?? [], people: data.data.people ?? {} };
};

export interface ModStats {
    open: number;
    triaged: number;
    urgent: number;
    resolved_today: number;
    active_restrictions: number;
}

export const getModStats = async (): Promise<ModStats> => {
    const { data } = await apiClient.get<Envelope<{ stats: ModStats }>>('/api/social/mod/stats');
    return data.data.stats;
};

// ── Discovery ─────────────────────────────────────────────────────────────────

/**
 * Powers @-autocomplete. The server already filters out anyone the caller is
 * not permitted to mention, so every returned person is a valid choice.
 */
export const searchMentionable = async (query: string): Promise<PersonSummary[]> => {
    if (!query.trim()) return [];
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[] }>>(
        `/api/social/mention-search?q=${encodeURIComponent(query)}`,
    );
    return data.data.users ?? [];
};

export const getHashtag = async (
    tag: string,
    offset = 0,
): Promise<{ tag: string; posts_count: number; post_ids: string[] }> => {
    const { data } = await apiClient.get<Envelope<{ tag: string; posts_count: number; post_ids: string[] }>>(
        `/api/social/hashtag?tag=${encodeURIComponent(tag)}&offset=${offset}`,
    );
    return { tag: data.data.tag, posts_count: data.data.posts_count ?? 0, post_ids: data.data.post_ids ?? [] };
};

export interface Trend {
    tag: string;
    count: number;
}

export const getTrending = async (): Promise<Trend[]> => {
    const { data } = await apiClient.get<Envelope<{ trending: Trend[] }>>('/api/social/trending');
    return data.data.trending ?? [];
};
