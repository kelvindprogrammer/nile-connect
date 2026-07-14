import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { apiClient } from '../../services/api';
import SidebarCard from './SidebarCard';

interface EventItem {
    id: string;
    title: string;
    date: string;
    location: string;
}

interface Envelope<T> { data: T; }

const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const EventsCard: React.FC<{ seeAllTo: string }> = ({ seeAllTo }) => {
    const [events, setEvents] = useState<EventItem[] | null>(null);

    useEffect(() => {
        apiClient.get<Envelope<{ events: EventItem[] }>>('/api/events')
            .then(({ data }) => setEvents((data.data.events ?? []).slice(0, 3)))
            .catch(() => setEvents([]));
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
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(ev.date)}{ev.location ? ` · ${ev.location}` : ''}</p>
                    </div>
                </div>
            ))}
        </SidebarCard>
    );
};

export default EventsCard;
