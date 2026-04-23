import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle2 } from 'lucide-react';

const StaffEvents = () => {
    const [activeTab, setActiveTab] = useState('Posted Events');
    const tabs = ['Posted Events', 'Upcoming Events'];

    const events = [
        {
            id: 1,
            title: "FALL CAREER FAIR",
            date: "OCT 15, 2026",
            capacity: 500,
            registrations: 450,
            attendance: 0,
            hasDetails: false
        },
        {
            id: 2,
            title: "RESUME WORKSHOP",
            date: "OCT 18, 2026",
            capacity: 50,
            registrations: 50,
            attendance: 0,
            hasDetails: true
        }
    ];

    return (
        <div className="w-full flex flex-col space-y-10 anime-fade-in font-sans">
            {/* Header Area */}
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-widest mb-2">
                    CAMPUS EVENTS
                </h1>
                <p className="text-xs font-black text-nile-blue uppercase tracking-[0.2em] mb-4">
                    MANAGE ALL SCHOOL AND EMPLOYER EVENTS
                </p>
                <div className="w-full h-1 bg-black rounded-full mb-10"></div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b-4 border-black pb-4 gap-6">
                <div className="flex space-x-8 relative">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center text-sm font-black uppercase tracking-widest pb-2 border-b-4 transition-all -mb-[20px] whitespace-nowrap
                                    ${isActive ? 'text-black border-black/80' : 'text-nile-blue/70 border-transparent hover:text-black'}
                                `}
                            >
                                {isActive && tab === 'Posted Events' ? <CheckCircle2 size={16} className="mr-2" strokeWidth={3} /> : null}
                                {isActive && tab === 'Upcoming Events' ? <Calendar size={16} className="mr-2" strokeWidth={3} /> : null}
                                {tab}
                            </button>
                        );
                    })}
                </div>
                <button className="bg-white border-4 border-black text-black px-6 py-3 font-black text-xs uppercase tracking-widest rounded-[16px] flex items-center shadow-brutalist-sm hover:translate-y-1 hover:translate-x-1 hover:shadow-none hover:bg-nile-green transition-all">
                    <Plus size={16} strokeWidth={3} className="mr-2" /> POST NEW EVENT
                </button>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {events.map((evt) => (
                    <div key={evt.id} className="bg-white border-4 border-black rounded-[24px] p-8 shadow-brutalist-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-nile-green/10 transition-all group flex flex-col">
                        
                        <div className="flex justify-between items-start mb-10">
                            <h3 className="text-2xl font-black text-black uppercase tracking-wider leading-tight w-2/3">
                                {evt.title}
                            </h3>
                            <div className="w-12 h-12 bg-white border-3 border-black rounded-[14px] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-nile-green transition-colors">
                                <Calendar size={20} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex justify-between items-center border-b-2 border-black/5 pb-2 border-dashed">
                                <span className="text-[10px] font-black text-nile-blue/70 uppercase tracking-widest">DATE</span>
                                <span className="text-xs font-black text-black uppercase tracking-widest">{evt.date}</span>
                            </div>
                            <div className="flex justify-between items-center border-b-2 border-black/5 pb-2 border-dashed">
                                <span className="text-[10px] font-black text-nile-blue/70 uppercase tracking-widest">CAPACITY</span>
                                <span className="text-xs font-black text-black uppercase tracking-widest">{evt.capacity}</span>
                            </div>
                            <div className="flex justify-between items-center border-b-2 border-black/5 pb-2 border-dashed">
                                <span className="text-[10px] font-black text-nile-blue/70 uppercase tracking-widest">REGISTRATIONS</span>
                                <span className="text-xs font-black text-black uppercase tracking-widest">{evt.registrations}</span>
                            </div>
                            <div className="flex justify-between items-center border-b-2 border-black/5 pb-2 border-dashed">
                                <span className="text-[10px] font-black text-nile-blue/70 uppercase tracking-widest">ATTENDANCE</span>
                                <span className="text-xs font-black text-black uppercase tracking-widest">{evt.attendance}</span>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button className="flex-1 bg-black text-white py-4 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-nile-green hover:text-black border-2 border-black transition-colors">
                                MANAGE
                            </button>
                            {evt.hasDetails && (
                                <button className="flex-1 bg-white text-black py-4 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-nile-white border-3 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                                    DETAILS
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
        </div>
    );
};

export default StaffEvents;
