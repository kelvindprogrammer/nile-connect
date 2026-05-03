import { apiClient } from './api';

export interface Message {
    id: string; sender_id: string; receiver_id: string;
    content: string; is_read: boolean; created_at: string;
}

export interface Conversation {
    user_id: string; full_name: string;
    last_msg: string; last_time: string; unread: number;
}

export interface UserProfile {
    id: string; full_name: string; username: string; role: string;
    student_subtype?: string; major?: string;
    graduation_year?: number; is_verified: boolean;
}

interface Envelope<T> { data: T; }

export const getConversations = async (): Promise<Conversation[]> => {
    const { data } = await apiClient.get<Envelope<{ conversations: Conversation[] }>>('/api/messages/conversations');
    return data.data.conversations ?? [];
};

export const getThread = async (toUserID: string): Promise<Message[]> => {
    const { data } = await apiClient.get<Envelope<{ messages: Message[] }>>(
        `/api/messages/thread/${toUserID}`
    );
    return data.data.messages ?? [];
};

export const sendMessage = async (toUserID: string, content: string): Promise<Message> => {
    const { data } = await apiClient.post<Envelope<Message>>(
        `/api/messages/send/${toUserID}`,
        { content }
    );
    return data.data;
};

export const searchUsers = async (q: string, role?: string): Promise<UserProfile[]> => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (role && role !== 'all') params.role = role;
    const { data } = await apiClient.get<Envelope<{ users: UserProfile[] }>>('/api/users/search', { params });
    return data.data.users ?? [];
};
