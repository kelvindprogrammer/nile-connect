import { apiClient } from './api';
import type { AppNotification } from '../types/notification';

interface Envelope<T> { data: T; }

export const getNotifications = async (): Promise<AppNotification[]> => {
    const { data } = await apiClient.get<Envelope<{ notifications: AppNotification[] }>>('/api/notifications');
    return data.data.notifications ?? [];
};

export const getUnreadNotificationCount = async (): Promise<number> => {
    const { data } = await apiClient.get<Envelope<{ count: number }>>('/api/notifications/unread-count');
    return data.data.count ?? 0;
};

export const markNotificationRead = async (id: string): Promise<void> => {
    await apiClient.post(`/api/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
    await apiClient.post('/api/notifications/mark-all-read');
};
