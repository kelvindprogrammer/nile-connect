import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Calendar, Plus, Star, Trash2, Loader2, MapPin, Users, Clock,
    Search, X, CheckCircle2, XCircle, Globe, ChevronDown, Send,
    LayoutGrid, Zap, Award, Radio, BookOpen, Coffee, Code2,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventCategory =
    | 'Career Fair'
    | 'Workshop'
    | 'Networking'
    | 'Webinar'
    | 'Info Session'
    | 'Alumni Meetup'
    | 'Hackathon';

type EventStatus = 'pending' | 'published' | 'upcoming' | 'past' | 'cancelled';
type StatusTab   = 'ALL' | 'UPCOMING' | 'PAST' | 'CANCELLED';

interface NileEvent {
    id:                 string;
    title:              string;
    category:           EventCategory;
    date:               string;   // ISO date string
    time:               string;   // e.g. "14:30"
    location:           string;
    description:        string;
    capacity:           number;
    registrations_count: number;
    is_featured:        boolean;
    status:             EventStatus;
    organiser_type:     'staff' | 'employer';
}

interface FormState {
    title:       string;
    category:    EventCategory;
    date:        string;
    time:        string;
    location:    string;
    description: string;
    capacity:    number | '';
    is_featured: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: EventCategory[] = [
    'Career Fair', 'Workshop', 'Networking', 'Webinar',
    'Info Session', 'Alumni Meetup', 'Hackathon',
];

const CATEGORY_STYLES: Record<EventCategory, { tag: string; bar: string; icon: React.ReactNode }> = {
    'Career Fair':   { tag: 'bg-nile-blue/10 text-nile-blue border-nile-blue/30',        bar: '#1E499D', icon: <LayoutGrid size={11} /> },
    'Workshop':      { tag: 'bg-purple-50 text-purple-600 border-purple-200',             bar: '#9333ea', icon: <BookOpen size={11} /> },
    'Networking':    { tag: 'bg-nile-green/10 text-nile-green border-nile-green/30',      bar: '#6CBB56', icon: <Coffee size={11} /> },
    'Webinar':       { tag: 'bg-orange-50 text-orange-500 border-orange-200',             bar: '#f97316', icon: <Radio size={11} /> },
    'Info Session':  { tag: 'bg-yellow-50 text-yellow-600 border-yellow-200',             bar: '#ca8a04', icon: <Zap size={11} /> },
    'Alumni Meetup': { tag: 'bg-pink-50 text-pink-600 border-pink-200',                   bar: '#ec4899', icon: <Award size={11} /> },
    'Hackathon':     { tag: 'bg-black text-white border-black',                           bar: '#000000', icon: <Code2 size={11} /> },
};

const STATUS_STYLES: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-600 border-yellow-200',
    published: 'bg-nile-green/20 text-nile-green border-nile-green/30',
    upcoming:  'bg-nile-blue/10 text-nile-blue border-nile-blue/30',
    past:      'bg-black/5 text-black/40 border-black/10',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
};

const EMPTY_FORM: FormState = {
    title:       '',
    category:    'Career Fair',
    date:        '',
    time:        '09:00',
    location:    '',
    description: '',
    capacity:    100,
    is_featured: false,
};

const STATUS_TABS: StatusTab[] = ['ALL', 'UPCOMING', 'PAST', 'CANCELLED'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getEffectiveStatus(event: NileEvent): 'upcoming' | 'past' | 'cancelled' | 'pending' | 'published' {
    if (event.status === 'cancelled') return 'cancelled';
    const eventDate = new Date(`${event.date}T${event.time || '00:00'}`);
    if (isNaN(eventDate.getTime())) return event.status;
    return eventDate > new Date() ? 'upcoming' : 'past';
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const StaffEvents: React.FC = () => {
    const { showToast } = useToast();

    const [events,         setEvents]         = useState<NileEvent[]>([]);
    const [loading,        setLoading]         = useState(true);
    const [actionLoading,  setActionLoading]   = useState<Record<string, boolean>>({});
    const [submitting,     setSubmitting]      = useState(false);
    const [statusTab,      setStatusTab]       = useState<StatusTab>('ALL');
    const [search,         setSearch]          = useState('');
    const [form,           setForm]            = useState<FormState>(EMPTY_FORM);
    const [confirmDelete,  setConfirmDelete]   = useState<string | null>(null);
    const [showMobileForm, setShowMobileForm]  = useState(false);
    const [openActionId,   setOpenActionId]    = useState<string | null>(null);
    const actionMenuRef                        = useRef<HTMLDivElement>(null);

    // ── Close action dropdown on outside click ───────────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
                setOpenActionId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Load events ──────────────────────────────────────────────────────────
    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/api/events');
            const events: NileEvent[] = data?.data?.events ?? [];
            setEvents(events);
        } catch {
            showToast('Failed to load events.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    // ── Derived stats ────────────────────────────────────────────────────────
    const now              = new Date();
    const upcomingEvents   = events.filter(e => e.status !== 'cancelled' && new Date(e.date) >= now);
    const totalRegs        = events.reduce((sum, e) => sum + (e.registrations_count ?? 0), 0);

    // ── Filtered list ────────────────────────────────────────────────────────
    const filteredEvents = events.filter(event => {
        const effectiveStatus = getEffectiveStatus(event);
        if (statusTab === 'UPCOMING'  && effectiveStatus !== 'upcoming')  return false;
        if (statusTab === 'PAST'      && effectiveStatus !== 'past')      return false;
        if (statusTab === 'CANCELLED' && event.status !== 'cancelled')    return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                event.title.toLowerCase().includes(q)    ||
                event.category.toLowerCase().includes(q) ||
                event.location.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── Actions ──────────────────────────────────────────────────────────────
    const setAction = (id: string, val: boolean) =>
        setActionLoading(p => ({ ...p, [id]: val }));

    const handleStatusChange = async (event: NileEvent, status: string) => {
        const key = `status_${event.id}`;
        setAction(key, true);
        try {
            await apiClient.put(`/api/events?id=${event.id}`, { status });
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: status as EventStatus } : e));
            showToast(`Event ${status}.`, 'success');
        } catch {
            showToast('Update failed.', 'error');
        } finally {
            setAction(key, false);
            setOpenActionId(null);
        }
    };

    const handleFeatureToggle = async (event: NileEvent) => {
        const key = `feat_${event.id}`;
        setAction(key, true);
        try {
            await apiClient.put(`/api/events?id=${event.id}`, { is_featured: !event.is_featured });
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_featured: !e.is_featured } : e));
            showToast(event.is_featured ? 'Removed from featured.' : 'Marked as featured!', 'success');
        } catch {
            showToast('Update failed.', 'error');
        } finally {
            setAction(key, false);
            setOpenActionId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setAction(id, true);
        try {
            await apiClient.delete(`/api/events?id=${id}`);
            setEvents(prev => prev.filter(e => e.id !== id));
            setConfirmDelete(null);
            showToast('Event deleted.', 'success');
        } catch {
            showToast('Delete failed.', 'error');
        } finally {
            setAction(id, false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.date || !form.location.trim() || !form.description.trim()) {
            showToast('Fill in all required fields.', 'error');
            return;
        }
        if (!form.capacity || Number(form.capacity) < 1) {
            showToast('Capacity must be at least 1.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await apiClient.post('/api/events', {
                title:       form.title.trim(),
                category:    form.category,
                date:        new Date(form.date),
                time:        form.time,
                location:    form.location.trim(),
                description: form.description.trim(),
                capacity:    Number(form.capacity),
                is_featured: form.is_featured,
            });
            const created: NileEvent = data?.data ?? data;
            setEvents(prev => [created, ...prev]);
            setForm(EMPTY_FORM);
            setShowMobileForm(false);
            showToast('Event created!', 'success');
        } catch {
            showToast('Failed to create event.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-14 bg-black/5 rounded-2xl w-80" />
            <div className="flex gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-black/5 rounded-2xl flex-1" />)}
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-9 bg-black/5 rounded-xl w-24" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-60 bg-black/5 rounded-[24px]" />)}
            </div>
        </div>
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-8 pb-24 space-y-8 anime-fade-in font-sans text-left min-h-full">

            {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
            <div className="border-b-[2px] border-black pb-6">
                <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">
                    Events .
                </h2>
                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                    MANAGE CAMPUS EVENTS · CAREER FAIRS · WORKSHOPS · NETWORKING
                </p>
            </div>

            {/* ── STATS HEADER ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <StatCard
                    label="TOTAL EVENTS"
                    value={events.length}
                    icon={<Calendar size={18} />}
                    color="bg-black text-white"
                    shadowColor="rgba(108,187,86,1)"
                />
                <StatCard
                    label="UPCOMING"
                    value={upcomingEvents.length}
                    icon={<Clock size={18} />}
                    color="bg-nile-blue/10 text-nile-blue"
                    shadowColor="rgba(30,73,157,0.4)"
                />
                <StatCard
                    label="REGISTRATIONS"
                    value={totalRegs}
                    icon={<Users size={18} />}
                    color="bg-nile-green/10 text-nile-green"
                    shadowColor="rgba(108,187,86,0.5)"
                />
            </div>

            {/* ── MAIN TWO-COLUMN LAYOUT ────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* ── CREATE FORM (left 1/3, hidden on mobile unless toggled) ── */}
                <aside className="hidden lg:block w-full lg:w-1/3 lg:sticky lg:top-6 flex-shrink-0">
                    <CreateEventForm
                        form={form}
                        setForm={setForm}
                        onSubmit={handleCreate}
                        submitting={submitting}
                    />
                </aside>

                {/* ── EVENTS LIST (right 2/3) ──────────────────────────────── */}
                <section className="flex-1 min-w-0 space-y-5">

                    {/* Status filter + search bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Status tabs */}
                        <div className="flex bg-white p-1 border-[2px] border-black rounded-xl gap-0.5 flex-shrink-0">
                            {STATUS_TABS.map(tab => {
                                const count = tab === 'ALL'
                                    ? events.length
                                    : tab === 'UPCOMING'
                                        ? events.filter(e => getEffectiveStatus(e) === 'upcoming').length
                                        : tab === 'PAST'
                                            ? events.filter(e => getEffectiveStatus(e) === 'past').length
                                            : events.filter(e => e.status === 'cancelled').length;

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setStatusTab(tab)}
                                        className={`px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5
                                            ${statusTab === tab
                                                ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]'
                                                : 'text-black/40 hover:text-black'}`}
                                    >
                                        {tab}
                                        <span className={`text-[7px] px-1 py-0.5 rounded-full font-black ${
                                            statusTab === tab ? 'bg-white/20 text-white' : 'bg-black/5 text-black/30'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH EVENTS..."
                                className="w-full pl-9 pr-9 py-2.5 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white/60 focus:bg-white transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results count */}
                    {(search || statusTab !== 'ALL') && (
                        <p className="text-[8px] font-black text-black/30 uppercase tracking-widest">
                            {filteredEvents.length} RESULT{filteredEvents.length !== 1 ? 'S' : ''} FOUND
                        </p>
                    )}

                    {/* Empty state */}
                    {filteredEvents.length === 0 ? (
                        <div className="py-24 border-[2px] border-dashed border-black/10 rounded-[32px] flex flex-col items-center justify-center text-center gap-4 anime-fade-in">
                            <Calendar size={36} className="text-black/15" />
                            <div>
                                <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">
                                    {search ? 'No events match your search' : `No ${statusTab.toLowerCase()} events`}
                                </p>
                                {!search && statusTab === 'ALL' && (
                                    <p className="text-[8px] font-black text-black/20 uppercase tracking-widest mt-1">
                                        USE THE FORM TO CREATE YOUR FIRST EVENT
                                    </p>
                                )}
                            </div>
                            {!search && statusTab === 'ALL' && (
                                <button
                                    onClick={() => setShowMobileForm(true)}
                                    className="lg:hidden flex items-center gap-2 px-5 py-2.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all"
                                >
                                    <Plus size={12} strokeWidth={3} /> CREATE EVENT
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {filteredEvents.map((event, idx) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    onStatusChange={handleStatusChange}
                                    onFeatureToggle={handleFeatureToggle}
                                    onDeleteRequest={() => setConfirmDelete(event.id)}
                                    actionLoading={actionLoading}
                                    openActionId={openActionId}
                                    setOpenActionId={setOpenActionId}
                                    menuRef={idx === 0 ? actionMenuRef : undefined}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ── MOBILE FAB: show form ─────────────────────────────────────── */}
            <button
                onClick={() => setShowMobileForm(true)}
                className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-black text-white border-[2px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#6CBB56] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all"
                aria-label="Create event"
            >
                <Plus size={22} strokeWidth={2.5} />
            </button>

            {/* ── MOBILE FORM MODAL ─────────────────────────────────────────── */}
            {showMobileForm && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowMobileForm(false)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[24px]"
                        onClick={e => e.stopPropagation()}
                    >
                        <CreateEventForm
                            form={form}
                            setForm={setForm}
                            onSubmit={handleCreate}
                            submitting={submitting}
                            onClose={() => setShowMobileForm(false)}
                        />
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM MODAL ──────────────────────────────────────── */}
            {confirmDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setConfirmDelete(null)}
                >
                    <div
                        className="bg-white border-[3px] border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-6 space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 border-[2px] border-red-400 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Trash2 size={16} className="text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase">Delete Event?</p>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-0.5">THIS CANNOT BE UNDONE</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-3 border-[2px] border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                disabled={actionLoading[confirmDelete]}
                                className="flex-1 py-3 bg-red-500 text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {actionLoading[confirmDelete]
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : <Trash2 size={12} />
                                }
                                DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Create Event Form
// ---------------------------------------------------------------------------

interface CreateEventFormProps {
    form:       FormState;
    setForm:    React.Dispatch<React.SetStateAction<FormState>>;
    onSubmit:   (e: React.FormEvent) => void;
    submitting: boolean;
    onClose?:   () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ form, setForm, onSubmit, submitting, onClose }) => {
    const f = <K extends keyof FormState>(key: K, val: FormState[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div className="bg-white border-[2px] border-black rounded-[28px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Form header */}
            <div className="flex items-center justify-between gap-3 p-5 border-b-[2px] border-black bg-black">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-nile-green rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar size={15} className="text-white" />
                    </div>
                    <div>
                        <p className="font-black text-[10px] uppercase tracking-widest text-white leading-none">CREATE EVENT</p>
                        <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-0.5">CAREER SERVICES STAFF</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Form body */}
            <form onSubmit={onSubmit} className="p-5 space-y-4">

                {/* Title */}
                <FormField label="EVENT TITLE *">
                    <input
                        type="text"
                        value={form.title}
                        onChange={e => f('title', e.target.value)}
                        placeholder="e.g. Fall Career Fair 2026"
                        className="input-brutalist"
                    />
                </FormField>

                {/* Category */}
                <FormField label="CATEGORY">
                    <div className="relative">
                        <select
                            value={form.category}
                            onChange={e => f('category', e.target.value as EventCategory)}
                            className="input-brutalist appearance-none pr-8 cursor-pointer"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
                    </div>
                </FormField>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="DATE *">
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => f('date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="input-brutalist"
                        />
                    </FormField>
                    <FormField label="TIME *">
                        <input
                            type="time"
                            value={form.time}
                            onChange={e => f('time', e.target.value)}
                            className="input-brutalist"
                        />
                    </FormField>
                </div>

                {/* Location */}
                <FormField label="LOCATION *">
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => f('location', e.target.value)}
                            placeholder="e.g. Nile University Hall B"
                            className="input-brutalist"
                        />
                        <button
                            type="button"
                            onClick={() => f('location', 'Virtual / Online')}
                            className="flex items-center gap-1.5 text-[8px] font-black uppercase text-nile-blue hover:underline tracking-widest"
                        >
                            <Globe size={10} /> SET AS VIRTUAL / ONLINE
                        </button>
                    </div>
                </FormField>

                {/* Description */}
                <FormField label="DESCRIPTION *">
                    <textarea
                        rows={3}
                        value={form.description}
                        onChange={e => f('description', e.target.value)}
                        placeholder="Who is this for? What to expect..."
                        className="input-brutalist resize-none"
                    />
                </FormField>

                {/* Capacity */}
                <FormField label="CAPACITY *">
                    <input
                        type="number"
                        min={1}
                        value={form.capacity}
                        onChange={e => f('capacity', e.target.value === '' ? '' : Number(e.target.value))}
                        className="input-brutalist"
                    />
                </FormField>

                {/* Featured toggle */}
                <div className="flex items-center justify-between py-2 px-3 border-[2px] border-black/10 rounded-xl hover:border-black/20 transition-colors">
                    <div>
                        <p className="font-black text-[9px] uppercase tracking-widest">FEATURED EVENT</p>
                        <p className="text-[7px] font-black text-black/30 uppercase mt-0.5">SHOW ON HOMEPAGE SPOTLIGHT</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => f('is_featured', !form.is_featured)}
                        className={`relative w-10 h-5 rounded-full border-[2px] border-black transition-colors flex-shrink-0 ${
                            form.is_featured ? 'bg-nile-green' : 'bg-black/10'
                        }`}
                        aria-label="Toggle featured"
                    >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white border-[1.5px] border-black rounded-full transition-all ${
                            form.is_featured ? 'left-[18px]' : 'left-0.5'
                        }`} />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => setForm(EMPTY_FORM)}
                        className="px-4 py-3 border-[2px] border-black rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                        CLEAR
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all disabled:opacity-40"
                    >
                        {submitting
                            ? <><Loader2 size={12} className="animate-spin" /> CREATING...</>
                            : <><Send size={12} /> CREATE EVENT</>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Event Card
// ---------------------------------------------------------------------------

interface EventCardProps {
    event:          NileEvent;
    style?:         React.CSSProperties;
    onStatusChange: (event: NileEvent, status: string) => void;
    onFeatureToggle:(event: NileEvent) => void;
    onDeleteRequest:() => void;
    actionLoading:  Record<string, boolean>;
    openActionId:   string | null;
    setOpenActionId:(id: string | null) => void;
    menuRef?:       React.RefObject<HTMLDivElement>;
}

const EventCard: React.FC<EventCardProps> = ({
    event, style, onStatusChange, onFeatureToggle, onDeleteRequest,
    actionLoading, openActionId, setOpenActionId, menuRef,
}) => {
    const catStyle      = CATEGORY_STYLES[event.category] ?? CATEGORY_STYLES['Career Fair'];
    const effectiveStatus = getEffectiveStatus(event);
    const statusClass   = STATUS_STYLES[effectiveStatus] ?? STATUS_STYLES.pending;
    const regPct        = event.capacity > 0
        ? Math.min(100, Math.round(((event.registrations_count ?? 0) / event.capacity) * 100))
        : 0;
    const isFull        = regPct >= 100;
    const isOpen        = openActionId === event.id;

    const statusKey     = `status_${event.id}`;
    const featKey       = `feat_${event.id}`;
    const anyLoading    = actionLoading[statusKey] || actionLoading[featKey];

    const regBarColor   = regPct >= 90 ? '#ef4444' : regPct >= 70 ? '#ca8a04' : catStyle.bar;

    return (
        <div
            style={style}
            className="relative bg-white border-[2px] border-black rounded-[24px] p-5 flex flex-col gap-4
                       shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)]
                       hover:shadow-[4px_4px_0px_0px_rgba(30,73,157,0.25)]
                       hover:-translate-y-[2px] transition-all duration-200 anime-fade-in"
        >
            {/* Featured badge */}
            {event.is_featured && (
                <div className="absolute -top-2.5 -right-2.5 w-8 h-8 bg-yellow-400 border-[2px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Star size={13} className="text-black" fill="currentColor" />
                </div>
            )}

            {/* Top row: tags + action menu */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {/* Category tag */}
                    <span className={`inline-flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${catStyle.tag}`}>
                        {catStyle.icon} {event.category}
                    </span>
                    {/* Status tag */}
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusClass}`}>
                        {effectiveStatus}
                    </span>
                    {/* Organiser type */}
                    {event.organiser_type === 'employer' && (
                        <span className="text-[7px] font-black px-2 py-0.5 rounded-full border uppercase bg-purple-50 text-purple-600 border-purple-200">
                            EMPLOYER
                        </span>
                    )}
                </div>

                {/* Action dropdown */}
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button
                        onClick={() => setOpenActionId(isOpen ? null : event.id)}
                        disabled={!!anyLoading}
                        className="p-1.5 border-[2px] border-black/10 rounded-xl hover:border-black transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                        {anyLoading
                            ? <Loader2 size={12} className="animate-spin" />
                            : <ChevronDown size={12} strokeWidth={3} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        }
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 top-full mt-1.5 bg-white border-[2px] border-black rounded-[16px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 min-w-[170px] overflow-hidden">
                            {effectiveStatus !== 'cancelled' && event.status !== 'published' && (
                                <DropdownItem
                                    label="PUBLISH"
                                    icon={<CheckCircle2 size={11} />}
                                    color="text-nile-green"
                                    onClick={() => onStatusChange(event, 'published')}
                                />
                            )}
                            {event.organiser_type === 'employer' && effectiveStatus !== 'cancelled' && (
                                <DropdownItem
                                    label="APPROVE"
                                    icon={<CheckCircle2 size={11} />}
                                    color="text-nile-blue"
                                    onClick={() => onStatusChange(event, 'published')}
                                />
                            )}
                            {effectiveStatus !== 'cancelled' && (
                                <DropdownItem
                                    label="CANCEL EVENT"
                                    icon={<XCircle size={11} />}
                                    color="text-red-500"
                                    onClick={() => onStatusChange(event, 'cancelled')}
                                />
                            )}
                            <DropdownItem
                                label={event.is_featured ? 'UNFEATURE' : 'FEATURE'}
                                icon={<Star size={11} fill={event.is_featured ? 'currentColor' : 'none'} />}
                                color="text-yellow-600"
                                onClick={() => onFeatureToggle(event)}
                            />
                            <div className="border-t border-black/10 mt-0.5">
                                <DropdownItem
                                    label="DELETE"
                                    icon={<Trash2 size={11} />}
                                    color="text-red-600"
                                    onClick={() => { onDeleteRequest(); setOpenActionId(null); }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Title */}
            <h3 className="font-black text-sm uppercase text-black leading-tight line-clamp-2 -mt-1">
                {event.title}
            </h3>

            {/* Date / time / location */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[9px] font-black text-black/50 uppercase">
                    <Calendar size={12} className="text-nile-blue flex-shrink-0" />
                    <span>{formatDate(event.date)}</span>
                    <span className="text-black/20">·</span>
                    <Clock size={11} className="text-black/30 flex-shrink-0" />
                    <span>{formatTime(event.time)}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-black/50 uppercase">
                    {event.location.toLowerCase().includes('virtual') || event.location.toLowerCase().includes('online')
                        ? <Globe size={12} className="text-nile-green flex-shrink-0" />
                        : <MapPin size={12} className="text-nile-green flex-shrink-0" />
                    }
                    <span className="truncate">{event.location}</span>
                </div>
            </div>

            {/* Capacity / registration bar */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[8px] font-black uppercase">
                    <span className="flex items-center gap-1 text-black/40">
                        <Users size={10} />
                        {event.registrations_count ?? 0} / {event.capacity} REGISTERED
                    </span>
                    <span className={isFull ? 'text-red-500' : 'text-black/30'}>
                        {regPct}%{isFull ? ' · FULL' : ''}
                    </span>
                </div>
                <div className="h-2 bg-black/5 border-[1.5px] border-black rounded-full overflow-hidden p-[1.5px]">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${regPct}%`, background: regBarColor }}
                    />
                </div>
            </div>

            {/* Description snippet */}
            {event.description && (
                <p className="text-[8px] font-bold text-black/35 leading-relaxed line-clamp-2">
                    {event.description}
                </p>
            )}

            {/* Quick-publish CTA for pending events */}
            {(event.status === 'pending') && (
                <button
                    onClick={() => onStatusChange(event, 'published')}
                    disabled={!!actionLoading[statusKey]}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[8px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
                >
                    {actionLoading[statusKey]
                        ? <Loader2 size={11} className="animate-spin" />
                        : <CheckCircle2 size={11} strokeWidth={3} />
                    }
                    PUBLISH EVENT
                </button>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatCard: React.FC<{
    label:       string;
    value:       number;
    icon:        React.ReactNode;
    color:       string;
    shadowColor: string;
}> = ({ label, value, icon, color, shadowColor }) => {
    const isDark = color.includes('bg-black');
    return (
        <div
            className={`border-[2px] border-black rounded-[20px] p-4 md:p-5 ${isDark ? color : `bg-white`}`}
            style={{ boxShadow: `3px 3px 0px 0px ${shadowColor}` }}
        >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-white/10' : color}`}>
                {icon}
            </div>
            <p className={`text-2xl md:text-3xl font-black leading-none ${isDark ? 'text-white' : ''}`}>
                {value.toLocaleString()}
            </p>
            <p className={`text-[7px] font-black uppercase tracking-[0.2em] mt-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                {label}
            </p>
        </div>
    );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-[7px] font-black uppercase tracking-widest text-black/40">{label}</label>
        {children}
    </div>
);

const DropdownItem: React.FC<{
    label:   string;
    icon:    React.ReactNode;
    color:   string;
    onClick: () => void;
}> = ({ label, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 font-black text-[8px] uppercase tracking-widest hover:bg-black/5 transition-colors text-left ${color}`}
    >
        {icon} {label}
    </button>
);

export default StaffEvents;
