import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ClipboardList, Building2, Search, CheckCircle2, XCircle,
    Loader2, AlertCircle, ShieldCheck, Clock, Users
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import {
    getStaffApplications,
    getStaffEmployers,
    updateEmployerStatus,
    StaffApplication,
    StaffEmployer,
} from '../../services/staffService';

// ── Types ─────────────────────────────────────────────────────────────────────

type MainTab = 'PIPELINE' | 'EMPLOYER VERIFICATION';
type StatusFilter = 'ALL' | 'applied' | 'interview' | 'offer' | 'rejected';
type EmployerSubTab = 'PENDING' | 'APPROVED' | 'REJECTED';

// ── Loading Skeleton ──────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-14 bg-black/5 rounded-2xl w-72" />
        <div className="flex gap-2">
            {[1, 2].map(i => <div key={i} className="h-10 bg-black/5 rounded-xl w-48" />)}
        </div>
        <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-black/5 rounded-[20px]" />)}
        </div>
    </div>
);

// ── Status badge helpers ──────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    applied:   { label: 'APPLIED',    bg: 'bg-blue-50',    text: 'text-blue-600' },
    interview: { label: 'INTERVIEW',  bg: 'bg-yellow-50',  text: 'text-yellow-600' },
    offer:     { label: 'OFFER',      bg: 'bg-nile-green/20', text: 'text-nile-green' },
    rejected:  { label: 'REJECTED',   bg: 'bg-red-50',     text: 'text-red-500' },
};

const getStatusConfig = (status: string) =>
    statusConfig[status.toLowerCase()] ?? { label: status.toUpperCase(), bg: 'bg-black/5', text: 'text-black/60' };

// ── Main Component ────────────────────────────────────────────────────────────

const StaffApplications = () => {
    const { showToast } = useToast();

    const [mainTab, setMainTab] = useState<MainTab>('PIPELINE');
    const [applications, setApplications] = useState<StaffApplication[]>([]);
    const [employers, setEmployers] = useState<StaffEmployer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Pipeline filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    // Employer sub-tab
    const [empSubTab, setEmpSubTab] = useState<EmployerSubTab>('PENDING');

    const fetchAll = useCallback(async () => {
        try {
            const [apps, emps] = await Promise.all([
                getStaffApplications(),
                getStaffEmployers(),
            ]);
            setApplications(apps);
            setEmployers(emps);
        } catch {
            showToast('Failed to load data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const pendingEmployers = useMemo(() => employers.filter(e => e.status === 'pending'), [employers]);

    const filteredApps = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch = !search ||
                app.student_name.toLowerCase().includes(search.toLowerCase()) ||
                app.company.toLowerCase().includes(search.toLowerCase()) ||
                app.job_title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || app.status.toLowerCase() === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [applications, search, statusFilter]);

    const empsBySubTab = useMemo(() => {
        const map: Record<EmployerSubTab, string> = {
            PENDING: 'pending',
            APPROVED: 'approved',
            REJECTED: 'rejected',
        };
        return employers.filter(e => e.status === map[empSubTab]);
    }, [employers, empSubTab]);

    const handleEmployerAction = async (emp: StaffEmployer, status: 'approved' | 'rejected') => {
        setActionLoading(prev => ({ ...prev, [emp.id]: true }));
        try {
            await updateEmployerStatus(emp.id, status);
            setEmployers(prev => prev.map(e => e.id === emp.id ? { ...e, status } : e));
            showToast(
                `${emp.company_name} has been ${status}.`,
                status === 'approved' ? 'success' : 'error'
            );
        } catch {
            showToast(`Failed to update ${emp.company_name}.`, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [emp.id]: false }));
        }
    };

    const statusFilters: StatusFilter[] = ['ALL', 'applied', 'interview', 'offer', 'rejected'];

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b-[2px] border-black pb-6">
                <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">
                        Pipeline Hub
                    </h2>
                    <p className="text-[9px] md:text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">
                        APPLICATIONS &amp; EMPLOYER MANAGEMENT
                    </p>
                </div>

                <div className="flex flex-wrap gap-1 bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm">
                    {(['PIPELINE', 'EMPLOYER VERIFICATION'] as MainTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setMainTab(tab)}
                            className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all flex items-center gap-2 whitespace-nowrap
                                ${mainTab === tab ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}
                        >
                            {tab === 'PIPELINE' ? <ClipboardList size={13} /> : <ShieldCheck size={13} />}
                            <span>{tab}</span>
                            {tab === 'EMPLOYER VERIFICATION' && pendingEmployers.length > 0 && (
                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[7px] font-black
                                    ${mainTab === tab ? 'bg-red-500 text-white' : 'bg-red-100 text-red-500'}`}>
                                    {pendingEmployers.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── APPLICATION PIPELINE ──────────────────────────────── */}
            {mainTab === 'PIPELINE' && (
                <div className="space-y-6 anime-fade-in">
                    {/* Count */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="px-4 py-2 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest">
                            {filteredApps.length} {filteredApps.length === 1 ? 'APPLICATION' : 'APPLICATIONS'}
                        </span>
                        {statusFilter !== 'ALL' && (
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className="text-[8px] font-black text-black/40 uppercase tracking-widest underline"
                            >
                                CLEAR FILTER
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="SEARCH BY STUDENT, JOB TITLE, OR COMPANY..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all bg-nile-white/60 focus:bg-white"
                        />
                    </div>

                    {/* Status filters */}
                    <div className="flex flex-wrap gap-2">
                        {statusFilters.map(sf => {
                            const cfg = sf === 'ALL' ? null : getStatusConfig(sf);
                            const count = sf === 'ALL' ? applications.length : applications.filter(a => a.status.toLowerCase() === sf).length;
                            return (
                                <button
                                    key={sf}
                                    onClick={() => setStatusFilter(sf)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-black font-black text-[8px] uppercase tracking-widest transition-all
                                        ${statusFilter === sf ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'}`}
                                >
                                    {sf}
                                    <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[7px] ${statusFilter === sf ? 'bg-white/20 text-white' : cfg ? `${cfg.bg} ${cfg.text}` : 'bg-black/10 text-black/60'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Applications list */}
                    {filteredApps.length === 0 ? (
                        <EmptyState icon={<ClipboardList size={28} />} label="No applications match your filters" />
                    ) : (
                        <div className="space-y-3">
                            {filteredApps.map(app => {
                                const sc = getStatusConfig(app.status);
                                return (
                                    <div key={app.id} className="bg-white border-[2px] border-black rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <Avatar name={app.student_name || '?'} size="sm" />
                                            <div className="min-w-0">
                                                <p className="font-black text-sm uppercase text-black leading-none mb-1 truncate">{app.student_name || 'Unknown Student'}</p>
                                                <p className="text-[8px] font-black text-black/40 uppercase tracking-wider truncate">
                                                    {app.job_title || 'N/A'} &bull; {app.company || 'N/A'}
                                                </p>
                                                {app.applied_at && (
                                                    <p className="text-[7px] font-bold text-black/20 uppercase flex items-center gap-1 mt-0.5">
                                                        <Clock size={9} />
                                                        {new Date(app.applied_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-[8px] font-black px-3 py-1.5 rounded-xl border-[2px] border-black uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                                            {sc.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── EMPLOYER VERIFICATION ─────────────────────────────── */}
            {mainTab === 'EMPLOYER VERIFICATION' && (
                <div className="space-y-6 anime-fade-in">
                    {/* Sub-tab bar */}
                    <div className="flex flex-wrap gap-1 bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm w-fit">
                        {(['PENDING', 'APPROVED', 'REJECTED'] as EmployerSubTab[]).map(sub => {
                            const counts: Record<EmployerSubTab, number> = {
                                PENDING: pendingEmployers.length,
                                APPROVED: employers.filter(e => e.status === 'approved').length,
                                REJECTED: employers.filter(e => e.status === 'rejected').length,
                            };
                            return (
                                <button
                                    key={sub}
                                    onClick={() => setEmpSubTab(sub)}
                                    className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all flex items-center gap-2
                                        ${empSubTab === sub ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
                                >
                                    {sub}
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[7px] font-black
                                        ${empSubTab === sub
                                            ? sub === 'PENDING' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
                                            : sub === 'PENDING' ? 'bg-red-100 text-red-500' : 'bg-black/10 text-black/60'}`}>
                                        {counts[sub]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Employer cards */}
                    {empsBySubTab.length === 0 ? (
                        <EmptyState
                            icon={<Building2 size={28} />}
                            label={`No ${empSubTab.toLowerCase()} employers`}
                        />
                    ) : (
                        <div className="space-y-3">
                            {empsBySubTab.map(emp => (
                                <div key={emp.id} className="bg-white border-[2px] border-black rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 border-2 border-black">
                                            {emp.company_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="font-black text-sm uppercase text-black leading-none truncate">{emp.company_name}</p>
                                                <StatusBadge status={emp.status} />
                                            </div>
                                            <p className="text-[8px] font-black text-black/40 uppercase tracking-wider truncate">
                                                {emp.industry} &bull; {emp.location}
                                            </p>
                                            <p className="text-[8px] font-bold text-nile-blue/50 truncate">{emp.contact_email}</p>
                                            <p className="text-[7px] font-black text-black/20 uppercase flex items-center gap-1 mt-0.5">
                                                <Clock size={9} />
                                                REGISTERED {new Date(emp.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {empSubTab === 'PENDING' && (
                                        <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                            <button
                                                onClick={() => handleEmployerAction(emp, 'approved')}
                                                disabled={actionLoading[emp.id]}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50"
                                            >
                                                {actionLoading[emp.id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} strokeWidth={3} />}
                                                <span className="hidden sm:inline">APPROVE</span>
                                            </button>
                                            <button
                                                onClick={() => handleEmployerAction(emp, 'rejected')}
                                                disabled={actionLoading[emp.id]}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-red-500 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 hover:bg-red-50"
                                            >
                                                {actionLoading[emp.id] ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} strokeWidth={3} />}
                                                <span className="hidden sm:inline">REJECT</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const EmptyState = ({ label, icon }: { label: string; icon: React.ReactNode }) => (
    <div className="py-20 text-center border-2 border-dashed border-black/10 rounded-[28px]">
        <div className="text-black/20 mx-auto mb-3 flex justify-center">{icon}</div>
        <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">{label}</p>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, string> = {
        pending:  'bg-yellow-50 text-yellow-600',
        approved: 'bg-nile-green/20 text-nile-green',
        rejected: 'bg-red-50 text-red-500',
    };
    const cls = configs[status] ?? 'bg-black/5 text-black/60';
    return (
        <span className={`text-[7px] font-black px-2 py-0.5 rounded border-[1.5px] border-black uppercase ${cls}`}>
            {status.toUpperCase()}
        </span>
    );
};

export default StaffApplications;
