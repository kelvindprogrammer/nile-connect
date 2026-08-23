import { apiClient } from './api';
import type { PersonSummary, ReactionSummary } from './socialService';

interface Envelope<T> { data: T; }

// ── Vocabulary (mirrors lib/groups) ───────────────────────────────────────────

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';
export type MemberStatus = 'active' | 'pending' | 'banned' | 'left';
export type GroupVisibility = 'public' | 'restricted' | 'private';
export type JoinPolicy = 'open' | 'request' | 'invite_only';
export type GroupKind = 'discussion' | 'announcement' | 'qa' | 'resource';

export const VISIBILITY_LABELS: Record<GroupVisibility, { label: string; help: string }> = {
    public: { label: 'Public', help: 'Anyone can find this group and read its posts.' },
    restricted: { label: 'Restricted', help: 'Anyone can find it, but only members read the posts.' },
    private: { label: 'Private', help: 'Hidden from search. People join by invite only.' },
};

export const JOIN_LABELS: Record<JoinPolicy, { label: string; help: string }> = {
    open: { label: 'Anyone can join', help: 'People join instantly.' },
    request: { label: 'Approval required', help: 'An admin approves each request.' },
    invite_only: { label: 'Invite only', help: 'People join with an invite link.' },
};

export const KIND_LABELS: Record<GroupKind, { label: string; help: string }> = {
    discussion: { label: 'Discussion', help: 'Every member can post.' },
    announcement: { label: 'Announcements', help: 'Only admins post. Everyone reads.' },
    qa: { label: 'Questions & answers', help: 'Members ask and answer.' },
    resource: { label: 'Resources', help: 'A shared library of files and links.' },
};

export interface Group {
    id: string;
    community_id?: string | null;
    name: string;
    slug: string;
    description: string;
    avatar_url?: string;
    cover_url?: string;
    kind: GroupKind;
    visibility: GroupVisibility;
    join_policy: JoinPolicy;
    created_by: string;
    members_count: number;
    posts_count: number;
    pinned_post_id?: string | null;
    status: string;
    created_at: string;

    // The caller's own standing, so the UI never has to infer what to render.
    my_role?: GroupRole;
    my_status?: MemberStatus;
    is_member: boolean;
    can_post: boolean;
    can_moderate: boolean;
    can_administer: boolean;
    notification_level?: 'all' | 'mentions' | 'none';
}

export interface Community {
    id: string;
    name: string;
    slug: string;
    description: string;
    avatar_url?: string;
    cover_url?: string;
    category: string;
    visibility: GroupVisibility;
    members_count: number;
    groups_count: number;
    is_verified: boolean;
    status: string;
    created_at: string;
}

export interface Paged<T> { items: T[]; total: number; has_more: boolean; }

// ── Groups ────────────────────────────────────────────────────────────────────

export const discoverGroups = async (query = '', offset = 0): Promise<Paged<Group>> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (query) params.set('q', query);
    const { data } = await apiClient.get<Envelope<{ groups: Group[]; total: number; has_more: boolean }>>(
        `/api/social/groups?${params}`,
    );
    return { items: data.data.groups ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

export const getMyGroups = async (): Promise<Group[]> => {
    const { data } = await apiClient.get<Envelope<{ groups: Group[] }>>('/api/social/groups?scope=mine');
    return data.data.groups ?? [];
};

export const getGroup = async (id: string): Promise<{ group: Group; can_read: boolean }> => {
    const { data } = await apiClient.get<Envelope<{ group: Group; can_read: boolean }>>(
        `/api/social/groups?id=${encodeURIComponent(id)}`,
    );
    return { group: data.data.group, can_read: !!data.data.can_read };
};

export interface CreateGroupInput {
    name: string;
    description?: string;
    community_id?: string | null;
    kind?: GroupKind;
    visibility?: GroupVisibility;
    join_policy?: JoinPolicy;
    avatar_url?: string;
    cover_url?: string;
}

export const createGroup = async (input: CreateGroupInput): Promise<Group> => {
    const { data } = await apiClient.post<Envelope<{ group: Group }>>('/api/social/groups', input);
    return data.data.group;
};

export const updateGroup = async (id: string, patch: Partial<CreateGroupInput>): Promise<Group> => {
    const { data } = await apiClient.put<Envelope<{ group: Group }>>(
        `/api/social/groups?id=${encodeURIComponent(id)}`, patch,
    );
    return data.data.group;
};

export const deleteGroup = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/social/groups?id=${encodeURIComponent(id)}`);
};

export const joinGroup = async (id: string): Promise<{ status: MemberStatus; message: string }> => {
    const { data } = await apiClient.post<Envelope<{ status: MemberStatus; message: string }>>(
        `/api/social/group-membership?id=${encodeURIComponent(id)}`,
    );
    return data.data;
};

export const leaveGroup = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/social/group-membership?id=${encodeURIComponent(id)}`);
};

export interface GroupMemberRow { user: PersonSummary; role: GroupRole; }

export const getGroupMembers = async (
    id: string, status: MemberStatus = 'active', offset = 0,
): Promise<Paged<GroupMemberRow>> => {
    const { data } = await apiClient.get<Envelope<{ members: GroupMemberRow[]; total: number; has_more: boolean }>>(
        `/api/social/group-members?id=${encodeURIComponent(id)}&status=${status}&offset=${offset}`,
    );
    return { items: data.data.members ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

export type MemberAction = 'add' | 'approve' | 'decline' | 'role' | 'remove' | 'ban' | 'transfer';

export const manageMember = async (
    groupId: string,
    userId: string,
    action: MemberAction,
    opts: { role?: GroupRole; reason?: string; ban_hours?: number } = {},
): Promise<void> => {
    await apiClient.post(`/api/social/group-members?id=${encodeURIComponent(groupId)}`, {
        user_id: userId, action, ...opts,
    });
};

export const setGroupNotificationLevel = async (
    groupId: string, level: 'all' | 'mentions' | 'none',
): Promise<void> => {
    await apiClient.put(`/api/social/group-members?id=${encodeURIComponent(groupId)}`, {
        notification_level: level,
    });
};

// ── Invites ───────────────────────────────────────────────────────────────────

export interface GroupInvite {
    id: string;
    code: string;
    max_uses: number;
    uses: number;
    expires_at?: string | null;
    created_at: string;
}

export const createInvite = async (
    groupId: string, maxUses = 0, ttlHours = 0,
): Promise<GroupInvite> => {
    const { data } = await apiClient.post<Envelope<{ invite: GroupInvite }>>('/api/social/group-invites', {
        group_id: groupId, max_uses: maxUses, ttl_hours: ttlHours,
    });
    return data.data.invite;
};

export const listInvites = async (groupId: string): Promise<GroupInvite[]> => {
    const { data } = await apiClient.get<Envelope<{ invites: GroupInvite[] }>>(
        `/api/social/group-invites?id=${encodeURIComponent(groupId)}`,
    );
    return data.data.invites ?? [];
};

export const revokeInvite = async (inviteId: string): Promise<void> => {
    await apiClient.delete(`/api/social/group-invites?id=${encodeURIComponent(inviteId)}`);
};

export const redeemInvite = async (code: string): Promise<Group> => {
    const { data } = await apiClient.post<Envelope<{ group: Group }>>('/api/social/group-invites', { code });
    return data.data.group;
};

/** Builds the shareable link for an invite code. */
export const inviteLink = (code: string): string =>
    `${window.location.origin}/student/groups?invite=${encodeURIComponent(code)}`;

// ── Group posts ───────────────────────────────────────────────────────────────

export interface GroupPost {
    id: string;
    author_id: string;
    content: string;
    media_url?: string;
    created_at: string;
    comments_count: number;
    reactions_count: number;
}

export const getGroupPosts = async (
    groupId: string, offset = 0,
): Promise<{
    posts: GroupPost[];
    authors: Record<string, PersonSummary>;
    reactions: Record<string, ReactionSummary>;
    total: number;
    has_more: boolean;
}> => {
    const { data } = await apiClient.get<Envelope<{
        posts: GroupPost[];
        authors: Record<string, PersonSummary>;
        reactions: Record<string, ReactionSummary>;
        total: number;
        has_more: boolean;
    }>>(`/api/social/group-posts?id=${encodeURIComponent(groupId)}&offset=${offset}`);
    return {
        posts: data.data.posts ?? [],
        authors: data.data.authors ?? {},
        reactions: data.data.reactions ?? {},
        total: data.data.total ?? 0,
        has_more: !!data.data.has_more,
    };
};

// ── Communities ───────────────────────────────────────────────────────────────

export const listCommunities = async (query = '', offset = 0): Promise<Paged<Community>> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (query) params.set('q', query);
    const { data } = await apiClient.get<Envelope<{ communities: Community[]; total: number; has_more: boolean }>>(
        `/api/social/communities?${params}`,
    );
    return { items: data.data.communities ?? [], total: data.data.total ?? 0, has_more: !!data.data.has_more };
};

export const getCommunity = async (
    id: string,
): Promise<{ community: Community; spaces: Group[] }> => {
    const { data } = await apiClient.get<Envelope<{ community: Community; spaces: Group[] }>>(
        `/api/social/communities?id=${encodeURIComponent(id)}`,
    );
    return { community: data.data.community, spaces: data.data.spaces ?? [] };
};

export const createCommunity = async (input: {
    name: string; description?: string; category?: string;
    visibility?: GroupVisibility; avatar_url?: string; cover_url?: string;
}): Promise<Community> => {
    const { data } = await apiClient.post<Envelope<{ community: Community }>>(
        '/api/social/communities', input,
    );
    return data.data.community;
};
