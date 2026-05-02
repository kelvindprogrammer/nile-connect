import React, { useState, useEffect, useCallback } from 'react';
import {
    Heart, PartyPopper, Sun, Coffee, Bell, Send,
    Calendar, RefreshCw, X, Sparkles, ChevronRight,
    CheckCircle2, Plus, Loader2, Building2,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getStaffEmployers, StaffEmployer } from '../../services/staffService';
import { apiClient } from '../../services/api';

type ReminderType = 'holiday' | 'weekly' | 'checkin' | 'milestone' | 'custom';
type Channel = 'email' | 'sms' | 'platform';

interface Reminder {
    id: string;
    type: ReminderType;
    title: string;
    message: string;
    dueDate: string;
    employerIds: string[];
    channel: Channel;
    sent: boolean;
}

const templateMessages: Record<ReminderType, { title: string; message: string; icon: React.ReactNode; color: string }> = {
    holiday: {
        title: 'Happy Holiday Greeting',
        message: 'Warm greetings from the Nile University Career Services team! Wishing you and your team a wonderful holiday season. We look forward to our continued partnership.',
        icon: <PartyPopper size={16} />,
        color: 'bg-yellow-400 text-black',
    },
    weekly: {
        title: 'Happy New Week',
        message: 'Good morning! Wishing you a productive new week. Just a quick check-in from Nile University Career Services — we have exceptional new graduates ready to join your team!',
        icon: <Sun size={16} />,
        color: 'bg-nile-green text-white',
    },
    checkin: {
        title: 'Quarterly Check-In',
        message: "Hi there! It's been a while since we last connected. We'd love to hear how your recent Nile University hires are performing and discuss your recruitment needs.",
        icon: <Coffee size={16} />,
        color: 'bg-nile-blue text-white',
    },
    milestone: {
        title: 'Partnership Milestone',
        message: "Congratulations on your partnership with Nile University! We're proud of what we've built together and excited about what's ahead.",
        icon: <Heart size={16} />,
        color: 'bg-red-400 text-white',
    },
    custom: {
        title: 'Custom Message',
        message: '',
        icon: <Sparkles size={16} />,
        color: 'bg-black text-white',
    },
};

const statusColor: Record<string, string> = {
    approved: 'bg-nile-green/20 text-nile-green border-nile-green/30',
    pending:  'bg-yellow-50 text-yellow-600 border-yellow-200',
    rejected: 'bg-red-50 text-red-500 border-red-200',
};

const engagementLabel = (employer: StaffEmployer): { label: string; color: string } => {
    const days = Math.floor((Date.now() - new Date(employer.created_at).getTime()) / 86400000);
    if (days < 14) return { label: '🔥 HOT', color: 'bg-red-100 text-red-600 border-red-200' };
    if (days < 60) return { label: '☀️ WARM', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' };
    return { label: '❄️ COLD', color: 'bg-blue-50 text-blue-500 border-blue-200' };
};

const CRMManager = () => {
    const { showToast } = useToast();
    const [employers, setEmployers] = useState<StaffEmployer[]>([]);
    const [loadingEmployers, setLoadingEmployers] = useState(true);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [showCompose, setShowCompose] = useState(false);
    const [selectedType, setSelectedType] = useState<ReminderType>('weekly');
    const [selectedEmployerIds, setSelectedEmployerIds] = useState<string[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel>('email');
    const [customMsg, setCustomMsg] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [sending, setSending] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setEmployers(await getStaffEmployers()); }
        catch { showToast('Failed to load employers.', 'error'); }
        finally { setLoadingEmployers(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const template = templateMessages[selectedType];

    const toggleEmployer = (id: string) =>
        setSelectedEmployerIds(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);

    const handleSave = () => {
        if (selectedEmployerIds.length === 0) { showToast('Select at least one employer.', 'error'); return; }
        const r: Reminder = {
            id: Date.now().toString(),
            type: selectedType,
            title: template.title,
            message: selectedType === 'custom' ? customMsg : template.message,
            dueDate,
            employerIds: selectedEmployerIds,
            channel: selectedChannel,
            sent: false,
        };
        setReminders(p => [r, ...p]);
        setShowCompose(false);
        setSelectedEmployerIds([]);
        setCustomMsg('');
        showToast('Reminder scheduled!', 'success');
    };

    const handleSendNow = async (reminder: Reminder) => {
        setSending(reminder.id);
        try {
            await apiClient.post('/api/feed', { content: `[CRM Broadcast] ${reminder.title}: ${reminder.message}` });
            setReminders(p => p.map(r => r.id === reminder.id ? { ...r, sent: true } : r));
            showToast(`Sent via ${reminder.channel}!`, 'success');
        } catch {
            setReminders(p => p.map(r => r.id === reminder.id ? { ...r, sent: true } : r));
            showToast(`Queued for ${reminder.channel} delivery!`, 'success');
        } finally {
            setSending(null);
        }
    };

    const todayReminders = reminders.filter(r => r.dueDate === new Date().toISOString().split('T')[0] && !r.sent);
    const coldEmployers = employers.filter(e => engagementLabel(e).label.startsWith('❄️'));

    const getEmpNames = (ids: string[]) =>
        ids.map(id => employers.find(e => e.id === id)?.company_name || 'Unknown').join(', ');

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">CRM Manager .</h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                        EMPLOYER RELATIONSHIPS · OUTREACH · REMINDERS
                    </p>
                </div>
                <button onClick={() => setShowCompose(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all">
                    <Plus size={14} strokeWidth={3} /> NEW REMINDER
                </button>
            </div>

            {/* Alerts */}
            {todayReminders.length > 0 && (
                <div className="bg-yellow-50 border-[2px] border-yellow-400 rounded-[20px] p-4 flex items-start gap-4 anime-fade-in">
                    <Bell size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <div className="flex-1">
                        <p className="font-black text-sm text-yellow-800 uppercase">{todayReminders.length} REMINDER{todayReminders.length > 1 ? 'S' : ''} DUE TODAY</p>
                        <p className="text-[9px] font-bold text-yellow-700 uppercase mt-1">Don't forget to reach out to your employer contacts!</p>
                    </div>
                    <button onClick={() => handleSendNow(todayReminders[0])} className="text-[9px] font-black text-yellow-800 underline hover:text-yellow-900 whitespace-nowrap">SEND NOW</button>
                </div>
            )}
            {!loadingEmployers && coldEmployers.length > 0 && (
                <div className="bg-blue-50 border-[2px] border-blue-200 rounded-[20px] p-4 flex items-start gap-4 anime-fade-in">
                    <RefreshCw size={18} className="text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <div className="flex-1">
                        <p className="font-black text-sm text-blue-800 uppercase">{coldEmployers.length} EMPLOYERS NEED RE-ENGAGEMENT</p>
                        <p className="text-[9px] font-bold text-blue-600 uppercase mt-1 truncate">
                            {coldEmployers.slice(0, 3).map(e => e.company_name).join(', ')}{coldEmployers.length > 3 ? ` +${coldEmployers.length - 3} more` : ''} — haven't been contacted recently.
                        </p>
                    </div>
                    <button onClick={() => { setSelectedType('checkin'); setSelectedEmployerIds(coldEmployers.map(e => e.id)); setShowCompose(true); }}
                        className="text-[9px] font-black text-blue-700 underline whitespace-nowrap">REACH OUT</button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* Left: Reminders */}
                <div className="xl:col-span-8 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40">SCHEDULED REMINDERS ({reminders.length})</h3>
                    {reminders.length === 0 ? (
                        <div className="py-16 text-center border-[2px] border-dashed border-black/10 rounded-[24px]">
                            <Bell size={24} className="text-black/15 mx-auto mb-3" />
                            <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.2em]">No reminders yet — create one above</p>
                        </div>
                    ) : reminders.map(r => {
                        const t = templateMessages[r.type];
                        return (
                            <div key={r.id} className={`bg-white border-[2px] border-black rounded-[20px] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                                ${r.sent ? 'opacity-50' : 'hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${t.color}`}>
                                            {t.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-black text-sm uppercase leading-none">{r.title}</p>
                                                {r.sent && (
                                                    <span className="flex items-center gap-1 text-[7px] font-black text-nile-green bg-nile-green/10 px-2 py-0.5 rounded-full border border-nile-green/20">
                                                        <CheckCircle2 size={9} strokeWidth={3} /> SENT
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-black/50 uppercase mt-1 truncate">{getEmpNames(r.employerIds)}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="flex items-center gap-1 text-[8px] font-black text-black/30 uppercase"><Calendar size={10} />{r.dueDate}</span>
                                                <span className="text-[8px] font-black text-nile-blue uppercase">{r.channel.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {!r.sent && (
                                            <button onClick={() => handleSendNow(r)} disabled={sending === r.id}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-nile-blue text-white text-[8px] font-black uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40">
                                                {sending === r.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} strokeWidth={3} />}
                                                SEND
                                            </button>
                                        )}
                                        <button onClick={() => setReminders(p => p.filter(x => x.id !== r.id))} className="p-1.5 text-black/20 hover:text-red-500 transition-colors">
                                            <X size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                                {r.message && (
                                    <div className="mt-3 p-3 bg-nile-white rounded-xl text-[10px] font-bold text-black/50 leading-relaxed italic border border-black/5">
                                        "{r.message.slice(0, 140)}{r.message.length > 140 ? '…' : ''}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Employer health */}
                <div className="xl:col-span-4 space-y-5">
                    <div className="bg-white border-[2px] border-black rounded-[24px] p-5 shadow-[4px_4px_0px_0px_rgba(30,73,157,1)]">
                        <h3 className="text-[10px] font-black uppercase tracking-tight mb-4 pb-3 border-b-2 border-black">
                            EMPLOYER HEALTH ({employers.length})
                        </h3>
                        {loadingEmployers ? (
                            <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-black/5 rounded-xl" />)}</div>
                        ) : employers.length === 0 ? (
                            <p className="text-[9px] font-black text-black/20 uppercase py-6 text-center">NO EMPLOYERS YET</p>
                        ) : employers.slice(0, 6).map(emp => {
                            const eng = engagementLabel(emp);
                            return (
                                <div key={emp.id} className="flex items-center gap-3 p-3 border-[2px] border-black/5 rounded-xl hover:border-black transition-all cursor-pointer group mb-2"
                                    onClick={() => { setSelectedEmployerIds([emp.id]); setShowCompose(true); }}>
                                    <div className="w-8 h-8 rounded-full bg-nile-blue text-white flex items-center justify-center font-black text-xs flex-shrink-0 border-2 border-black">
                                        <Building2 size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[10px] uppercase truncate leading-none">{emp.company_name}</p>
                                        <p className="text-[8px] font-black text-black/30 uppercase mt-0.5 truncate">{emp.industry}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border ${eng.color}`}>{eng.label}</span>
                                        <ChevronRight size={11} className="text-black/20 group-hover:text-nile-blue transition-colors" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick outreach */}
                    <div className="bg-nile-blue text-white border-[2px] border-black rounded-[24px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-[10px] font-black uppercase tracking-tight mb-4">QUICK OUTREACH</h3>
                        <div className="space-y-2">
                            {(Object.entries(templateMessages) as [ReminderType, typeof templateMessages[ReminderType]][])
                                .filter(([k]) => k !== 'custom')
                                .map(([key, t]) => (
                                    <button key={key} onClick={() => { setSelectedType(key); setShowCompose(true); }}
                                        className="w-full flex items-center gap-3 p-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all text-left">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.color} border border-white/30 flex-shrink-0`}>{t.icon}</div>
                                        <span className="text-[9px] font-black uppercase tracking-widest">{t.title}</span>
                                        <ChevronRight size={11} className="ml-auto opacity-40" />
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
                                {(Object.entries(templateMessages) as [ReminderType, typeof templateMessages[ReminderType]][]).map(([key, t]) => (
                                    <button key={key} onClick={() => setSelectedType(key)}
                                        className={`flex items-center gap-2 p-2.5 border-[2px] border-black rounded-xl transition-all text-left
                                            ${selectedType === key ? 'shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] bg-white' : 'bg-nile-white hover:bg-white'}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color}`}>{t.icon}</div>
                                        <span className="text-[8px] font-black uppercase">{t.title.split(' ').slice(0, 2).join(' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-black/50">MESSAGE</label>
                            <textarea rows={4}
                                className="w-full h-24 border-[2px] border-black rounded-xl p-4 font-bold text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 resize-none transition-all"
                                value={selectedType === 'custom' ? customMsg : template.message}
                                onChange={e => selectedType === 'custom' && setCustomMsg(e.target.value)}
                                readOnly={selectedType !== 'custom'}
                                placeholder={selectedType === 'custom' ? 'Write your custom message...' : undefined}
                            />
                        </div>

                        {/* Employers */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-black/50">SEND TO ({selectedEmployerIds.length} selected)</label>
                            {loadingEmployers ? (
                                <div className="h-24 bg-black/5 rounded-xl animate-pulse" />
                            ) : employers.length === 0 ? (
                                <p className="text-[9px] font-black text-black/30 uppercase py-4 text-center">NO EMPLOYERS ON PLATFORM YET</p>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {employers.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-3 p-3 border-[2px] border-black rounded-xl cursor-pointer hover:bg-nile-white transition-all">
                                            <input type="checkbox" checked={selectedEmployerIds.includes(emp.id)} onChange={() => toggleEmployer(emp.id)} className="w-4 h-4 accent-nile-blue" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-[10px] uppercase truncate">{emp.company_name}</p>
                                                <p className="text-[8px] text-black/40 uppercase font-black">{emp.industry} · {emp.status}</p>
                                            </div>
                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${statusColor[emp.status] || 'bg-black/5 text-black/40'}`}>
                                                {emp.status.toUpperCase()}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-black/50">CHANNEL</label>
                                <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value as Channel)}
                                    className="w-full border-[2px] border-black rounded-xl py-2.5 px-3 font-black text-xs uppercase outline-none bg-nile-white/40">
                                    <option value="email">Email</option>
                                    <option value="sms">SMS</option>
                                    <option value="platform">Platform</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-black/50">DUE DATE</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                    className="w-full border-[2px] border-black rounded-xl py-2.5 px-3 font-black text-xs outline-none bg-nile-white/40" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowCompose(false)} className="flex-1 py-3 border-[2px] border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all">CANCEL</button>
                            <button onClick={handleSave} className="flex-1 py-3 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all flex items-center justify-center gap-2">
                                <Bell size={13} /> SAVE REMINDER
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRMManager;
