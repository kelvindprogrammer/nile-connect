import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, Clock, CheckCircle, XCircle, FileText, Loader2, Ban } from 'lucide-react';
import { apiClient } from '../../services/api';
import { withdrawApplication } from '../../services/jobService';
import { useToast } from '../../context/ToastContext';
import type { Application, ApplicationStage } from '../../types/application';

interface ApiEnvelope<T> { data: T; }

const stageBuckets: Record<string, ApplicationStage[]> = {
    applied: ['submitted', 'under_review'],
    interviews: ['shortlisted', 'interview_scheduled', 'assessment_sent'],
    offers: ['offer_extended', 'accepted'],
};

function bucketOf(stage: string): 'applied' | 'interviews' | 'offers' | 'rejected' | 'withdrawn' {
    for (const [bucket, values] of Object.entries(stageBuckets)) {
        if ((values as string[]).includes(stage)) return bucket as 'applied' | 'interviews' | 'offers';
    }
    if (stage === 'rejected') return 'rejected';
    if (stage === 'withdrawn') return 'withdrawn';
    return 'applied';
}

const stageLabel = (stage: string): string =>
    (stage || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ApplicationTracker = () => {
    const [apps, setApps] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    const load = useCallback(() => {
        apiClient
            .get<ApiEnvelope<{ applications: Application[] }>>('/api/student/applications')
            .then(({ data }) => setApps(data.data.applications ?? []))
            .catch(() => setApps([]))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleWithdraw = async (app: Application) => {
        if (!window.confirm(`Withdraw your application to ${app.company_name || 'this role'}?`)) return;
        try {
            await withdrawApplication(app.id);
            setApps(prev => prev.map(a => a.id === app.id ? { ...a, stage: 'withdrawn', withdrawn_at: new Date().toISOString() } : a));
            showToast('Application withdrawn.', 'success');
        } catch {
            showToast('Failed to withdraw application.', 'error');
        }
    };

    const active = apps.filter(a => bucketOf(a.stage) !== 'withdrawn' && bucketOf(a.stage) !== 'rejected');
    const applied = active.filter(a => bucketOf(a.stage) === 'applied');
    const interviews = active.filter(a => bucketOf(a.stage) === 'interviews');
    const offers = active.filter(a => bucketOf(a.stage) === 'offers');
    const closed = apps.filter(a => bucketOf(a.stage) === 'withdrawn' || bucketOf(a.stage) === 'rejected');

    return (
        <>
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
                        { label: 'Closed', count: closed.length, icon: <Ban size={14} strokeWidth={2} />, bg: 'bg-black/5 text-black/40' },
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
                    <>
                        {/* Kanban Columns */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                            <Column title="Applied" color="bg-nile-blue/5" apps={applied} status="applied" onWithdraw={handleWithdraw} />
                            <Column title="Interviews" color="bg-nile-green/5" apps={interviews} status="interviews" onWithdraw={handleWithdraw} />
                            <Column title="Offers" color="bg-yellow-50" apps={offers} status="offers" onWithdraw={handleWithdraw} />
                        </div>

                        {closed.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-black/50">Closed</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {closed.map(app => <AppCard key={app.id} app={app} onWithdraw={handleWithdraw} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

const Column = ({ title, color, apps, status, onWithdraw }: {
    title: string; color: string;
    apps: Application[]; status: string;
    onWithdraw: (app: Application) => void;
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
                    apps.map(app => <AppCard key={app.id} app={app} onWithdraw={onWithdraw} />)
                )}
            </div>
        </div>
    );
};

const AppCard = ({ app, onWithdraw }: { app: Application; onWithdraw: (app: Application) => void }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const initials = app.company_name
        ? app.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const dateStr = app.applied_at
        ? new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : '';

    const navigate = useNavigate();
    const canWithdraw = !['accepted', 'rejected', 'withdrawn'].includes(app.stage);

    return (
        <div className="bg-white p-4 md:p-6 rounded-[20px] md:rounded-[25px] border border-gray-100 shadow-card md:shadow-card transition-all group relative">
            <div className="flex justify-between items-start mb-3 md:mb-5">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-nile-green text-white flex items-center justify-center text-[10px] md:text-sm font-semibold border border-gray-100 flex-shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-black text-[10px] md:text-sm leading-none truncate">{app.company_name || 'Unknown'}</p>
                        <p className="text-[8px] md:text-[9px] font-bold text-nile-blue/60 mt-1 truncate">{stageLabel(app.stage).toUpperCase()}</p>
                    </div>
                </div>
                <div className="relative flex-shrink-0">
                    <button onClick={() => setMenuOpen(v => !v)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal size={16} strokeWidth={3} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-6 z-10 bg-white border border-gray-100 rounded-xl shadow-card py-1 w-36">
                            <button
                                onClick={() => navigate(`/student/jobs/${app.job_id}`)}
                                className="w-full text-left px-3 py-2 text-[9px] font-semibold hover:bg-black/5"
                            >
                                View job
                            </button>
                            {canWithdraw && (
                                <button
                                    onClick={() => { setMenuOpen(false); onWithdraw(app); }}
                                    className="w-full text-left px-3 py-2 text-[9px] font-semibold text-red-500 hover:bg-red-50 flex items-center gap-1.5"
                                >
                                    <XCircle size={11} /> Withdraw
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <p className="font-semibold text-black text-[11px] md:text-base mb-3 md:mb-5 leading-tight">{app.job_title || 'Untitled Role'}</p>
            <div className="flex justify-between items-center">
                <span className="text-[8px] md:text-[9px] font-semibold text-nile-blue/60">{dateStr ? `Applied ${dateStr}` : ''}</span>
                <button
                    onClick={() => navigate(`/student/jobs/${app.job_id}`)}
                    className="flex items-center space-x-1 text-[8px] md:text-[9px] font-semibold hover:text-nile-blue transition-colors"
                >
                    <span>VIEW</span>
                    <ExternalLink size={10} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default ApplicationTracker;
