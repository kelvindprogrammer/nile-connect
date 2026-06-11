import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { MoreHorizontal, ExternalLink, Clock, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { apiClient } from '../../services/api';

interface AppItem {
    id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    status: string;
    applied_at: string | null;
}

interface ApiEnvelope<T> { data: T; }

const statusBuckets: Record<string, string[]> = {
    applied: ['applied', 'pending'],
    interviews: ['interview', 'shortlisted'],
    offers: ['accepted', 'offered'],
};

function bucketOf(status: string): 'applied' | 'interviews' | 'offers' | 'rejected' {
    for (const [bucket, values] of Object.entries(statusBuckets)) {
        if (values.includes(status)) return bucket as 'applied' | 'interviews' | 'offers';
    }
    if (status === 'rejected') return 'rejected';
    return 'applied';
}

const ApplicationTracker = () => {
    const [apps, setApps] = useState<AppItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<{ applications: AppItem[] }>>('/api/student/applications')
            .then(({ data }) => setApps(data.data.applications ?? []))
            .catch(() => setApps([]))
            .finally(() => setIsLoading(false));
    }, []);

    const applied = apps.filter(a => bucketOf(a.status) === 'applied');
    const interviews = apps.filter(a => bucketOf(a.status) === 'interviews');
    const offers = apps.filter(a => bucketOf(a.status) === 'offers');

    return (
        <DashboardLayout>
            <div className="p-4 md:p-10 space-y-6 md:space-y-10 font-sans bg-nile-white min-h-full pb-20">
                {/* Header */}
                <div className="border-b border-gray-100 pb-6 md:pb-8">
                    <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 leading-tight">Applications</h2>
                    <p className="text-sm text-gray-600 mt-2">Track your job journey</p>
                </div>

                {/* Status Summary — stacks on mobile */}
                <div className="flex flex-wrap gap-3">
                    {[
                        { label: 'Applied', count: applied.length, icon: <FileText size={14} strokeWidth={2} />, bg: 'bg-nile-blue/10 text-nile-blue' },
                        { label: 'Interviews', count: interviews.length, icon: <CheckCircle size={14} strokeWidth={2} />, bg: 'bg-nile-green/10 text-nile-green' },
                        { label: 'Offers', count: offers.length, icon: <Clock size={14} strokeWidth={2} />, bg: 'bg-yellow-50 text-yellow-600' },
                    ].map(cfg => (
                        <div key={cfg.label} className={`flex items-center space-x-2 px-4 py-2 rounded-full ${cfg.bg}`}>
                            {cfg.icon}
                            <span className="font-medium text-xs">{cfg.label}</span>
                            <span className="font-semibold text-xs bg-white/70 rounded-full px-2 py-0.5">{cfg.count}</span>
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : (
                    /* Kanban Columns */
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                        <Column title="Applied" color="bg-nile-blue/5" apps={applied} status="applied" />
                        <Column title="Interviews" color="bg-nile-green/5" apps={interviews} status="interviews" />
                        <Column title="Offers" color="bg-yellow-50" apps={offers} status="offers" />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

const Column = ({ title, color, apps, status }: {
    title: string; color: string;
    apps: AppItem[]; status: string;
}) => {
    const dotColor = status === 'applied' ? 'bg-nile-blue' : status === 'interviews' ? 'bg-nile-green' : 'bg-yellow-400';
    const headerColor = status === 'applied' ? 'text-nile-blue' : status === 'interviews' ? 'text-nile-green' : 'text-yellow-600';

    return (
        <div className={`${color} rounded-[28px] md:rounded-[35px] border border-gray-100 shadow-card md:shadow-card p-4 md:p-6 space-y-4 md:space-y-6`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${dotColor}`}></div>
                    <h3 className={`font-semibold text-xs md:text-sm ${headerColor}`}>{title}</h3>
                </div>
                <span className="text-[9px] md:text-xs font-semibold bg-nile-green text-white px-3 py-1 rounded-full border border-black">{apps.length}</span>
            </div>

            <div className="space-y-3 md:space-y-4">
                {apps.length === 0 ? (
                    <div className="py-10 text-center border-[2px] border-dashed border-black/10 rounded-[20px]">
                        <p className="text-[9px] font-semibold text-black/20">NONE YET</p>
                    </div>
                ) : (
                    apps.map(app => <AppCard key={app.id} app={app} />)
                )}
            </div>
        </div>
    );
};

const AppCard = ({ app }: { app: AppItem }) => {
    const initials = app.company_name
        ? app.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const dateStr = app.applied_at
        ? new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : '';

    return (
        <div className="bg-white p-4 md:p-6 rounded-[20px] md:rounded-[25px] border border-gray-100 shadow-card md:shadow-card transition-all group">
            <div className="flex justify-between items-start mb-3 md:mb-5">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-nile-green text-white flex items-center justify-center text-[10px] md:text-sm font-semibold border border-gray-100 flex-shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-black text-[10px] md:text-sm leading-none truncate">{app.company_name || 'Unknown'}</p>
                        <p className="text-[8px] md:text-[9px] font-bold text-nile-blue/60 mt-1 truncate">{app.status.toUpperCase()}</p>
                    </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <MoreHorizontal size={16} strokeWidth={3} />
                </button>
            </div>
            <p className="font-semibold text-black text-[11px] md:text-base mb-3 md:mb-5 leading-tight">{app.job_title || 'Untitled Role'}</p>
            <div className="flex justify-between items-center">
                <span className="text-[8px] md:text-[9px] font-semibold text-nile-blue/60">{dateStr ? `Applied ${dateStr}` : ''}</span>
                <button className="flex items-center space-x-1 text-[8px] md:text-[9px] font-semibold hover:text-nile-blue transition-colors">
                    <span>VIEW</span>
                    <ExternalLink size={10} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default ApplicationTracker;
