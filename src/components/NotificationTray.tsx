import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Heart, MessageCircle, UserPlus, UserCheck, Briefcase, Calendar, Mail, CheckCheck, Loader2,
} from 'lucide-react';
import { timeAgo } from '../utils/formatDate';
import type { AppNotification, NotificationType } from '../types/notification';

const ICONS: Record<NotificationType, React.ElementType> = {
    message: Mail,
    like: Heart,
    comment: MessageCircle,
    connection_request: UserPlus,
    connection_accept: UserCheck,
    application_status: Briefcase,
    event: Calendar,
};

const ICON_STYLES: Record<NotificationType, string> = {
    message: 'text-nile-blue bg-nile-blue-50',
    like: 'text-rose-500 bg-rose-50',
    comment: 'text-amber-500 bg-amber-50',
    connection_request: 'text-nile-green bg-nile-green-50',
    connection_accept: 'text-nile-green bg-nile-green-50',
    application_status: 'text-purple-500 bg-purple-50',
    event: 'text-nile-blue bg-nile-blue-50',
};

interface NotificationTrayProps {
    notifications: AppNotification[];
    loaded: boolean;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onClose?: () => void;
}

const NotificationTray: React.FC<NotificationTrayProps> = ({ notifications, loaded, onMarkRead, onMarkAllRead, onClose }) => {
    const navigate = useNavigate();
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleClick = (n: AppNotification) => {
        if (!n.is_read) onMarkRead(n.id);
        onClose?.();
        if (n.link) navigate(n.link);
    };

    return (
        <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl shadow-soft-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                    <span className="text-xs font-medium text-nile-blue bg-nile-blue-50 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                    </span>
                )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
                {!loaded ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 size={20} className="animate-spin text-gray-300" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
                        <Bell size={28} className="text-gray-200" />
                        <p className="text-sm text-gray-400">You're all caught up</p>
                    </div>
                ) : notifications.map(n => {
                    const Icon = ICONS[n.type] || Bell;
                    const iconStyle = ICON_STYLES[n.type] || 'text-gray-500 bg-gray-100';
                    return (
                        <button
                            key={n.id}
                            onClick={() => handleClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-nile-blue-50/40' : ''}`}
                        >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
                                <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                                {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-nile-blue mt-1.5 flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {notifications.length > 0 && (
                <button
                    onClick={onMarkAllRead}
                    className="w-full py-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-nile-blue hover:bg-gray-50 transition-colors"
                >
                    <CheckCheck size={14} /> Mark all as read
                </button>
            )}
        </div>
    );
};

export default NotificationTray;
