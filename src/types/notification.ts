export type NotificationType =
    | 'message'
    | 'like'
    | 'comment'
    | 'connection_request'
    | 'connection_accept'
    | 'application_status'
    | 'event';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    link: string;
    is_read: boolean;
    actor_id?: string;
    created_at: string;
}
