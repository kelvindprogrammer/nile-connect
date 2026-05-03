import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Building2, Briefcase, ClipboardList, CheckCircle2,
    XCircle, ShieldCheck, FileText, BarChart2, MessageSquare,
    Loader2, CalendarDays, TrendingUp
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import {
    getDashboardStats,
    getStaffEmployers,
    getStaffJobs,
    updateEmployerStatus,
    updateJobStatus,
    DashboardStats,
    StaffEmployer,
    StaffJob,
} from '../../services/staffService';

// ── Loading Skeleton ──────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-pulse bg-nile-white min-h-full">
        <div className="h-44 md:h-52 bg-black/5 rounded-[24px] md:rounded-[40px] border-[2px] border-black/5" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 md:h-36 bg-black/5 rounded-[20px]" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-10">
            <div className="xl:col-span-8 space-y-6">
                <div className="h-80 bg-black/5 rounded-[28px]" />
                <div className="h-80 bg-black/5 rounded-[28px]" />
            </div>
            <div className="xl:col-span-4 space-y-6">
                <div className="h-60 bg-black/5 rounded-[28px]" />
                <div className="h-72 bg-black/5 rounded-[28px]" />
            </div>
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [employers, setEmployers] = useState<StaffEmployer[]>([]);
    const [jobs, setJobs] = useState<StaffJob[]>([]);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const staffName = (user as any)?.full_name || (user as any)?.name || 'ADMIN';
    const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

    const fetchAll = useCallback(async () => {
        try {
            const [s, e, j] = await Promise.all([
                getDashboardStats(),
                getStaffEmployers(),
                getStaffJobs(),
            ]);
            setStats(s);
            setEmployers(e);
            setJobs(j);
        } catch {
            showToast('Failed to load dashboard data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const pendingEmployers = employers.filter(e => e.status === 'pending');
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    const totalPending = pendingEmployers.length + pendingJobs.length;

    const handleEmployerAction = async (id: string, companyName: string, status: 'approved' | 'rejected') => {
        setActionLoading(prev => ({ ...prev, [`emp-${id}`]: true }));
        try {
            await updateEmployerStatus(id, status);
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

    if (isLoading) return <LoadingSkeleton />;

    const statCards = [
        { label: 'TOTAL STUDENTS', value: stats?.total_students ?? 0, icon: <Users size={18} />, color: 'bg-black text-white' },
        { label: 'TOTAL EMPLOYERS', value: stats?.total_employers ?? 0, icon: <Building2 size={18} />, color: 'bg-nile-green/20 text-nile-green' },
        { label: 'ACTIVE JOBS', value: stats?.active_jobs ?? 0, icon: <Briefcase size={18} />, color: 'bg-nile-blue/10 text-nile-blue' },
        { label: 'APPLICATIONS', value: stats?.total_applications ?? 0, icon: <ClipboardList size={18} />, color: 'bg-black/5 text-black' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 anime-fade-in font-sans bg-nile-white min-h-full pb-20 md:pb-8 text-left">

            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="bg-white border-[2px] md:border-[3px] border-black rounded-[24px] md:rounded-[40px] shadow-[4px_4px_0px_0px_#000] md:shadow-[8px_8px_0px_0px_#000] p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-black/[0.03] -skew-x-12 translate-x-1/2 pointer-events-none" />

                <div className="space-y-4 z-10 w-full md:max-w-lg">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-black text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                            STAFF CONSOLE
                        </span>
                        {totalPending > 0 && (
                            <span className="px-3 py-1 bg-red-500 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                {totalPending} PENDING
                            </span>
                        )}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tighter">
                        WELCOME,<br />
                        <span className="text-nile-green">{staffName}</span>
                    </h2>
                    <p className="text-[10px] md:text-xs font-bold text-black/40 uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays size={12} /> {today}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button onClick={() => navigate('/services')} size="sm">
                            <FileText size={14} className="mr-1.5" /> CV REVIEW
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/applications')}>
                            <ShieldCheck size={14} className="mr-1.5" /> VERIFICATIONS
                        </Button>
                    </div>
                </div>

                <div className="hidden md:flex flex-col justify-between w-64 h-44 bg-white border-[3px] border-black rounded-[28px] p-6 shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] z-10 flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[9px] font-black text-black/30 uppercase tracking-widest">LIVE METRICS</span>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-4xl font-black text-black leading-none">
                            {stats ? (stats.pending_employers + stats.pending_jobs) : '—'}
                        </h4>
                        <p className="text-[9px] font-black text-black/40 uppercase tracking-widest">ITEMS AWAITING ACTION</p>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black text-nile-green uppercase tracking-widest">
                        <CheckCircle2 size={12} strokeWidth={3} />
                        <span>PLATFORM OPERATIONAL</span>
                    </div>
                </div>
            </section>

            {/* ── Stat Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCards.map(s => (
                    <div key={s.label} className="bg-white border-[2px] border-black rounded-[20px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 hover:translate-y-[-3px] transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 border-black flex items-center justify-center ${s.color}`}>
                                {s.icon}
                            </div>
                            <span className="text-[8px] font-black bg-black/5 text-black/40 px-2 py-0.5 rounded-full border border-black/10 uppercase tracking-wider">LIVE</span>
                        </div>
                        <h3 className="text-2xl md:text-4xl font-black text-black leading-none tracking-tighter">
                            {s.value.toLocaleString()}
                        </h3>
                        <p className="text-[8px] md:text-[10px] font-black text-black/40 uppercase mt-2 tracking-widest">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Operational Grid ─────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">

                {/* Left: Queues */}
                <div className="xl:col-span-8 space-y-8">

                    {/* Employer Verification Queue */}
                    <QueueSection
                        title="EMPLOYER VERIFICATION QUEUE"
                        icon={<Building2 size={16} />}
                        badgeCount={pendingEmployers.length}
                        emptyLabel="No pending employer verifications"
                    >
                        {pendingEmployers.map(emp => (
                            <div key={emp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 bg-nile-white/60 border-[2px] border-black rounded-[20px] hover:bg-white transition-all gap-4">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                                        {emp.company_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-[12px] md:text-sm uppercase text-black leading-none mb-1 truncate">{emp.company_name}</p>
                                        <p className="text-[8px] md:text-[9px] font-black text-black/40 uppercase tracking-wider truncate">
                                            {emp.industry} &bull; {emp.location}
                                        </p>
                                        <p className="text-[8px] font-bold text-nile-blue/60 truncate">{emp.contact_email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button className="px-3 py-2 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                                                REVIEW
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>{emp.company_name}</DialogTitle>
                                                <DialogDescription>{emp.industry} &bull; {emp.location}</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4 text-left">
                                                <div>
                                                    <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">COMPANY PROFILE</p>
                                                    <p className="text-xs font-bold text-black leading-relaxed">{emp.about || 'No description provided.'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">CONTACT EMAIL</p>
                                                        <p className="text-[10px] font-black text-nile-blue">{emp.contact_email}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">WEBSITE</p>
                                                        <p className="text-[10px] font-black text-nile-blue">{emp.website || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter className="gap-2">
                                                <Button variant="nile-green" onClick={() => handleEmployerAction(emp.id, emp.company_name, 'approved')}>APPROVE</Button>
                                                <Button variant="outline" className="text-red-500 border-red-500" onClick={() => handleEmployerAction(emp.id, emp.company_name, 'rejected')}>REJECT</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <ActionButton
                                        label="APPROVE"
                                        isLoading={actionLoading[`emp-${emp.id}`]}
                                        onClick={() => handleEmployerAction(emp.id, emp.company_name, 'approved')}
                                        variant="approve"
                                    />
                                </div>
                            </div>
                        ))}
                    </QueueSection>

                    {/* Job Approval Queue */}
                    <QueueSection
                        title="JOB APPROVAL QUEUE"
                        icon={<Briefcase size={16} />}
                        badgeCount={pendingJobs.length}
                        emptyLabel="No pending job approvals"
                    >
                        {pendingJobs.map(job => (
                            <div key={job.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 bg-nile-white/60 border-[2px] border-black rounded-[20px] hover:bg-white transition-all gap-4">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-10 h-10 bg-nile-blue/10 text-nile-blue rounded-xl flex items-center justify-center border-2 border-black flex-shrink-0">
                                        <Briefcase size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-[12px] md:text-sm uppercase text-black leading-none mb-1 truncate">{job.title}</p>
                                        <p className="text-[8px] md:text-[9px] font-black text-black/40 uppercase tracking-wider truncate">
                                            {job.company} &bull; {job.type} &bull; {job.location}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button className="px-3 py-2 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                                                REVIEW
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>{job.title}</DialogTitle>
                                                <DialogDescription>{job.company} &bull; {job.type} &bull; {job.location}</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4 text-left max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                                <div>
                                                    <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">DESCRIPTION</p>
                                                    <p className="text-xs font-bold text-black leading-relaxed whitespace-pre-wrap">{job.description}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">REQUIREMENTS</p>
                                                    <p className="text-[10px] font-bold text-black/60 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">SALARY</p>
                                                        <p className="text-[10px] font-black text-nile-blue">{job.salary || 'NOT SPECIFIED'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mb-1">SKILLS</p>
                                                        <p className="text-[10px] font-black text-nile-blue">{job.skills || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter className="gap-2">
                                                <Button variant="nile-green" onClick={() => handleJobAction(job.id, job.title, 'active')}>APPROVE JOB</Button>
                                                <Button variant="outline" className="text-red-500 border-red-500" onClick={() => handleJobAction(job.id, job.title, 'rejected')}>REJECT</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <ActionButton
                                        label="APPROVE"
                                        isLoading={actionLoading[`job-${job.id}`]}
                                        onClick={() => handleJobAction(job.id, job.title, 'active')}
                                        variant="approve"
                                    />
                                </div>
                            </div>
                        ))}
                    </QueueSection>
                </div>

                {/* Right: Sidebar */}
                <div className="xl:col-span-4 space-y-8">

                    {/* Quick Actions */}
                    <Card title="QUICK ACTIONS">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'REVIEW CVs', icon: <FileText size={18} />, path: '/staff/services', color: 'bg-black text-white' },
                                { label: 'ALL STUDENTS', icon: <Users size={18} />, path: '/staff/services?tab=students', color: 'bg-nile-green/20 text-nile-green' },
                                { label: 'GENERATE REPORT', icon: <BarChart2 size={18} />, path: '/staff/services?tab=reporting', color: 'bg-nile-blue/10 text-nile-blue' },
                                { label: 'CRM', icon: <MessageSquare size={18} />, path: '/staff/crm', color: 'bg-black/5 text-black' },
                                { label: 'ACTIVITY FEED', icon: <TrendingUp size={18} />, path: '/staff/activity', color: 'bg-nile-blue/10 text-nile-blue' },
                            ].map(qa => (
                                <button
                                    key={qa.label}
                                    onClick={() => navigate(qa.path)}
                                    className="flex flex-col items-start gap-3 p-4 bg-nile-white border-[2px] border-black rounded-[16px] hover:bg-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all text-left"
                                >
                                    <div className={`w-9 h-9 rounded-lg border-2 border-black flex items-center justify-center ${qa.color}`}>
                                        {qa.icon}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-black leading-tight">{qa.label}</span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Engagement Metrics */}
                    <Card title="ENGAGEMENT METRICS">
                        <div className="space-y-5">
                            {[
                                { label: 'STUDENTS', value: stats?.total_students ?? 0, max: Math.max(stats?.total_students ?? 1, 1), color: 'bg-black' },
                                { label: 'EMPLOYERS', value: stats?.total_employers ?? 0, max: Math.max(stats?.total_employers ?? 1, 1), color: 'bg-nile-green' },
                                { label: 'ACTIVE JOBS', value: stats?.active_jobs ?? 0, max: Math.max(stats?.active_jobs ?? 1, 1), color: 'bg-nile-blue' },
                                { label: 'APPLICATIONS', value: stats?.total_applications ?? 0, max: Math.max(stats?.total_applications ?? 1, 1), color: 'bg-black/60' },
                            ].map(bar => {
                                const total = (stats?.total_students ?? 1) + (stats?.total_employers ?? 0) + (stats?.active_jobs ?? 0) + (stats?.total_applications ?? 0);
                                const pct = total > 0 ? Math.round((bar.value / total) * 100) : 0;
                                return (
                                    <div key={bar.label} className="space-y-1.5">
                                        <div className="flex justify-between text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-black/60">{bar.label}</span>
                                            <span className="text-black">{bar.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-3 bg-nile-white border-[2px] border-black rounded-full overflow-hidden p-0.5">
                                            <div
                                                className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                                                style={{ width: `${Math.max(pct, 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {stats && (
                                <div className="pt-3 border-t-[2px] border-black/5 grid grid-cols-2 gap-3">
                                    <div className="bg-nile-white border-[2px] border-black rounded-[12px] p-3 text-center">
                                        <p className="text-lg font-black text-black leading-none">{stats.pending_employers}</p>
                                        <p className="text-[7px] font-black uppercase tracking-widest text-black/40 mt-1">PENDING EMP.</p>
                                    </div>
                                    <div className="bg-nile-white border-[2px] border-black rounded-[12px] p-3 text-center">
                                        <p className="text-lg font-black text-black leading-none">{stats.upcoming_events}</p>
                                        <p className="text-[7px] font-black uppercase tracking-widest text-black/40 mt-1">UPCOMING EVT.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const QueueSection = ({
    title, icon, badgeCount, emptyLabel, children
}: {
    title: string;
    icon: React.ReactNode;
    badgeCount: number;
    emptyLabel: string;
    children: React.ReactNode;
}) => (
    <div className="bg-white border-[2px] border-black rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b-[2px] border-black/5">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    {icon}
                </div>
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-black">{title}</h3>
            </div>
            {badgeCount > 0 ? (
                <span className="text-[8px] font-black bg-red-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {badgeCount} PENDING
                </span>
            ) : (
                <span className="text-[8px] font-black bg-nile-green/20 text-nile-green px-2.5 py-1 rounded-full uppercase tracking-wider">
                    CLEAR
                </span>
            )}
        </div>
        <div className="p-4 md:p-5 space-y-3">
            {React.Children.count(children) === 0 || badgeCount === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-black/10 rounded-[20px]">
                    <CheckCircle2 size={28} className="text-nile-green/30 mx-auto mb-3" />
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">{emptyLabel}</p>
                </div>
            ) : children}
        </div>
    </div>
);

const ActionButton = ({
    label, isLoading, onClick, variant
}: {
    label: string;
    isLoading: boolean;
    onClick: () => void;
    variant: 'approve' | 'reject';
}) => (
    <button
        onClick={onClick}
        disabled={isLoading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-black font-black text-[9px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:pointer-events-none
            ${variant === 'approve'
                ? 'bg-nile-green text-white'
                : 'bg-white text-red-500 hover:bg-red-50'
            }`}
    >
        {isLoading
            ? <Loader2 size={12} className="animate-spin" />
            : variant === 'approve'
                ? <CheckCircle2 size={12} strokeWidth={3} />
                : <XCircle size={12} strokeWidth={3} />
        }
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export default StaffDashboard;
