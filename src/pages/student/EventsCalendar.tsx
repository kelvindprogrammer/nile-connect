import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { MapPin, CalendarDays, Clock, Tag, ArrowRight, Users } from 'lucide-react';
import Button from '../../components/Button';

const events = [
    {
        id: 1,
        title: 'Nile University Tech Summit 2024',
        organiser: 'NILE UNIVERSITY',
        category: 'TECH',
        date: 'Fri, 20 Dec 2024',
        time: '10:00 AM – 4:00 PM',
        location: 'Main Auditorium, Abuja',
        attendees: 342,
        registered: true,
        featured: true,
    },
    {
        id: 2,
        title: 'Resume Building Workshop',
        organiser: 'CAREER SERVICES',
        category: 'WORKSHOP',
        date: 'Fri, 13 Dec 2024',
        time: '11:00 AM – 1:00 PM',
        location: 'LT4 Engineering Block',
        attendees: 80,
        registered: false,
        featured: false,
    },
    {
        id: 3,
        title: 'Internship Fair 2024',
        organiser: 'STUDENT AFFAIRS',
        category: 'FAIR',
        date: 'Sat, 21 Dec 2024',
        time: '9:00 AM – 3:00 PM',
        location: 'Sports Complex, Nile',
        attendees: 520,
        registered: true,
        featured: false,
    },
];

const catColors: Record<string, string> = {
    TECH: 'bg-nile-blue text-white',
    WORKSHOP: 'bg-nile-green text-white',
    FAIR: 'bg-nile-green text-nile-white',
    WEBINAR: 'bg-nile-white text-black',
};

const filters = ['ALL', 'TECH', 'WORKSHOP', 'FAIR', 'WEBINAR'];

const EventsCalendar = () => {
    const [active, setActive] = useState('ALL');
    const filtered = active === 'ALL' ? events : events.filter(e => e.category === active);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-10 space-y-6 md:space-y-10 font-sans bg-nile-white min-h-full pb-24 text-left">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-[2px] border-black pb-6 md:pb-10">
                    <div className="space-y-1 md:space-y-2">
                        <h2 className="text-3xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Events .</h2>
                        <p className="text-[10px] md:text-lg font-bold text-nile-blue/70 uppercase tracking-widest">Stay connected with your campus .</p>
                    </div>
                    <Button variant="primary" size="sm md:lg" className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        + SUGGEST EVENT
                    </Button>
                </div>

                {/* Category Filters */}
                <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 px-1 md:px-0">
                    {filters.map(f => (
                        <button
                            key={f}
                            onClick={() => setActive(f)}
                            className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full border-[2px] md:border-3 border-black font-black text-[9px] md:text-xs transition-all whitespace-nowrap ${active === f ? 'bg-nile-green text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Featured Event */}
                {filtered.find(e => e.featured) && (
                    <div className="bg-nile-green text-white p-6 md:p-10 rounded-[28px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[6px_6px_0px_0px_#000] relative overflow-hidden group">
                        <div className="absolute top-4 right-4 bg-nile-green text-white text-[8px] md:text-[10px] font-black px-3 md:px-4 py-1 rounded-full border-[1.5px] border-white uppercase z-10">
                            FEATURED
                        </div>
                        <div className="relative z-10 space-y-4 md:space-y-6">
                            <span className={`text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full border-2 border-white/40 uppercase bg-black/10 inline-block`}>
                                {filtered.find(e => e.featured)!.category}
                            </span>
                            <h3 className="text-2xl md:text-5xl font-black leading-[0.9] uppercase tracking-tighter max-w-2xl">{filtered.find(e => e.featured)!.title}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 text-[10px] md:text-sm font-black text-white/80 uppercase">
                                <div className="flex items-center space-x-2"><CalendarDays size={16} strokeWidth={3} /><span>{filtered.find(e => e.featured)!.date}</span></div>
                                <div className="flex items-center space-x-2"><Clock size={16} strokeWidth={3} /><span>{filtered.find(e => e.featured)!.time}</span></div>
                                <div className="flex items-center space-x-2"><MapPin size={16} strokeWidth={3} /><span>{filtered.find(e => e.featured)!.location}</span></div>
                                <div className="flex items-center space-x-2"><Users size={16} strokeWidth={3} /><span>{filtered.find(e => e.featured)!.attendees} GOING</span></div>
                            </div>
                            <Button variant="outline" size="sm md:lg" className="bg-white border-white text-black hover:bg-white/90 w-full sm:w-auto">
                                REGISTERED <ArrowRight size={18} className="ml-2" />
                            </Button>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                    </div>
                )}

                {/* Events Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
                    {filtered.filter(e => !e.featured).map(ev => (
                        <EventCard key={ev.id} event={ev} />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

const EventCard = ({ event }: { event: typeof events[0] }) => (
    <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all group flex flex-col text-left">
        <div className="flex justify-between items-start mb-4 md:mb-6">
            <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full border-[1.5px] md:border-2 border-black uppercase ${catColors[event.category]}`}>
                {event.category}
            </span>
            <span className="text-[8px] md:text-[9px] font-black text-nile-blue/50 uppercase tracking-widest">{event.organiser}</span>
        </div>

        <h3 className="text-lg md:text-2xl font-black text-black uppercase mb-4 md:mb-6 leading-none tracking-tighter">{event.title}</h3>

        <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 flex-1">
            <div className="flex items-center space-x-2.5 text-[11px] md:text-sm font-black text-nile-blue/70">
                <CalendarDays size={14} md:size={16} strokeWidth={3} />
                <span className="uppercase">{event.date} • {event.time}</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[11px] md:text-sm font-black text-nile-blue/70">
                <MapPin size={14} md:size={16} strokeWidth={3} />
                <span className="uppercase">{event.location}</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[11px] md:text-sm font-black text-nile-blue/70">
                <Users size={14} md:size={16} strokeWidth={3} />
                <span className="uppercase">{event.attendees} GOING</span>
            </div>
        </div>

        <button className={`w-full font-black py-3 md:py-4 rounded-[16px] md:rounded-full border-[2px] md:border-3 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] md:text-sm ${event.registered ? 'bg-nile-green text-white' : 'bg-white text-black'}`}>
            {event.registered ? '✓ REGISTERED' : 'REGISTER NOW'}
        </button>
    </div>
);

export default EventsCalendar;
