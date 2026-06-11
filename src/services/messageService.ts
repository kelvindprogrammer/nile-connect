import { apiClient } from './api';

export interface Message {
    id: string; sender_id: string; receiver_id: string;
    content: string; is_read: boolean; created_at: string;
    media_url?: string; media_type?: string;
}

export interface Conversation {
    user_id: string; full_name: string;
    last_msg: string; last_time: string; unread: number;
    last_active_at?: string;
}

export interface UserProfile {
    id: string; full_name: string; username: string; role: string;
    student_subtype?: string; major?: string;
    graduation_year?: number; is_verified: boolean;
    last_active_at?: string;
}

interface Envelope<T> { data: T; }

export const getConversations = async (): Promise<Conversation[]> => {
    const { data } = await apiClient.get<Envelope<{ conversations: Conversation[] }>>('/api/messages/conversations');
    return data.data.conversations ?? [];
};

export interface ThreadResult {
    messages: Message[];
    partnerTyping: boolean;
}

export const getThread = async (toUserID: string): Promise<ThreadResult> => {
    const { data } = await apiClient.get<Envelope<{ messages: Message[]; partner_typing: boolean }>>(
        `/api/messages/thread/${toUserID}`
    );
    return { messages: data.data.messages ?? [], partnerTyping: !!data.data.partner_typing };
};

export const sendMessage = async (
    toUserID: string,
    content: string,
    media?: { url: string; type: string }
): Promise<Message> => {
    const { data } = await apiClient.post<Envelope<Message>>(
        `/api/messages/send/${toUserID}`,
        { content, media_url: media?.url, media_type: media?.type }
    );
    return data.data;
};

export const sendTyping = async (toUserID: string): Promise<void> => {
    await apiClient.post(`/api/messages/typing/${toUserID}`);
};

export const sendHeartbeat = async (): Promise<void> => {
    await apiClient.post('/api/messages/presence');
};

export const searchUsers = async (q: string, role?: string): Promise<UserProfile[]> => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (role && role !== 'all') params.role = role;
    const { data } = await apiClient.get<Envelope<{ users: UserProfile[] }>>('/api/users/search', { params });
    return data.data.users ?? [];
};

export interface UploadResult {
    url: string;
    media_type: string;
    content_type: string;
    filename: string;
}

export const uploadFile = async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<Envelope<UploadResult>>('/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
};
