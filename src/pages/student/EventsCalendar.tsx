import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, CalendarDays, Clock, Users, ArrowRight, Loader2, Check, Plus, AlertCircle, Hourglass } from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import {
    listEvents, registerForEvent, cancelRegistration, suggestEvent,
    EVENT_CATEGORIES, categoryLabel,
    type NileEvent, type CategoryOption,
} from '../../services/eventService';

const catColors: Record<string, string> = {
    career_fair: 'bg-nile-blue/10 text-nile-blue',
    workshop: 'bg-purple-50 text-purple-600',
    networking: 'bg-nile-green/10 text-nile-green',
    webinar: 'bg-orange-50 text-orange-500',
    seminar: 'bg-gray-100 text-gray-500',
    info_session: 'bg-yellow-50 text-yellow-600',
    alumni_meetup: 'bg-pink-50 text-pink-600',
    hackathon: 'bg-gray-900 text-white',
    tech_talk: 'bg-nile-blue/10 text-nile-blue',
    other: 'bg-gray-100 text-gray-500',
};

function formatDate(dateStr: string): string {
    if (!dateStr || dateStr.startsWith('0001')) return 'Date TBA';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Date TBA';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const ALL = 'all';

const EventsCalendar = () => {
    const { showToast } = useToast();

    const [active, setActive] = useState(ALL);
    const [events, setEvents] = useState<NileEvent[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    // Per-event in-flight flag so a slow request disables only its own button
    // rather than the whole page, and a double click cannot fire twice.
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [showSuggest, setShowSuggest] = useState(false);
    const [confirmation, setConfirmation] = useState<NileEvent | null>(null);

    // Bumped to re-run the fetch. Keeping the request inside the effect (with
    // a cancellation flag) means a reload that resolves after the user has
    // navigated away cannot write to an unmounted component, and a second
    // reload started before the first returns cannot apply stale results.
    const [reloadToken, setReloadToken] = useState(0);
    const reload = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        // Categories come back with the list, so the tab strip always reflects
        // the events actually on screen. Filtering then stays client-side over
        // that single fetch, which keeps tab switching instant.
        listEvents()
            .then(res => {
                if (cancelled) return;
                setEvents(res.events);
                setCategories(res.categories);
                setLoadError(null);
            })
            .catch(err => {
                if (cancelled) return;
                setLoadError(getErrorMessage(err, 'We could not load events. Check your connection and try again.'));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [reloadToken]);

    const tabs = useMemo(
        () => [{ value: ALL, label: 'All', count: events.filter(e => e.status === 'published').length }, ...categories],
        [categories, events],
    );

    // Derived rather than stored: if the selected category stops existing —
    // its last event was cancelled while the page was open — the view falls
    // back to All instead of stranding the user on a permanently empty tab.
    const activeTab = active !== ALL && !categories.some(c => c.value === active) ? ALL : active;

    const filtered = useMemo(
        () => events.filter(e => activeTab === ALL || e.category === activeTab),
        [events, activeTab],
    );

    const featured = filtered.find(e => e.is_featured && e.status === 'published' && !e.is_past);
    const rest = filtered.filter(e => e !== featured);

    const setPending = (id: string, on: boolean) =>
        setPendingIds(prev => {
            const next = new Set(prev);
            if (on) next.add(id); else next.delete(id);
            return next;
        });

    const handleToggleRegister = async (event: NileEvent) => {
        if (pendingIds.has(event.id)) return;
        setPending(event.id, true);
        try {
            const res = event.is_registered
                ? await cancelRegistration(event.id)
                : await registerForEvent(event.id);

            // Replace with the server's copy so registrations_count and
            // is_registered come from the database, not from local guesswork.
            setEvents(prev => prev.map(e => (e.id === event.id ? res.event : e)));

            if (res.registered) {
                // An explicit, event-specific confirmation — QA found the
                // button silently flipping to "Registered" with no assurance
                // that anything had actually been recorded.
                setConfirmation(res.event);
            } else {
                showToast(res.message, 'success');
            }
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not update your registration. Please try again.'), 'error');
        } finally {
            setPending(event.id, false);
        }
    };

    return (
        <>
            <div className="p-4 md:p-10 space-y-6 md:space-y-10 font-sans bg-nile-white min-h-full pb-24 text-left">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-6 md:pb-10">
                    <div className="space-y-1 md:space-y-2">
                        <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 leading-tight">Events</h2>
                        <p className="text-sm text-gray-600">Stay connected with your campus</p>
                    </div>
                    <Button variant="nile" size="sm" onClick={() => setShowSuggest(true)}>
                        <Plus size={14} className="mr-1.5" /> Suggest event
                    </Button>
                </div>

                {/* Filters — built from the categories the API actually returned,
                    so a visible tab always has events behind it. */}
                {tabs.length > 1 && (
                    <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setActive(tab.value)}
                                className={`px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.value ? 'bg-nile-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 ${activeTab === tab.value ? 'text-white/70' : 'text-gray-400'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : loadError ? (
                    <div className="py-16 text-center border border-dashed border-red-200 bg-red-50/40 rounded-2xl space-y-3">
                        <AlertCircle size={22} className="mx-auto text-red-400" />
                        <p className="text-sm text-red-600">{loadError}</p>
                        <Button variant="outline" size="sm" onClick={() => { setIsLoading(true); reload(); }}>
                            Try again
                        </Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
                        <CalendarDays size={22} className="mx-auto text-gray-300" />
                        <p className="text-sm text-gray-400">
                            {activeTab === ALL
                                ? 'No events scheduled yet — be the first to suggest one.'
                                : `No ${categoryLabel(activeTab).toLowerCase()} events right now.`}
                        </p>
                        {activeTab === ALL && (
                            <Button variant="outline" size="sm" onClick={() => setShowSuggest(true)}>
                                <Plus size={14} className="mr-1.5" /> Suggest an event
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {featured && (
                            <FeaturedEvent
                                event={featured}
                                pending={pendingIds.has(featured.id)}
                                onToggle={() => handleToggleRegister(featured)}
                            />
                        )}

                        {rest.length > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
                                {rest.map(ev => (
                                    <EventCard
                                        key={ev.id}
                                        event={ev}
                                        pending={pendingIds.has(ev.id)}
                                        onToggle={() => handleToggleRegister(ev)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {showSuggest && (
                <SuggestEventModal
                    onClose={() => setShowSuggest(false)}
                    onSubmitted={() => { setShowSuggest(false); reload(); }}
                />
            )}

            <RegistrationConfirmation event={confirmation} onClose={() => setConfirmation(null)} />
        </>
    );
};

// ── registration confirmation ────────────────────────────────────────────────

/** Names the event, restates when and where, and says a confirmation email is
 *  on its way — the assurance QA found missing. */
const RegistrationConfirmation = ({ event, onClose }: { event: NileEvent | null; onClose: () => void }) => (
    <Modal isOpen={!!event} onClose={onClose} title="You're registered">
        {event && (
            <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-nile-green/15 text-nile-green flex items-center justify-center flex-shrink-0">
                        <Check size={18} strokeWidth={3} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Your place is confirmed.</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><CalendarDays size={14} /><span>{formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}</span></div>
                    <div className="flex items-center gap-2"><MapPin size={14} /><span>{event.location}</span></div>
                    <div className="flex items-center gap-2"><Users size={14} /><span>{event.registrations_count} registered</span></div>
                </div>

                <p className="text-xs text-gray-500">
                    A confirmation email with these details is on its way. You can cancel any time from this page.
                </p>

                <Button fullWidth size="sm" onClick={onClose}>Done</Button>
            </div>
        )}
    </Modal>
);

// ── suggest event ────────────────────────────────────────────────────────────

interface SuggestForm {
    title: string; category: string; date: string; time: string;
    location: string; description: string;
}

const EMPTY_SUGGESTION: SuggestForm = {
    title: '', category: 'career_fair', date: '', time: '', location: '', description: '',
};

/** Mounted only while open, so every open starts from a clean form — a
 *  previous draft or an already-submitted suggestion can never reappear. */
const SuggestEventModal = ({ onClose, onSubmitted }: {
    onClose: () => void; onSubmitted: () => void;
}) => {
    const { showToast } = useToast();
    const [form, setForm] = useState<SuggestForm>(EMPTY_SUGGESTION);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof SuggestForm, string>>>({});

    const set = <K extends keyof SuggestForm>(key: K, value: SuggestForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

    const validate = (): boolean => {
        const next: Partial<Record<keyof SuggestForm, string>> = {};
        if (!form.title.trim()) next.title = 'Give your event a title';
        if (!form.location.trim()) next.location = 'Where should it happen?';
        if (!form.description.trim()) next.description = 'Tell staff what the event is about';
        if (form.date) {
            const d = new Date(`${form.date}T00:00:00`);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (Number.isNaN(d.getTime())) next.date = 'That date is not valid';
            else if (d < today) next.date = 'Pick a date in the future';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting || !validate()) return;
        setSubmitting(true);
        try {
            const res = await suggestEvent(form);
            showToast(res.message, 'success');
            onSubmitted();
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not send your suggestion. Please try again.'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const field = 'w-full border border-gray-200 rounded-xl py-2.5 px-3.5 text-sm outline-none transition-all bg-white focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10';
    const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';
    const errCls = 'text-[11px] text-red-500 mt-1';

    return (
        <Modal isOpen onClose={onClose} title="Suggest an event">
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <p className="text-xs text-gray-500">
                    Your suggestion goes to Career Services for review. You'll be notified once it's published.
                </p>

                <div>
                    <label className={labelCls} htmlFor="suggest-title">Event title</label>
                    <input id="suggest-title" className={field} value={form.title}
                        onChange={e => set('title', e.target.value)} placeholder="e.g. Frontend Career Clinic" />
                    {errors.title && <p className={errCls}>{errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls} htmlFor="suggest-category">Category</label>
                        <select id="suggest-category" className={field} value={form.category}
                            onChange={e => set('category', e.target.value)}>
                            {EVENT_CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="suggest-location">Location</label>
                        <input id="suggest-location" className={field} value={form.location}
                            onChange={e => set('location', e.target.value)} placeholder="e.g. Main Auditorium" />
                        {errors.location && <p className={errCls}>{errors.location}</p>}
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="suggest-date">Preferred date <span className="text-gray-400">(optional)</span></label>
                        <input id="suggest-date" type="date" className={field} value={form.date}
                            onChange={e => set('date', e.target.value)} />
                        {errors.date && <p className={errCls}>{errors.date}</p>}
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="suggest-time">Preferred time <span className="text-gray-400">(optional)</span></label>
                        <input id="suggest-time" type="time" className={field} value={form.time}
                            onChange={e => set('time', e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className={labelCls} htmlFor="suggest-description">What's it about?</label>
                    <textarea id="suggest-description" className={`${field} h-24 resize-none`} value={form.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Who is it for, what would happen, and why it would be useful…" />
                    {errors.description && <p className={errCls}>{errors.description}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" fullWidth isLoading={submitting}>
                        {submitting ? 'Sending…' : 'Send suggestion'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// ── cards ────────────────────────────────────────────────────────────────────

/** Shared button copy/state so the featured hero and the grid cards can never
 *  disagree about what registration state an event is in. */
const registerLabel = (event: NileEvent, pending: boolean): string => {
    if (pending) return 'Working…';
    if (event.is_past) return 'Event has passed';
    if (event.status === 'pending') return 'Awaiting review';
    if (event.is_registered) return 'Registered — tap to cancel';
    if (event.is_full) return 'Join waitlist';
    return 'Register now';
};

const registerDisabled = (event: NileEvent, pending: boolean): boolean =>
    pending || event.is_past || event.status !== 'published';

const PendingBadge = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
        <Hourglass size={11} /> Awaiting review
    </span>
);

const FeaturedEvent = ({ event, pending, onToggle }: { event: NileEvent; pending: boolean; onToggle: () => void }) => (
    <div className="bg-nile-green text-white p-6 md:p-10 rounded-3xl relative overflow-hidden group shadow-card">
        <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-medium px-3 md:px-4 py-1 rounded-full z-10">
            Featured
        </div>
        <div className="relative z-10 space-y-4 md:space-y-6">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/15 inline-block">
                {event.category_label || categoryLabel(event.category)}
            </span>
            <h3 className="text-2xl md:text-5xl font-semibold leading-tight max-w-2xl">{event.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 text-sm font-medium text-white/80">
                <div className="flex items-center space-x-2"><CalendarDays size={16} strokeWidth={2} /><span>{formatDate(event.date)}</span></div>
                <div className="flex items-center space-x-2"><Clock size={16} strokeWidth={2} /><span>{event.time || 'Time TBA'}</span></div>
                <div className="flex items-center space-x-2"><MapPin size={16} strokeWidth={2} /><span>{event.location}</span></div>
                <div className="flex items-center space-x-2"><Users size={16} strokeWidth={2} /><span>{event.registrations_count} / {event.capacity} going</span></div>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="bg-white border-white text-gray-900 hover:bg-white/90 w-full sm:w-auto disabled:opacity-60"
                onClick={onToggle}
                isLoading={pending}
                disabled={registerDisabled(event, pending)}
            >
                {event.is_registered && !pending && <Check size={16} className="mr-2" strokeWidth={3} />}
                {registerLabel(event, pending)}
                {!event.is_registered && !pending && <ArrowRight size={18} className="ml-2" />}
            </Button>
        </div>
    </div>
);

const EventCard = ({ event, pending, onToggle }: { event: NileEvent; pending: boolean; onToggle: () => void }) => {
    const catClass = catColors[event.category] || catColors.other;
    const disabled = registerDisabled(event, pending);

    return (
        <div className="social-card p-6 md:p-8 hover:-translate-y-1 transition-all group flex flex-col text-left">
            <div className="flex justify-between items-start mb-4 md:mb-6 gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catClass}`}>
                    {event.category_label || categoryLabel(event.category)}
                </span>
                {event.status === 'pending'
                    ? <PendingBadge />
                    : <span className="text-xs text-gray-400 capitalize">{event.organiser_type}</span>}
            </div>

            <h3 className="text-lg md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6 leading-tight">{event.title}</h3>

            <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 flex-1">
                <div className="flex items-center space-x-2.5 text-sm text-gray-600">
                    <CalendarDays size={14} strokeWidth={2} />
                    <span>{formatDate(event.date)}{event.time ? ` • ${event.time}` : ''}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-sm text-gray-600">
                    <MapPin size={14} strokeWidth={2} />
                    <span>{event.location}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-sm text-gray-600">
                    <Users size={14} strokeWidth={2} />
                    <span>
                        {event.registrations_count} / {event.capacity} going
                        {event.is_full && !event.is_registered && <span className="ml-2 text-orange-500 font-medium">Full</span>}
                    </span>
                </div>
            </div>

            <button
                onClick={onToggle}
                disabled={disabled}
                aria-label={`${event.is_registered ? 'Cancel registration for' : 'Register for'} ${event.title}`}
                className={`w-full font-medium py-3 md:py-4 rounded-full transition-colors text-sm flex items-center justify-center gap-2
                    ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : event.is_registered ? 'bg-nile-green text-white hover:bg-nile-green-600'
                            : 'bg-nile-blue text-white hover:bg-nile-blue-600'}`}
            >
                {pending && <Loader2 size={15} className="animate-spin" />}
                {event.is_registered && !pending && <Check size={15} strokeWidth={3} />}
                {registerLabel(event, pending)}
            </button>
        </div>
    );
};

export default EventsCalendar;
