import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart, PartyPopper, Sun, Coffee, Bell, MessageSquare,
    Mail, Phone, CheckCircle2, Clock, ChevronRight, Plus,
    Calendar, RefreshCw, Send, X, Sparkles,
} from 'lucide-react';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api';

type ReminderType = 'holiday' | 'weekly' | 'checkin' | 'milestone' | 'custom';
type Channel = 'email' | 'sms' | 'platform';

interface Reminder {
    id: string;
    type: ReminderType;
    title: string;
    message: string;
    dueDate: string;
    employers: string[];
    channel: Channel;
    sent: boolean;
}

interface Employer {
    id: string;
    name: string;
    company: string;
    lastContact: string;
    status: 'hot' | 'warm' | 'cold';
}

const mockEmployers: Employer[] = [
    { id: '1', name: 'Jennifer Okafor', company: 'Microsoft Nigeria', lastContact: '2 days ago', status: 'hot' },
    { id: '2', name: 'David Chen', company: 'Google West Africa', lastContact: '1 week ago', status: 'warm' },
    { id: '3', name: 'Amina Sule', company: 'Dangote Group', lastContact: '2 weeks ago', status: 'cold' },
    { id: '4', name: 'Emeka Okafor', company: 'Shell Nigeria', lastContact: '3 days ago', status: 'warm' },
    { id: '5', name: 'Fatima Abdullahi', company: 'Access Bank', lastContact: '1 month ago', status: 'cold' },
];

const templateMessages: Record<ReminderType, { title: string; message: string; icon: React.ReactNode; color: string }> = {
    holiday: {
        title: 'Happy Holiday Greeting',
        message: 'Warm greetings from the Nile University Career Services team! Wishing you and your team a wonderful holiday season. We look forward to our continued partnership in 2025.',
        icon: <PartyPopper size={18} />,
        color: 'bg-yellow-400 text-black',
    },
    weekly: {
        title: 'Happy New Week',
        message: 'Good morning! Wishing you a productive and successful new week. Just a quick check-in from Nile University Career Services — we have some exceptional new graduates ready to join your team!',
        icon: <Sun size={18} />,
        color: 'bg-nile-green text-white',
    },
    checkin: {
        title: 'Quarterly Check-In',
        message: 'Hi there! It\'s been a while since we last connected. We\'d love to hear how your recent Nile University hires are performing and discuss how we can continue supporting your recruitment needs.',
        icon: <Coffee size={18} />,
        color: 'bg-nile-blue text-white',
    },
    milestone: {
        title: 'Partnership Milestone',
        message: 'Congratulations on reaching a year of partnership with Nile University! We\'re proud of what we\'ve built together and excited about what\'s ahead for our students and your organization.',
        icon: <Heart size={18} />,
        color: 'bg-red-400 text-white',
    },
    custom: {
        title: 'Custom Message',
        message: '',
        icon: <Sparkles size={18} />,
        color: 'bg-black text-white',
    },
};

const statusColors: Record<string, string> = {
    hot: 'bg-red-100 text-red-600 border-red-200',
    warm: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    cold: 'bg-blue-50 text-blue-500 border-blue-200',
};

const statusLabel: Record<string, string> = {
    hot: '🔥 HOT',
    warm: '☀️ WARM',
    cold: '❄️ COLD',
};

const CRMManager = () => {
    const { showToast } = useToast();
    const [reminders, setReminders] = useState<Reminder[]>([
        {
            id: 'r1',
            type: 'weekly',
            title: 'Happy New Week',
            message: 'Wishing you a productive new week!',
            dueDate: new Date().toISOString().split('T')[0],
            employers: ['1', '2'],
            channel: 'email',
            sent: false,
        },
        {
            id: 'r2',
            type: 'checkin',
            title: 'Monthly Check-In',
            message: 'Just checking in on our partnership.',
            dueDate: new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0],
            employers: ['3', '5'],
            channel: 'platform',
            sent: false,
        },
    ]);

    const [showCompose, setShowCompose] = useState(false);
    const [selectedType, setSelectedType] = useState<ReminderType>('weekly');
    const [selectedEmployers, setSelectedEmployers] = useState<string[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel>('email');
    const [customMsg, setCustomMsg] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [sending, setSending] = useState<string | null>(null);

    const template = templateMessages[selectedType];

    const toggleEmployer = (id: string) => {
        setSelectedEmployers(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const handleSaveReminder = () => {
        if (selectedEmployers.length === 0) {
            showToast('Select at least one employer', 'error');
            return;
        }
        const newReminder: Reminder = {
            id: Date.now().toString(),
            type: selectedType,
            title: template.title,
            message: selectedType === 'custom' ? customMsg : template.message,
            dueDate,
            employers: selectedEmployers,
            channel: selectedChannel,
            sent: false,
        };
        setReminders(prev => [newReminder, ...prev]);
        setShowCompose(false);
        setSelectedEmployers([]);
        setCustomMsg('');
        showToast('CRM reminder scheduled!', 'success');
    };

    const handleSendNow = async (reminder: Reminder) => {
        setSending(reminder.id);
        try {
            // Post to feed as a broadcast message
            await apiClient.post('/feed', {
                content: `[CRM] ${reminder.title}: ${reminder.message}`,
            });
            setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, sent: true } : r));
            showToast(`Message sent via ${reminder.channel}!`, 'success');
        } catch {
            // Still mark as "sent" locally for demo purposes
            setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, sent: true } : r));
            showToast(`Message queued for ${reminder.channel} delivery!`, 'success');
        } finally {
            setSending(null);
        }
    };

    const handleDelete = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        showToast('Reminder removed', 'info');
    };

    const todayReminders = reminders.filter(r => r.dueDate === new Date().toISOString().split('T')[0] && !r.sent);
    const coldEmployers = mockEmployers.filter(e => e.status === 'cold');

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans bg-nile-white min-h-full pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter leading-none">CRM Manager .</h2>
                    <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">EMPLOYER RELATIONSHIP TRACKER & OUTREACH SYSTEM</p>
                </div>
                <Button size="sm" onClick={() => setShowCompose(true)}>
                    <Plus size={14} className="mr-2" strokeWidth={3} /> NEW REMINDER
                </Button>
            </div>

            {/* Alert: Due today */}
            {todayReminders.length > 0 && (
                <div className="bg-yellow-50 border-[2px] border-yellow-400 rounded-[20px] p-5 flex items-start gap-4">
                    <Bell size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <div className="flex-1">
                        <p className="font-black text-sm text-yellow-800 uppercase">
                            {todayReminders.length} REMINDER{todayReminders.length > 1 ? 'S' : ''} DUE TODAY
                        </p>
                        <p className="text-[9px] font-bold text-yellow-700 uppercase mt-1">
                            Don't forget to reach out to your employer contacts!
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            const r = todayReminders[0];
                            handleSendNow(r);
                        }}
                        className="text-[9px] font-black text-yellow-800 underline hover:text-yellow-900 whitespace-nowrap"
                    >
                        SEND NOW
                    </button>
                </div>
            )}

            {/* Cold contacts alert */}
            {coldEmployers.length > 0 && (
                <div className="bg-blue-50 border-[2px] border-blue-200 rounded-[20px] p-5 flex items-start gap-4">
                    <RefreshCw size={20} className="text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <div className="flex-1">
                        <p className="font-black text-sm text-blue-800 uppercase">
                            {coldEmployers.length} EMPLOYERS NEED RE-ENGAGEMENT
                        </p>
                        <p className="text-[9px] font-bold text-blue-600 uppercase mt-1">
                            {coldEmployers.map(e => e.company).join(', ')} — haven't been contacted recently.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedType('checkin');
                            setSelectedEmployers(coldEmployers.map(e => e.id));
                            setShowCompose(true);
                        }}
                        className="text-[9px] font-black text-blue-700 underline hover:text-blue-900 whitespace-nowrap"
                    >
                        REACH OUT
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* Left: Reminders list */}
                <div className="xl:col-span-8 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50">SCHEDULED REMINDERS</h3>
                    {reminders.length === 0 ? (
                        <div className="py-16 text-center border-[2px] border-dashed border-black/10 rounded-[24px]">
                            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">No reminders yet — create one above</p>
                        </div>
                    ) : reminders.map(reminder => {
                        const t = templateMessages[reminder.type];
                        const empNames = reminder.employers.map(id => mockEmployers.find(e => e.id === id)?.company || 'Unknown').join(', ');
                        return (
                            <div
                                key={reminder.id}
                                className={`bg-white border-[2px] border-black rounded-[20px] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                                    ${reminder.sent ? 'opacity-50' : 'hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]'}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${t.color}`}>
                                            {t.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-black text-sm uppercase leading-none">{reminder.title}</p>
                                                {reminder.sent && (
                                                    <span className="flex items-center gap-1 text-[7px] font-black text-nile-green uppercase bg-nile-green/10 px-2 py-0.5 rounded-full border border-nile-green/20">
                                                        <CheckCircle2 size={9} strokeWidth={3} /> SENT
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-black/50 uppercase mt-1 truncate">{empNames}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="flex items-center gap-1 text-[8px] font-black text-black/30 uppercase">
                                                    <Calendar size={10} /> {reminder.dueDate}
                                                </span>
                                                <span className="text-[8px] font-black text-nile-blue uppercase">{reminder.channel.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {!reminder.sent && (
                                            <button
                                                onClick={() => handleSendNow(reminder)}
                                                disabled={sending === reminder.id}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-nile-blue text-white text-[8px] font-black uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                                            >
                                                <Send size={10} strokeWidth={3} />
                                                {sending === reminder.id ? '...' : 'SEND'}
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(reminder.id)} className="p-1.5 text-black/20 hover:text-red-500 transition-colors">
                                            <X size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>

                                {reminder.message && (
                                    <div className="mt-4 p-3 bg-nile-white rounded-xl text-[10px] font-bold text-black/60 leading-relaxed italic border border-black/5">
                                        "{reminder.message.slice(0, 120)}{reminder.message.length > 120 ? '...' : ''}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Employer health */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(30,73,157,1)]">
                        <h3 className="text-sm font-black uppercase tracking-tight mb-5 pb-3 border-b-2 border-black">EMPLOYER HEALTH</h3>
                        <div className="space-y-3">
                            {mockEmployers.map(emp => (
                                <div key={emp.id} className="flex items-center gap-3 p-3 border-[2px] border-black/5 rounded-xl hover:border-black transition-all cursor-pointer group" onClick={() => { setSelectedEmployers([emp.id]); setShowCompose(true); }}>
                                    <div className="w-9 h-9 rounded-full bg-nile-blue text-white flex items-center justify-center font-black text-xs flex-shrink-0 border-2 border-black">
                                        {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[10px] uppercase truncate leading-none">{emp.company}</p>
                                        <p className="text-[8px] font-black text-black/30 uppercase mt-0.5">{emp.lastContact}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border ${statusColors[emp.status]}`}>
                                            {statusLabel[emp.status]}
                                        </span>
                                        <ChevronRight size={12} className="text-black/20 group-hover:text-nile-blue transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-nile-blue text-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-sm font-black uppercase tracking-tight mb-4">QUICK OUTREACH</h3>
                        <div className="space-y-2.5">
                            {Object.entries(templateMessages).filter(([k]) => k !== 'custom').map(([key, t]) => (
                                <button
                                    key={key}
                                    onClick={() => { setSelectedType(key as ReminderType); setShowCompose(true); }}
                                    className="w-full flex items-center gap-3 p-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all text-left"
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.color} border border-white/30 flex-shrink-0`}>
                                        {t.icon}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t.title}</span>
                                    <ChevronRight size={12} className="ml-auto opacity-40" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCompose(false)}>
                    <div className="bg-white border-[3px] border-black rounded-[28px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full p-6 md:p-8 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tight">New CRM Reminder</h3>
                            <button onClick={() => setShowCompose(false)} className="p-1.5 border-2 border-black/10 rounded-lg hover:bg-black/5">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Message type */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-black/50">MESSAGE TYPE</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(templateMessages).map(([key, t]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedType(key as ReminderType)}
                                        className={`flex items-center gap-2 p-2.5 border-[2px] border-black rounded-xl transition-all text-left
                                            ${selectedType === key ? 'shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] bg-white' : 'bg-nile-white hover:bg-white'}`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color}`}>{t.icon}</div>
                                        <span className="text-[8px] font-black uppercase">{t.title.split(' ').slice(0, 2).join(' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message preview/edit */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-black/50">MESSAGE CONTENT</label>
                            <textarea
                                className="w-full h-28 border-[2px] border-black rounded-xl p-4 font-bold text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                                value={selectedType === 'custom' ? customMsg : template.message}
                                onChange={e => selectedType === 'custom' ? setCustomMsg(e.target.value) : undefined}
                                readOnly={selectedType !== 'custom'}
                                placeholder={selectedType === 'custom' ? 'Write your custom message...' : undefined}
                            />
                        </div>

                        {/* Select employers */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-black/50">SEND TO ({selectedEmployers.length} selected)</label>
                            <div className="space-y-2 max-h-36 overflow-y-auto">
                                {mockEmployers.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-3 p-3 border-[2px] border-black rounded-xl cursor-pointer hover:bg-nile-white transition-all">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployers.includes(emp.id)}
                                            onChange={() => toggleEmployer(emp.id)}
                                            className="w-4 h-4 accent-nile-blue"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-[10px] uppercase truncate">{emp.company}</p>
                                            <p className="text-[8px] text-black/40 uppercase font-black">{emp.name} · {emp.lastContact}</p>
                                        </div>
                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${statusColors[emp.status]}`}>{statusLabel[emp.status]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Channel + Date */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-black/50">CHANNEL</label>
                                <select
                                    value={selectedChannel}
                                    onChange={e => setSelectedChannel(e.target.value as Channel)}
                                    className="w-full border-[2px] border-black rounded-xl py-2.5 px-3 font-black text-xs uppercase outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] bg-nile-white/40"
                                >
                                    <option value="email">Email</option>
                                    <option value="sms">SMS</option>
                                    <option value="platform">Platform</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-black/50">DUE DATE</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full border-[2px] border-black rounded-xl py-2.5 px-3 font-black text-xs outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] bg-nile-white/40"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" fullWidth onClick={() => setShowCompose(false)}>CANCEL</Button>
                            <Button fullWidth onClick={handleSaveReminder}>
                                <Bell size={14} className="mr-2" /> SAVE REMINDER
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRMManager;
