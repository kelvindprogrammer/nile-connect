import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
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
    tech: 'bg-nile-blue text-white',
    workshop: 'bg-nile-green text-white',
    fair: 'bg-nile-green text-white',
    webinar: 'bg-nile-white text-black',
    seminar: 'bg-black text-white',
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
            .get<ApiEnvelope<{ events: ApiEvent[] }>>('/events')
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
        <DashboardLayout>
            <div className="p-4 md:p-10 space-y-6 md:space-y-10 font-sans bg-nile-white min-h-full pb-24 text-left">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-[2px] border-black pb-6 md:pb-10">
                    <div className="space-y-1 md:space-y-2">
                        <h2 className="text-3xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Events .</h2>
                        <p className="text-[10px] md:text-lg font-bold text-nile-blue/70 uppercase tracking-widest">Stay connected with your campus .</p>
                    </div>
                    <Button variant="primary" size="sm" className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        + SUGGEST EVENT
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {filters.map(f => (
                        <button
                            key={f}
                            onClick={() => setActive(f)}
                            className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full border-[2px] border-black font-black text-[9px] md:text-xs transition-all whitespace-nowrap ${active === f ? 'bg-nile-green text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
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
                    <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[24px]">
                        <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">
                            {active === 'ALL' ? 'NO EVENTS SCHEDULED YET' : `NO ${active} EVENTS`}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Featured */}
                        {featured && (
                            <div className="bg-nile-green text-white p-6 md:p-10 rounded-[28px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[6px_6px_0px_0px_#000] relative overflow-hidden group">
                                <div className="absolute top-4 right-4 bg-white/20 text-white text-[8px] md:text-[10px] font-black px-3 md:px-4 py-1 rounded-full border-[1.5px] border-white/40 uppercase z-10">
                                    FEATURED
                                </div>
                                <div className="relative z-10 space-y-4 md:space-y-6">
                                    <span className="text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full border-2 border-white/40 uppercase bg-black/10 inline-block">
                                        {featured.category?.toUpperCase()}
                                    </span>
                                    <h3 className="text-2xl md:text-5xl font-black leading-none uppercase tracking-tighter max-w-2xl">{featured.title}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 text-[10px] md:text-sm font-black text-white/80 uppercase">
                                        <div className="flex items-center space-x-2"><CalendarDays size={16} strokeWidth={3} /><span>{formatDate(featured.date)}</span></div>
                                        <div className="flex items-center space-x-2"><Clock size={16} strokeWidth={3} /><span>{featured.time || 'TBA'}</span></div>
                                        <div className="flex items-center space-x-2"><MapPin size={16} strokeWidth={3} /><span>{featured.location}</span></div>
                                        <div className="flex items-center space-x-2"><Users size={16} strokeWidth={3} /><span>{featured.registrations_count} / {featured.capacity} GOING</span></div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-white text-black hover:bg-white/90 w-full sm:w-auto"
                                        onClick={() => handleRegister(featured.id)}
                                    >
                                        {registeredIds.has(featured.id) ? '✓ REGISTERED' : 'REGISTER NOW'}
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
        </DashboardLayout>
    );
};

const EventCard = ({ event, registered, onRegister }: { event: ApiEvent; registered: boolean; onRegister: () => void }) => {
    const catKey = event.category?.toLowerCase() || '';
    const catClass = catColors[catKey] || 'bg-nile-white text-black border-[1.5px] border-black';

    return (
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all group flex flex-col text-left">
            <div className="flex justify-between items-start mb-4 md:mb-6">
                <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full border-[1.5px] md:border-2 border-black uppercase ${catClass}`}>
                    {event.category?.toUpperCase()}
                </span>
                <span className="text-[8px] md:text-[9px] font-black text-nile-blue/50 uppercase tracking-widest">{event.organiser_type?.toUpperCase()}</span>
            </div>

            <h3 className="text-lg md:text-2xl font-black text-black uppercase mb-4 md:mb-6 leading-none tracking-tighter">{event.title}</h3>

            <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 flex-1">
                <div className="flex items-center space-x-2.5 text-[11px] md:text-sm font-black text-nile-blue/70">
                    <CalendarDays size={14} strokeWidth={3} />
                    <span className="uppercase">{formatDate(event.date)}{event.time ? ` • ${event.time}` : ''}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-[11px] md:text-sm font-black text-nile-blue/70">
                    <MapPin size={14} strokeWidth={3} />
                    <span className="uppercase">{event.location}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-[11px] md:text-sm font-black text-nile-blue/70">
                    <Users size={14} strokeWidth={3} />
                    <span className="uppercase">{event.registrations_count} / {event.capacity} GOING</span>
                </div>
            </div>

            <button
                onClick={onRegister}
                className={`w-full font-black py-3 md:py-4 rounded-[16px] md:rounded-full border-[2px] md:border-3 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] md:text-sm ${registered ? 'bg-nile-green text-white' : 'bg-white text-black'}`}
            >
                {registered ? '✓ REGISTERED' : 'REGISTER NOW'}
            </button>
        </div>
    );
};

export default EventsCalendar;
