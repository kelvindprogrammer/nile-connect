import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { listEvents, type NileEvent } from '../../services/eventService';
import SidebarCard from './SidebarCard';

const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const EventsCard: React.FC<{ seeAllTo: string }> = ({ seeAllTo }) => {
    const [events, setEvents] = useState<NileEvent[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        // "Upcoming" has to mean upcoming: this card previously listed whatever
        // the API returned first, which included events whose date had already
        // passed and drafts still awaiting review.
        listEvents({ upcomingOnly: true })
            .then(res => {
                if (cancelled) return;
                setEvents(res.events.filter(e => e.status === 'published').slice(0, 3));
            })
            .catch(() => { if (!cancelled) setEvents([]); });
        return () => { cancelled = true; };
    }, []);

    return (
        <SidebarCard title="Upcoming events" seeAllTo={seeAllTo} isLoading={events === null} empty={events?.length === 0} emptyLabel="No upcoming events">
            {events?.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-nile-blue/10 text-nile-blue flex flex-col items-center justify-center flex-shrink-0">
                        <Calendar size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{ev.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                            {formatDate(ev.date)}{ev.location ? ` · ${ev.location}` : ''}
                        </p>
                        {ev.is_registered && (
                            <p className="text-[10px] font-medium text-nile-green mt-0.5">✓ Registered</p>
                        )}
                    </div>
                </div>
            ))}
        </SidebarCard>
    );
};

export default EventsCard;
