import { apiClient } from './api';

export interface ConnectionItem {
    id: string;
    user_id: string;
    full_name: string;
    role: string;
    status: string;
    created_at: string;
}

export interface ConnectionsResponse {
    accepted: ConnectionItem[];
    incoming: ConnectionItem[];
    outgoing: ConnectionItem[];
}

interface Envelope<T> { data: T; }

export const getConnections = async (): Promise<ConnectionsResponse> => {
    const { data } = await apiClient.get<Envelope<ConnectionsResponse>>('/api/connections');
    return data.data;
};

export const requestConnection = async (toUserId: string): Promise<ConnectionItem> => {
    const { data } = await apiClient.post<Envelope<ConnectionItem>>(`/api/connections/request/${toUserId}`);
    return data.data;
};

export const respondConnection = async (id: string, action: 'accept' | 'decline'): Promise<{ id: string; status: string }> => {
    const { data } = await apiClient.post<Envelope<{ id: string; status: string }>>(`/api/connections/${id}/respond`, { action });
    return data.data;
};

export const getConnectionsFor = async (userId: string): Promise<string[]> => {
    const { data } = await apiClient.get<Envelope<{ user_id: string; connection_ids: string[] }>>(`/api/connections/for/${userId}`);
    return data.data.connection_ids ?? [];
};

export interface ConnectionSuggestion {
    user_id: string;
    full_name: string;
    role: string;
    mutual_connections: number;
}

export const getConnectionSuggestions = async (): Promise<ConnectionSuggestion[]> => {
    const { data } = await apiClient.get<Envelope<{ suggestions: ConnectionSuggestion[] }>>('/api/connections/suggestions');
    return data.data.suggestions ?? [];
};

// Intersects the viewer's accepted connections with a third party's, giving
// a "N mutual connections" count usable on any profile header.
export const getMutualConnectionsCount = async (profileUserId: string): Promise<number> => {
    const [mine, theirs] = await Promise.all([getConnections(), getConnectionsFor(profileUserId)]);
    const theirSet = new Set(theirs);
    return mine.accepted.filter(c => theirSet.has(c.user_id)).length;
};
