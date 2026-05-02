import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar, Plus, CheckCircle2, Star, Trash2, Loader2,
    MapPin, Users, Clock, Tag, Search, X, ChevronDown, Send,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getEvents, createEvent, updateEvent, deleteEvent,
    StaffEvent, CreateEventRequest,
} from '../../services/staffService';

type Tab = 'UPCOMING' | 'ALL EVENTS' | 'CREATE';

const categoryColors: Record<string, string> = {
    career_fair:  'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    workshop:     'bg-purple-50 text-purple-600 border-purple-200',
    networking:   'bg-nile-green/10 text-nile-green border-nile-green/20',
    webinar:      'bg-yellow-50 text-yellow-600 border-yellow-200',
    seminar:      'bg-orange-50 text-orange-500 border-orange-200',
    other:        'bg-black/5 text-black/50 border-black/10',
};

const statusColors: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-600 border-yellow-200',
    published: 'bg-nile-green/20 text-nile-green border-nile-green/30',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
};

const EMPTY_FORM: CreateEventRequest = {
    title: '', category: 'career_fair', date: '', time: '09:00',
    location: '', description: '', capacity: 100,
};

const StaffEvents = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<Tab>('UPCOMING');
    const [events, setEvents] = useState<StaffEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<CreateEventRequest>(EMPTY_FORM);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setEvents(await getEvents()); }
        catch { showToast('Failed to load events.', 'error'); }
        finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const now = new Date();
    const upcoming = events.filter(e => new Date(e.date) >= now && e.status !== 'cancelled');
    const displayed = (tab === 'UPCOMING' ? upcoming : events)
        .filter(e => !search ||
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            e.location.toLowerCase().includes(search.toLowerCase()) ||
            e.category.toLowerCase().includes(search.toLowerCase())
        );

    const handleStatusChange = async (event: StaffEvent, status: string) => {
        setActionLoading(p => ({ ...p, [event.id]: true }));
        try {
            await updateEvent(event.id, { status });
            setEvents(p => p.map(e => e.id === event.id ? { ...e, status } : e));
            showToast(`Event ${status}.`, 'success');
        } catch { showToast('Update failed.', 'error'); }
        finally { setActionLoading(p => ({ ...p, [event.id]: false })); }
    };

    const handleFeatureToggle = async (event: StaffEvent) => {
        setActionLoading(p => ({ ...p, [`feat_${event.id}`]: true }));
        try {
            await updateEvent(event.id, { is_featured: !event.is_featured });
            setEvents(p => p.map(e => e.id === event.id ? { ...e, is_featured: !e.is_featured } : e));
            showToast(event.is_featured ? 'Removed from featured.' : 'Marked as featured!', 'success');
        } catch { showToast('Update failed.', 'error'); }
        finally { setActionLoading(p => ({ ...p, [`feat_${event.id}`]: false })); }
    };

    const handleDelete = async (id: string) => {
        setActionLoading(p => ({ ...p, [id]: true }));
        try {
            await deleteEvent(id);
            setEvents(p => p.filter(e => e.id !== id));
            setConfirmDelete(null);
            showToast('Event deleted.', 'success');
        } catch { showToast('Delete failed.', 'error'); }
        finally { setActionLoading(p => ({ ...p, [id]: false })); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.date || !form.location || !form.description) {
            showToast('Fill in all required fields.', 'error'); return;
        }
        setSubmitting(true);
        try {
            const created = await createEvent(form);
            setEvents(p => [created, ...p]);
            setForm(EMPTY_FORM);
            showToast('Event created!', 'success');
            setTab('UPCOMING');
        } catch { showToast('Failed to create event.', 'error'); }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-12 bg-black/5 rounded-2xl w-64" />
            <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-black/5 rounded-xl w-28" />)}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[1,2,3,4].map(i => <div key={i} className="h-52 bg-black/5 rounded-[24px]" />)}</div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Campus Events .</h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                        {upcoming.length} UPCOMING · {events.filter(e => e.is_featured).length} FEATURED
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full xl:w-auto">
                    <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm">
                        {(['UPCOMING', 'ALL EVENTS', 'CREATE'] as Tab[]).map(t => (
                            <button key={t} onClick={() => { setTab(t); setSearch(''); }}
                                className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap
                                    ${tab === t ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}>
                                {t === 'CREATE' && <Plus size={11} strokeWidth={3} />}
                                {t === 'UPCOMING' && <Calendar size={11} />}
                                {t}
                                {t === 'UPCOMING' && upcoming.length > 0 && (
                                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black ${tab === t ? 'bg-nile-green text-white' : 'bg-nile-green/20 text-nile-green'}`}>{upcoming.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── UPCOMING / ALL EVENTS ────────────────────────────────── */}
            {(tab === 'UPCOMING' || tab === 'ALL EVENTS') && (
                <div className="space-y-6 anime-fade-in">
                    <div className="relative">
                        <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="SEARCH EVENTS..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white/60 focus:bg-white transition-all" />
                    </div>

                    {displayed.length === 0 ? (
                        <div className="py-24 text-center border-[2px] border-dashed border-black/10 rounded-[32px]">
                            <Calendar size={32} className="text-black/15 mx-auto mb-4" />
                            <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">
                                {search ? 'No events match your search' : tab === 'UPCOMING' ? 'No upcoming events — create one above' : 'No events yet'}
                            </p>
                            <button onClick={() => setTab('CREATE')}
                                className="mt-5 px-5 py-2.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all">
                                <Plus size={11} className="inline mr-1.5" /> CREATE EVENT
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {displayed.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onStatusChange={handleStatusChange}
                                    onFeatureToggle={handleFeatureToggle}
                                    onDeleteRequest={() => setConfirmDelete(event.id)}
                                    actionLoading={actionLoading}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── CREATE EVENT ─────────────────────────────────────────── */}
            {tab === 'CREATE' && (
                <div className="max-w-2xl space-y-6 anime-fade-in">
                    <div className="bg-white border-[2px] border-black rounded-[28px] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3 mb-6 pb-5 border-b-[2px] border-black/5">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                                <Calendar size={18} className="text-nile-green" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Create New Event</h3>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest">POSTED AS NILE UNIVERSITY CAREER SERVICES</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-5">
                            <EField label="EVENT TITLE *">
                                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Fall Career Fair 2026"
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                            </EField>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <EField label="CATEGORY">
                                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-white cursor-pointer transition-all">
                                        <option value="career_fair">Career Fair</option>
                                        <option value="workshop">Workshop</option>
                                        <option value="networking">Networking</option>
                                        <option value="webinar">Webinar</option>
                                        <option value="seminar">Seminar</option>
                                        <option value="other">Other</option>
                                    </select>
                                </EField>
                                <EField label="CAPACITY *">
                                    <input type="number" min={1} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </EField>
                                <EField label="DATE *">
                                    <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </EField>
                                <EField label="TIME *">
                                    <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </EField>
                            </div>

                            <EField label="LOCATION *">
                                <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                    placeholder="e.g. Nile University Hall B / Online (Zoom)"
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                            </EField>

                            <EField label="DESCRIPTION *">
                                <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Describe the event — who it's for, what to expect..."
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all resize-none" />
                            </EField>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setForm(EMPTY_FORM)}
                                    className="px-5 py-3.5 border-[2px] border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all">
                                    CLEAR
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-3.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#6CBB56] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    {submitting ? 'CREATING...' : 'CREATE EVENT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white border-[3px] border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 border-2 border-red-400 rounded-xl flex items-center justify-center">
                                <Trash2 size={16} className="text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase">Delete Event?</p>
                                <p className="text-[8px] font-black text-black/40 uppercase">THIS CANNOT BE UNDONE</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 border-[2px] border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all">CANCEL</button>
                            <button onClick={() => handleDelete(confirmDelete)} disabled={actionLoading[confirmDelete]}
                                className="flex-1 py-3 bg-red-500 text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {actionLoading[confirmDelete] ? <Loader2 size={12} className="animate-spin" /> : null}
                                DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const EventCard = ({ event, onStatusChange, onFeatureToggle, onDeleteRequest, actionLoading }: {
    event: StaffEvent;
    onStatusChange: (e: StaffEvent, s: string) => void;
    onFeatureToggle: (e: StaffEvent) => void;
    onDeleteRequest: () => void;
    actionLoading: Record<string, boolean>;
}) => {
    const [showActions, setShowActions] = useState(false);
    const catColor = categoryColors[event.category] || categoryColors.other;
    const stColor = statusColors[event.status] || statusColors.pending;
    const regPct = event.capacity > 0 ? Math.min(100, Math.round((event.registrations_count / event.capacity) * 100)) : 0;
    const isFull = regPct >= 100;

    return (
        <div className="bg-white border-[2px] border-black rounded-[24px] p-5 md:p-6 flex flex-col gap-5 hover:translate-y-[-2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(30,73,157,0.3)] transition-all relative">
            {/* Featured badge */}
            {event.is_featured && (
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Star size={12} className="text-black" fill="currentColor" />
                </div>
            )}

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${catColor}`}>
                            {event.category.replace('_', ' ')}
                        </span>
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${stColor}`}>
                            {event.status}
                        </span>
                    </div>
                    <h3 className="font-black text-sm md:text-base uppercase text-black leading-tight truncate">{event.title}</h3>
                </div>
                <div className="relative flex-shrink-0">
                    <button onClick={() => setShowActions(v => !v)}
                        className="p-2 border-[2px] border-black/10 rounded-xl hover:border-black transition-colors">
                        <ChevronDown size={13} strokeWidth={3} className={`transition-transform ${showActions ? 'rotate-180' : ''}`} />
                    </button>
                    {showActions && (
                        <div className="absolute right-0 top-full mt-1.5 bg-white border-[2px] border-black rounded-[16px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 min-w-[160px] overflow-hidden" onClick={e => e.stopPropagation()}>
                            {event.status !== 'published' && (
                                <ActionBtn label="PUBLISH" onClick={() => { onStatusChange(event, 'published'); setShowActions(false); }} color="text-nile-green" />
                            )}
                            {event.status !== 'cancelled' && (
                                <ActionBtn label="CANCEL EVENT" onClick={() => { onStatusChange(event, 'cancelled'); setShowActions(false); }} color="text-red-500" />
                            )}
                            <ActionBtn
                                label={event.is_featured ? 'UNFEATURE' : 'FEATURE'}
                                onClick={() => { onFeatureToggle(event); setShowActions(false); }}
                                color="text-yellow-600"
                            />
                            <ActionBtn label="DELETE" onClick={() => { onDeleteRequest(); setShowActions(false); }} color="text-red-600" />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2.5 text-[9px] font-black text-black/50 uppercase">
                <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-nile-blue flex-shrink-0" />
                    <span>{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-nile-green flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                </div>
            </div>

            {/* Registration bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-black uppercase text-black/40">
                    <span className="flex items-center gap-1"><Users size={10} />{event.registrations_count} / {event.capacity} REGISTERED</span>
                    <span className={isFull ? 'text-red-500' : ''}>{regPct}% {isFull ? '· FULL' : ''}</span>
                </div>
                <div className="h-2 bg-nile-white border-[1.5px] border-black rounded-full overflow-hidden p-0.5">
                    <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${regPct}%`, background: regPct >= 90 ? '#ef4444' : regPct >= 70 ? '#ca8a04' : '#6CBB56' }} />
                </div>
            </div>

            {event.description && (
                <p className="text-[9px] font-bold text-black/40 leading-relaxed line-clamp-2">{event.description}</p>
            )}

            {event.status === 'pending' && (
                <button onClick={() => onStatusChange(event, 'published')} disabled={actionLoading[event.id]}
                    className="w-full py-2.5 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {actionLoading[event.id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} strokeWidth={3} />}
                    PUBLISH EVENT
                </button>
            )}
        </div>
    );
};

const ActionBtn = ({ label, onClick, color }: { label: string; onClick: () => void; color: string }) => (
    <button onClick={onClick}
        className={`w-full text-left px-4 py-3 font-black text-[9px] uppercase tracking-widest hover:bg-black/5 transition-colors ${color}`}>
        {label}
    </button>
);

const EField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-black/50">{label}</label>
        {children}
    </div>
);

export default StaffEvents;
