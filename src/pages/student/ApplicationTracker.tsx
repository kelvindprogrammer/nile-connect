import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { MoreHorizontal, ExternalLink, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

const applications = {
    saved: [
        { id: 1, company: 'META', title: 'Frontend Engineer Intern', location: 'Remote', logo: 'M', date: 'Saved Dec 10' },
        { id: 2, company: 'FLUTTERWAVE', title: 'Product Design Intern', location: 'Lagos, Nigeria', logo: 'F', date: 'Saved Dec 12' },
    ],
    applied: [
        { id: 3, company: 'GOOGLE', title: 'Software Engineer Intern', location: 'Remote', logo: 'G', date: 'Applied Dec 5' },
        { id: 4, company: 'MICROSOFT', title: 'Cloud Solutions Intern', location: 'Abuja, Nigeria', logo: 'M', date: 'Applied Dec 8' },
        { id: 5, company: 'ANDELA', title: 'Backend Developer', location: 'Remote', logo: 'A', date: 'Applied Dec 1' },
    ],
    interviews: [
        { id: 6, company: 'TECHCORP', title: 'Full-Stack Developer', location: 'Lagos, Nigeria', logo: 'TC', date: 'Interview Dec 20' },
    ],
};

const statusConfig = {
    saved: { label: 'SAVED', bg: 'bg-nile-white', icon: <Clock size={18} strokeWidth={3} />, count: applications.saved.length },
    applied: { label: 'APPLIED', bg: 'bg-nile-blue/10', icon: <FileText size={18} strokeWidth={3} className="text-nile-blue" />, count: applications.applied.length },
    interviews: { label: 'INTERVIEWS', bg: 'bg-nile-green/10', icon: <CheckCircle size={18} strokeWidth={3} className="text-nile-green" />, count: applications.interviews.length },
};

const ApplicationTracker = () => {
    return (
        <DashboardLayout>
            <div className="p-10 space-y-10 font-sans bg-nile-white min-h-full">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-6xl font-black text-black leading-none uppercase">Applications .</h2>
                        <p className="text-lg font-bold text-nile-blue/70 uppercase mt-2">Track your job journey .</p>
                    </div>
                    <div className="flex space-x-4">
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                            <div key={key} className={`flex items-center space-x-3 px-6 py-3 rounded-full border-3 border-black ${cfg.bg} shadow-brutalist-sm`}>
                                {cfg.icon}
                                <span className="font-black text-xs uppercase">{cfg.label}</span>
                                <span className="font-black text-xs bg-nile-green text-nile-white rounded-full px-2 py-0.5">{cfg.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <Column title="SAVED" count={applications.saved.length} color="bg-nile-white/50" apps={applications.saved} status="saved" />
                    <Column title="APPLIED" count={applications.applied.length} color="bg-nile-blue/5" apps={applications.applied} status="applied" />
                    <Column title="INTERVIEWS" count={applications.interviews.length} color="bg-nile-green/5" apps={applications.interviews} status="interviews" />
                </div>
            </div>
        </DashboardLayout>
    );
};

const Column = ({ title, count, color, apps, status }: {
    title: string, count: number, color: string,
    apps: typeof applications.saved, status: string
}) => {
    const dotColor = status === 'saved' ? 'bg-black/20' : status === 'applied' ? 'bg-nile-blue' : 'bg-nile-green';
    const headerColor = status === 'applied' ? 'text-nile-blue' : status === 'interviews' ? 'text-nile-green' : 'text-black';
    return (
        <div className={`${color} rounded-[35px] border-3 border-black shadow-brutalist p-6 space-y-6`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${dotColor}`}></div>
                    <h3 className={`font-black uppercase tracking-widest ${headerColor}`}>{title}</h3>
                </div>
                <span className="text-xs font-black bg-nile-green text-nile-white px-3 py-1 rounded-full">{count}</span>
            </div>
            <div className="space-y-5">
                {apps.map(app => <AppCard key={app.id} app={app} status={status} />)}
            </div>
            <button className="w-full py-4 border-3 border-black border-dashed rounded-[25px] text-xs font-black text-nile-blue/70 hover:bg-white hover:text-black transition-all uppercase">
                + ADD APPLICATION
            </button>
        </div>
    );
};

const AppCard = ({ app, status }: { app: typeof applications.saved[0], status: string }) => (
    <div className="bg-white p-6 rounded-[25px] border-3 border-black shadow-brutalist-sm hover:translate-x-1 transition-all group">
        <div className="flex justify-between items-start mb-5">
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-nile-green text-nile-white flex items-center justify-center text-sm font-black border-2 border-black">
                    {app.logo}
                </div>
                <div>
                    <p className="font-black text-black text-sm uppercase leading-none">{app.company}</p>
                    <p className="text-[9px] font-bold text-nile-blue/70 uppercase mt-1">{app.location}</p>
                </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal size={18} strokeWidth={3} />
            </button>
        </div>
        <p className="font-black text-black text-base uppercase mb-5 leading-tight">{app.title}</p>
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-nile-blue/70 uppercase">{app.date}</span>
            <button className="flex items-center space-x-1 text-[9px] font-black uppercase hover:text-nile-blue transition-colors">
                <span>VIEW</span>
                <ExternalLink size={10} strokeWidth={3} />
            </button>
        </div>
    </div>
);

export default ApplicationTracker;
