import React, { useState, useEffect } from 'react';
import { MapPin, CalendarDays, Clock, Users, ArrowRight, Loader2 } from 'lucide-react';
import Button from '../../components/Button';
import { apiClient } from '../../services/api';

interface ApiEvent {
    id: string;
    organiser_id: string;
    organiser_type: string;
    title: string;
    category: string;
    date: string;
    time: string;
    location: string;
    description: string;
    capacity: number;
    registrations_count: number;
    is_featured: boolean;
    status: string;
}

interface ApiEnvelope<T> { data: T; }

const catColors: Record<string, string> = {
    tech: 'bg-nile-blue/10 text-nile-blue',
    workshop: 'bg-nile-green/10 text-nile-green',
    fair: 'bg-nile-green/10 text-nile-green',
    webinar: 'bg-gray-100 text-gray-500',
    seminar: 'bg-gray-100 text-gray-500',
};

const filters = ['ALL', 'TECH', 'WORKSHOP', 'FAIR', 'WEBINAR', 'SEMINAR'];

function formatDate(dateStr: string): string {
    if (!dateStr || dateStr.startsWith('0001')) return 'TBA';
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
}

const EventsCalendar = () => {
    const [active, setActive] = useState('ALL');
    const [events, setEvents] = useState<ApiEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<{ events: ApiEvent[] }>>('/api/events')
            .then(({ data }) => setEvents(data.data.events ?? []))
            .catch(() => setEvents([]))
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = events.filter(e =>
        active === 'ALL' || e.category?.toLowerCase() === active.toLowerCase()
    );

    const featured = filtered.find(e => e.is_featured);
    const nonFeatured = filtered.filter(e => !e.is_featured);

    const handleRegister = (id: string) => {
        setRegisteredIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
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
                    <Button variant="nile" size="sm">
                        + Suggest event
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {filters.map(f => (
                        <button
                            key={f}
                            onClick={() => setActive(f)}
                            className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${active === f ? 'bg-nile-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl">
                        <p className="text-sm text-gray-400">
                            {active === 'ALL' ? 'No events scheduled yet' : `No ${active.toLowerCase()} events`}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Featured */}
                        {featured && (
                            <div className="bg-nile-green text-white p-6 md:p-10 rounded-3xl relative overflow-hidden group shadow-card">
                                <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-medium px-3 md:px-4 py-1 rounded-full z-10">
                                    Featured
                                </div>
                                <div className="relative z-10 space-y-4 md:space-y-6">
                                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/15 inline-block">
                                        {featured.category}
                                    </span>
                                    <h3 className="text-2xl md:text-5xl font-semibold leading-tight max-w-2xl">{featured.title}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 text-sm font-medium text-white/80">
                                        <div className="flex items-center space-x-2"><CalendarDays size={16} strokeWidth={2} /><span>{formatDate(featured.date)}</span></div>
                                        <div className="flex items-center space-x-2"><Clock size={16} strokeWidth={2} /><span>{featured.time || 'TBA'}</span></div>
                                        <div className="flex items-center space-x-2"><MapPin size={16} strokeWidth={2} /><span>{featured.location}</span></div>
                                        <div className="flex items-center space-x-2"><Users size={16} strokeWidth={2} /><span>{featured.registrations_count} / {featured.capacity} going</span></div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-white text-gray-900 hover:bg-white/90 w-full sm:w-auto"
                                        onClick={() => handleRegister(featured.id)}
                                    >
                                        {registeredIds.has(featured.id) ? '✓ Registered' : 'Register now'}
                                        <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Events Grid */}
                        {nonFeatured.length > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
                                {nonFeatured.map(ev => (
                                    <EventCard key={ev.id} event={ev} registered={registeredIds.has(ev.id)} onRegister={() => handleRegister(ev.id)} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

const EventCard = ({ event, registered, onRegister }: { event: ApiEvent; registered: boolean; onRegister: () => void }) => {
    const catKey = event.category?.toLowerCase() || '';
    const catClass = catColors[catKey] || 'bg-gray-100 text-gray-500';

    return (
        <div className="social-card p-6 md:p-8 hover:-translate-y-1 transition-all group flex flex-col text-left">
            <div className="flex justify-between items-start mb-4 md:mb-6">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catClass}`}>
                    {event.category}
                </span>
                <span className="text-xs text-gray-400">{event.organiser_type}</span>
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
                    <span>{event.registrations_count} / {event.capacity} going</span>
                </div>
            </div>

            <button
                onClick={onRegister}
                className={`w-full font-medium py-3 md:py-4 rounded-full transition-colors text-sm ${registered ? 'bg-nile-green text-white hover:bg-nile-green-600' : 'bg-nile-blue text-white hover:bg-nile-blue-600'}`}
            >
                {registered ? '✓ Registered' : 'Register now'}
            </button>
        </div>
    );
};

export default EventsCalendar;
