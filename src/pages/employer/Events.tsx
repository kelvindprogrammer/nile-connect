import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, MapPin, Users, Send, Loader2, Clock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getEvents, createEvent, StaffEvent, CreateEventRequest } from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';

type Tab = 'ALL EVENTS' | 'MY EVENTS' | 'CREATE';

const categoryColors: Record<string, string> = {
    career_fair: 'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    workshop:    'bg-purple-50 text-purple-600 border-purple-200',
    networking:  'bg-nile-green/10 text-nile-green border-nile-green/20',
    webinar:     'bg-yellow-50 text-yellow-600 border-yellow-200',
    seminar:     'bg-orange-50 text-orange-500 border-orange-200',
    other:       'bg-black/5 text-black/50 border-black/10',
};

const EMPTY_FORM: CreateEventRequest = {
    title: '', category: 'networking', date: '', time: '09:00',
    location: '', description: '', capacity: 50,
};

const EmployerEvents = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('ALL EVENTS');
    const [events, setEvents] = useState<StaffEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<CreateEventRequest>(EMPTY_FORM);

    const load = useCallback(async () => {
        setLoading(true);
        try { setEvents(await getEvents()); }
        catch { showToast('Failed to load events.', 'error'); }
        finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const myEvents = user?.id ? events.filter(e => e.organiser_id === user.id) : [];
    const displayed = tab === 'MY EVENTS' ? myEvents : events;
    const upcoming = displayed.filter(e => new Date(e.date) >= new Date() && e.status !== 'cancelled');
    const past = displayed.filter(e => new Date(e.date) < new Date() || e.status === 'cancelled');

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
            showToast('Event submitted for approval!', 'success');
            setTab('MY EVENTS');
        } catch {
            showToast('Failed to create event.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-12 bg-black/5 rounded-2xl w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-48 bg-black/5 rounded-[24px]" />)}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Events .</h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                        CAMPUS EVENTS · {upcoming.length} UPCOMING
                    </p>
                </div>
                <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm">
                    {(['ALL EVENTS', 'MY EVENTS', 'CREATE'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap
                                ${tab === t ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}>
                            {t === 'CREATE' && <Plus size={11} strokeWidth={3} />}
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Events list ─────────────────────────────── */}
            {tab !== 'CREATE' && (
                <div className="space-y-8 anime-fade-in">
                    {tab === 'MY EVENTS' && myEvents.length === 0 && (
                        <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
                            <Calendar size={28} className="text-black/15 mx-auto mb-4" />
                            <p className="text-[9px] font-black text-black/30 uppercase">You haven't created any events yet</p>
                            <button onClick={() => setTab('CREATE')}
                                className="mt-5 px-5 py-2.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                                <Plus size={11} className="inline mr-1.5" /> CREATE EVENT
                            </button>
                        </div>
                    )}

                    {upcoming.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-black/40">UPCOMING</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcoming.map(e => <EventCard key={e.id} event={e} />)}
                            </div>
                        </div>
                    )}

                    {past.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-black/30">PAST / CANCELLED</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                                {past.map(e => <EventCard key={e.id} event={e} />)}
                            </div>
                        </div>
                    )}

                    {displayed.length === 0 && tab === 'ALL EVENTS' && (
                        <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
                            <Calendar size={28} className="text-black/15 mx-auto mb-4" />
                            <p className="text-[9px] font-black text-black/30 uppercase">No events on the platform yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Create form ─────────────────────────────── */}
            {tab === 'CREATE' && (
                <div className="max-w-2xl anime-fade-in">
                    <div className="bg-white border-[2px] border-black rounded-[28px] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3 mb-6 pb-5 border-b-[2px] border-black/5">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                <Calendar size={18} className="text-nile-green" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase">Create Event</h3>
                                <p className="text-[8px] font-black text-black/40 uppercase">SUBMITTED FOR STAFF APPROVAL</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-5">
                            <F label="EVENT TITLE *">
                                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Tech Talent Info Session"
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                            </F>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <F label="CATEGORY">
                                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none bg-white cursor-pointer">
                                        <option value="networking">Networking</option>
                                        <option value="career_fair">Career Fair</option>
                                        <option value="workshop">Workshop</option>
                                        <option value="webinar">Webinar</option>
                                        <option value="seminar">Seminar</option>
                                        <option value="other">Other</option>
                                    </select>
                                </F>
                                <F label="CAPACITY">
                                    <input type="number" min={1} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </F>
                                <F label="DATE *">
                                    <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </F>
                                <F label="TIME *">
                                    <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </F>
                            </div>
                            <F label="LOCATION *">
                                <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                    placeholder="e.g. Nile University Hall A / Online (Teams)"
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                            </F>
                            <F label="DESCRIPTION *">
                                <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Describe your event and what attendees will gain..."
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all resize-none" />
                            </F>
                            <button type="submit" disabled={submitting}
                                className="w-full py-4 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#6CBB56] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {submitting ? 'SUBMITTING...' : 'SUBMIT FOR APPROVAL'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const EventCard = ({ event }: { event: StaffEvent }) => {
    const catColor = categoryColors[event.category] || categoryColors.other;
    const regPct = event.capacity > 0 ? Math.min(100, Math.round((event.registrations_count / event.capacity) * 100)) : 0;
    return (
        <div className="bg-white border-[2px] border-black rounded-[24px] p-5 flex flex-col gap-4 hover:translate-y-[-1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(30,73,157,0.3)] transition-all">
            <div className="flex flex-wrap gap-2">
                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${catColor}`}>{event.category.replace('_', ' ')}</span>
                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${event.status === 'published' ? 'bg-nile-green/20 text-nile-green border-nile-green/30' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}`}>
                    {event.status}
                </span>
            </div>
            <h3 className="font-black text-sm uppercase leading-tight">{event.title}</h3>
            <div className="space-y-1.5 text-[8px] font-black text-black/50 uppercase">
                <div className="flex items-center gap-2">
                    <Calendar size={10} className="text-nile-blue" />
                    <span>{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin size={10} className="text-nile-green" />
                    <span className="truncate">{event.location}</span>
                </div>
            </div>
            <div className="space-y-1.5">
                <div className="flex justify-between text-[7px] font-black uppercase text-black/40">
                    <span className="flex items-center gap-1"><Users size={9} />{event.registrations_count}/{event.capacity}</span>
                    <span>{regPct}%</span>
                </div>
                <div className="h-1.5 bg-nile-white border border-black/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${regPct}%`, background: regPct >= 90 ? '#ef4444' : '#6CBB56' }} />
                </div>
            </div>
        </div>
    );
};

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-black/50">{label}</label>
        {children}
    </div>
);

export default EmployerEvents;
