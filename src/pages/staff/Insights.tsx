import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Building2, Briefcase, ClipboardList, CheckCircle2,
    XCircle, FileText, BarChart2, MessageSquare, Loader2,
} from 'lucide-react';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import {
    getDashboardStats, getStaffEmployers, getStaffJobs,
    updateEmployerStatus, updateJobStatus,
    DashboardStats, StaffEmployer, StaffJob,
} from '../../services/staffService';

const StaffInsights = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [employers, setEmployers] = useState<StaffEmployer[]>([]);
    const [jobs, setJobs] = useState<StaffJob[]>([]);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchAll = useCallback(async () => {
        try {
            const [s, e, j] = await Promise.all([getDashboardStats(), getStaffEmployers(), getStaffJobs()]);
            setStats(s); setEmployers(e); setJobs(j);
        } catch {
            showToast('Failed to load insights.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        const t = setTimeout(fetchAll, 0);
        return () => clearTimeout(t);
    }, [fetchAll]);

    const pendingEmployers = employers.filter(e => e.status === 'pending');
    const pendingJobs = jobs.filter(j => j.status === 'pending');

    const handleEmployerAction = async (id: string, companyName: string, status: 'approved' | 'rejected') => {
        setActionLoading(prev => ({ ...prev, [`emp-${id}`]: true }));
        try {
            await updateEmployerStatus(id, { status });
            setEmployers(prev => prev.map(e => e.id === id ? { ...e, status } : e));
            showToast(`${companyName} has been ${status}.`, status === 'approved' ? 'success' : 'error');
        } catch {
            showToast(`Failed to update ${companyName}.`, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [`emp-${id}`]: false }));
        }
    };

    const handleJobAction = async (id: string, title: string, status: 'active' | 'rejected') => {
        setActionLoading(prev => ({ ...prev, [`job-${id}`]: true }));
        try {
            await updateJobStatus(id, status);
            setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
            showToast(`"${title}" has been ${status === 'active' ? 'approved' : 'rejected'}.`, status === 'active' ? 'success' : 'error');
        } catch {
            showToast(`Failed to update job "${title}".`, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [`job-${id}`]: false }));
        }
    };

    if (isLoading) return (
        <div className="p-4 md:p-6 space-y-6 animate-pulse max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}</div>
            <div className="h-80 bg-gray-100 rounded-2xl" />
        </div>
    );

    const statCards = [
        { label: 'Total students', value: stats?.total_students ?? 0, icon: <Users size={16} /> },
        { label: 'Total employers', value: stats?.total_employers ?? 0, icon: <Building2 size={16} /> },
        { label: 'Active jobs', value: stats?.active_jobs ?? 0, icon: <Briefcase size={16} /> },
        { label: 'Applications', value: stats?.total_applications ?? 0, icon: <ClipboardList size={16} /> },
    ];

    return (
        <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-6 anime-fade-in font-sans max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
                <p className="text-sm text-gray-400 mt-1">Platform activity and pending approvals</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(s => (
                    <div key={s.label} className="bg-white border border-gray-100 rounded-2xl shadow-card p-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center mb-2">{s.icon}</div>
                        <h3 className="text-xl font-semibold text-gray-900 leading-none">{s.value.toLocaleString()}</h3>
                        <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            <QueueSection
                title="Employer verification queue" icon={<Building2 size={15} />}
                badgeCount={pendingEmployers.length} emptyLabel="No pending employer verifications"
            >
                {pendingEmployers.map(emp => (
                    <div key={emp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 bg-gray-900 text-white rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                {emp.company_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{emp.company_name}</p>
                                <p className="text-xs text-gray-400 truncate">{emp.industry} · {emp.location}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <ActionButton label="Approve" isLoading={!!actionLoading[`emp-${emp.id}`]} onClick={() => handleEmployerAction(emp.id, emp.company_name, 'approved')} variant="approve" />
                            <ActionButton label="Reject" isLoading={!!actionLoading[`emp-${emp.id}`]} onClick={() => handleEmployerAction(emp.id, emp.company_name, 'rejected')} variant="reject" />
                        </div>
                    </div>
                ))}
            </QueueSection>

            <QueueSection
                title="Job approval queue" icon={<Briefcase size={15} />}
                badgeCount={pendingJobs.length} emptyLabel="No pending job approvals"
            >
                {pendingJobs.map(job => (
                    <div key={job.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 bg-nile-blue/10 text-nile-blue rounded-lg flex items-center justify-center flex-shrink-0">
                                <Briefcase size={15} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{job.title}</p>
                                <p className="text-xs text-gray-400 truncate">{job.company} · {job.type} · {job.location}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <ActionButton label="Approve" isLoading={!!actionLoading[`job-${job.id}`]} onClick={() => handleJobAction(job.id, job.title, 'active')} variant="approve" />
                            <ActionButton label="Reject" isLoading={!!actionLoading[`job-${job.id}`]} onClick={() => handleJobAction(job.id, job.title, 'rejected')} variant="reject" />
                        </div>
                    </div>
                ))}
            </QueueSection>

            <Card title="Quick actions">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Review CVs', icon: <FileText size={18} />, path: '/staff/services' },
                        { label: 'All students', icon: <Users size={18} />, path: '/staff/services?tab=students' },
                        { label: 'Generate report', icon: <BarChart2 size={18} />, path: '/staff/services?tab=reporting' },
                        { label: 'Network', icon: <MessageSquare size={18} />, path: '/staff/crm' },
                    ].map(qa => (
                        <button key={qa.label} onClick={() => navigate(qa.path)}
                            className="flex flex-col items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:shadow-card transition-all text-left">
                            <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-700">{qa.icon}</div>
                            <span className="text-xs font-medium text-gray-800 leading-tight">{qa.label}</span>
                        </button>
                    ))}
                </div>
            </Card>

            <Card title="Platform activity" subtitle="Aggregate stats across all users — not personal to you">
                <div className="space-y-4">
                    {[
                        { label: 'Students', value: stats?.total_students ?? 0 },
                        { label: 'Employers', value: stats?.total_employers ?? 0 },
                        { label: 'Active jobs', value: stats?.active_jobs ?? 0 },
                        { label: 'Applications', value: stats?.total_applications ?? 0 },
                    ].map(bar => {
                        const total = (stats?.total_students ?? 0) + (stats?.total_employers ?? 0) + (stats?.active_jobs ?? 0) + (stats?.total_applications ?? 0) || 1;
                        const pct = Math.round((bar.value / total) * 100);
                        return (
                            <div key={bar.label} className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">{bar.label}</span>
                                    <span className="font-medium text-gray-900">{bar.value.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
                                </div>
                            </div>
                        );
                    })}
                    {stats && (
                        <div className="pt-2 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                                <p className="text-lg font-semibold text-gray-900 leading-none">{stats.pending_employers}</p>
                                <p className="text-[11px] text-gray-400 mt-1">Pending employers</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                                <p className="text-lg font-semibold text-gray-900 leading-none">{stats.upcoming_events}</p>
                                <p className="text-[11px] text-gray-400 mt-1">Upcoming events</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

const QueueSection = ({ title, icon, badgeCount, emptyLabel, children }: {
    title: string; icon: React.ReactNode; badgeCount: number; emptyLabel: string; children: React.ReactNode;
}) => (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center flex-shrink-0">{icon}</div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            {badgeCount > 0 ? (
                <span className="text-xs font-medium bg-red-500 text-white px-2.5 py-1 rounded-full">{badgeCount} pending</span>
            ) : (
                <span className="text-xs font-medium bg-nile-green/10 text-nile-green px-2.5 py-1 rounded-full">Clear</span>
            )}
        </div>
        <div className="p-4 space-y-3">
            {badgeCount === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
                    <CheckCircle2 size={24} className="text-nile-green/40 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">{emptyLabel}</p>
                </div>
            ) : children}
        </div>
    </div>
);

const ActionButton = ({ label, isLoading, onClick, variant }: {
    label: string; isLoading: boolean; onClick: () => void; variant: 'approve' | 'reject';
}) => (
    <button onClick={onClick} disabled={isLoading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-all disabled:opacity-50
            ${variant === 'approve' ? 'bg-nile-green text-white' : 'bg-white border border-gray-200 text-red-500 hover:bg-red-50'}`}>
        {isLoading ? <Loader2 size={13} className="animate-spin" /> : variant === 'approve' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export default StaffInsights;
