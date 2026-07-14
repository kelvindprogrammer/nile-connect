import { apiClient } from './api';

interface Envelope<T> { data: T; }

export const recordProfileView = async (userId: string): Promise<{ recorded: boolean; total_views: number }> => {
    const { data } = await apiClient.post<Envelope<{ recorded: boolean; total_views: number }>>(`/api/profile/${userId}/view`);
    return data.data;
};

export interface EndorsementCount {
    skill: string;
    count: number;
}

export interface EndorsementsResponse {
    endorsements: EndorsementCount[];
    endorsed_by_me: Record<string, boolean>;
}

export const getEndorsements = async (userId: string): Promise<EndorsementsResponse> => {
    const { data } = await apiClient.get<Envelope<EndorsementsResponse>>(`/api/profile/${userId}/endorsements`);
    return data.data;
};

export const endorseSkill = async (userId: string, skill: string): Promise<void> => {
    await apiClient.post(`/api/profile/${userId}/endorsements`, { skill });
};
