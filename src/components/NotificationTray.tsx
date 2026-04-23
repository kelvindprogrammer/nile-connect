import React from 'react';
import Card from './Card';
import { Bell, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    time: string;
    unread: boolean;
}

const mockNotifications: Notification[] = [
    {
        id: 1,
        title: 'CV APPROVED',
        message: 'Career services has approved your latest Resume V2 submission.',
        type: 'success',
        time: 'Just now',
        unread: true
    },
    {
        id: 2,
        title: 'NEW JOB MATCH',
        message: 'Google Tech has posted a role that matches your profile skills.',
        type: 'info',
        time: '2h ago',
        unread: true
    },
    {
        id: 3,
        title: 'FEEDBACK RECEIVED',
        message: 'You have new interview feedback from your last mock session.',
        type: 'info',
        time: '1d ago',
        unread: false
    }
];

const NotificationTray: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    return (
        <div className="w-full max-w-sm bg-white border-4 border-black rounded-[32px] shadow-brutalist overflow-hidden anime-fade-in">
            <div className="bg-nile-blue p-6 border-b-4 border-black flex justify-between items-center text-white">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center">
                    <Bell size={18} className="mr-2" strokeWidth={3} /> Notifications
                </h3>
                <span className="bg-nile-green text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black">
                    {mockNotifications.filter(n => n.unread).length} NEW
                </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 font-sans">
                {mockNotifications.map((notif) => (
                    <div 
                        key={notif.id} 
                        className={`p-4 border-3 border-black rounded-2xl transition-all cursor-pointer hover:translate-x-1
                            ${notif.unread ? 'bg-nile-white shadow-brutalist-sm text-black' : 'bg-white opacity-60 text-nile-blue'}
                        `}
                    >
                        <div className="flex items-start space-x-3">
                            {notif.type === 'success' ? <CheckCircle2 size={18} className="text-nile-green flex-shrink-0" strokeWidth={3} /> : null}
                            {notif.type === 'error' ? <XCircle size={18} className="text-red-500 flex-shrink-0" strokeWidth={3} /> : null}
                            {notif.type === 'info' ? <Clock size={18} className="text-nile-blue flex-shrink-0" strokeWidth={3} /> : null}
                            
                            <div className="space-y-1">
                                <p className="text-[11px] font-black uppercase tracking-tight">{notif.title}</p>
                                <p className="text-[10px] font-bold leading-relaxed">{notif.message}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50">{notif.time}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full py-4 bg-white border-t-4 border-black font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                Mark All As Read
            </button>
        </div>
    );
};

export default NotificationTray;
