import React, { useState, useEffect, useMemo } from 'react';
import {
    Briefcase, CheckCircle2, XCircle, Search, MapPin, Activity,
    Loader2, Warehouse, ClipboardList, TrendingUp, Plus, FileText,
    Clock, User, Filter, BarChart3, ChevronRight, Send,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getStaffJobs, updateJobStatus, getStaffApplications,
    getDashboardStats, postJob,
    StaffJob, StaffApplication, DashboardStats, PostJobRequest,
} from '../../services/staffService';

type MainTab = 'OVERVIEW' | 'LISTINGS' | 'PIPELINE' | 'POST';
type JobFilter = 'all' | 'pending' | 'active' | 'rejected' | 'archived';
type AppFilter = 'all' | 'applied' | 'reviewing' | 'accepted' | 'rejected';

const statusColor: Record<string, string> = {
    active:   'bg-nile-green/20 text-nile-green border-nile-green/30',
    pending:  'bg-yellow-50 text-yellow-600 border-yellow-200',
    rejected: 'bg-red-50 text-red-500 border-red-200',
    archived: 'bg-black/5 text-black/40 border-black/10',
    applied:  'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    reviewing:'bg-purple-50 text-purple-600 border-purple-200',
    accepted: 'bg-nile-green/20 text-nile-green border-nile-green/30',
};

const StaffJobs = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<MainTab>('OVERVIEW');
    const [jobs, setJobs] = useState<StaffJob[]>([]);
    const [applications, setApplications] = useState<StaffApplication[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [jobFilter, setJobFilter] = useState<JobFilter>('pending');
    const [appFilter, setAppFilter] = useState<AppFilter>('all');
    const [search, setSearch] = useState('');
    const [posting, setPosting] = useState(false);
    const [form, setForm] = useState<PostJobRequest>({
        title: '', type: 'full-time', location: '', salary: '',
        description: '', requirements: '', skills: '',
    });

    useEffect(() => {
        Promise.all([getStaffJobs(), getStaffApplications(), getDashboardStats()])
            .then(([j, a, s]) => { setJobs(j); setApplications(a); setStats(s); })
            .catch(() => showToast('Failed to load data', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const handleJobAction = async (job: StaffJob, action: 'active' | 'rejected' | 'archived') => {
        setActionLoading(p => ({ ...p, [job.id]: true }));
        try {
            await updateJobStatus(job.id, action);
            setJobs(p => p.map(j => j.id === job.id ? { ...j, status: action } : j));
            const labels: Record<string, string> = { active: 'approved', rejected: 'declined', archived: 'archived' };
            showToast(`"${job.title}" ${labels[action]}.`, action === 'active' ? 'success' : 'error');
        } catch {
            showToast('Action failed. Try again.', 'error');
        } finally {
            setActionLoading(p => ({ ...p, [job.id]: false }));
        }
    };

    const handlePostJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.location || !form.description) {
            showToast('Title, location and description are required', 'error'); return;
        }
        setPosting(true);
        try {
            await postJob(form);
            showToast('Job posted successfully!', 'success');
            setForm({ title: '', type: 'full-time', location: '', salary: '', description: '', requirements: '', skills: '' });
            const updated = await getStaffJobs();
            setJobs(updated);
            setTab('LISTINGS');
        } catch {
            showToast('Failed to post job.', 'error');
        } finally {
            setPosting(false);
        }
    };

    const filteredJobs = useMemo(() => jobs
        .filter(j => jobFilter === 'all' || j.status === jobFilter)
        .filter(j => !search ||
            j.title.toLowerCase().includes(search.toLowerCase()) ||
            (j.company || '').toLowerCase().includes(search.toLowerCase())),
        [jobs, jobFilter, search]
    );

    const filteredApps = useMemo(() => applications
        .filter(a => appFilter === 'all' || a.status === appFilter)
        .filter(a => !search ||
            (a.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.company || '').toLowerCase().includes(search.toLowerCase())),
        [applications, appFilter, search]
    );

    const pending = jobs.filter(j => j.status === 'pending');
    const active = jobs.filter(j => j.status === 'active');

    const tabs: { id: MainTab; icon: React.ReactNode; label: string; count?: number }[] = [
        { id: 'OVERVIEW',  icon: <BarChart3 size={13} />,     label: 'OVERVIEW' },
        { id: 'LISTINGS',  icon: <Briefcase size={13} />,     label: 'LISTINGS',  count: pending.length },
        { id: 'PIPELINE',  icon: <ClipboardList size={13} />, label: 'PIPELINE',  count: applications.filter(a => a.status === 'applied').length },
        { id: 'POST',      icon: <Plus size={13} />,          label: 'POST JOB' },
    ];

    if (loading) return (
        <div className="p-6 md:p-10 space-y-6 animate-pulse">
            <div className="h-14 bg-black/5 rounded-2xl w-72" />
            <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-black/5 rounded-xl w-28" />)}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-black/5 rounded-2xl" />)}</div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tighter">
                        Jobs &amp; Placement .
                    </h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                        FULL PIPELINE · LISTINGS · APPLICATIONS · PLACEMENT
                    </p>
                </div>
                <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm overflow-x-auto w-full xl:w-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
                            className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0
                                ${tab === t.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}>
                            {t.icon} {t.label}
                            {t.count !== undefined && t.count > 0 && (
                                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? 'bg-nile-green text-white' : 'bg-red-100 text-red-500'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {tab === 'OVERVIEW' && (
                <div className="space-y-8 anime-fade-in">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="TOTAL JOBS" value={jobs.length} icon={<Briefcase size={18} />} color="bg-black text-white" />
                        <StatCard label="ACTIVE" value={active.length} icon={<CheckCircle2 size={18} />} color="bg-nile-green/20 text-nile-green" />
                        <StatCard label="PENDING REVIEW" value={pending.length} icon={<Clock size={18} />} color="bg-yellow-50 text-yellow-600" accent />
                        <StatCard label="APPLICATIONS" value={applications.length} icon={<ClipboardList size={18} />} color="bg-nile-blue/10 text-nile-blue" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Pending approval */}
                        <div className="bg-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(30,73,157,0.2)]">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50">PENDING APPROVAL</h3>
                                <button onClick={() => setTab('LISTINGS')} className="text-[8px] font-black text-nile-blue uppercase tracking-wider flex items-center gap-1 hover:text-black transition-colors">
                                    VIEW ALL <ChevronRight size={10} />
                                </button>
                            </div>
                            {pending.length === 0 ? (
                                <p className="text-[9px] font-black text-black/20 uppercase py-8 text-center">ALL CAUGHT UP · NO PENDING JOBS</p>
                            ) : pending.slice(0, 4).map(job => (
                                <div key={job.id} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0 group">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 bg-nile-white rounded-lg border-[2px] border-black flex items-center justify-center flex-shrink-0">
                                            <Warehouse size={13} className="text-nile-blue" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-[10px] uppercase text-black truncate leading-none">{job.title}</p>
                                            <p className="text-[8px] font-black text-black/30 uppercase mt-0.5 truncate">{job.company || 'NILE UNIVERSITY'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0 ml-2">
                                        <button onClick={() => handleJobAction(job, 'active')}
                                            disabled={actionLoading[job.id]}
                                            className="p-1.5 bg-nile-green text-white rounded-lg border-2 border-black hover:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40">
                                            {actionLoading[job.id] ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} strokeWidth={3} />}
                                        </button>
                                        <button onClick={() => handleJobAction(job, 'rejected')}
                                            disabled={actionLoading[job.id]}
                                            className="p-1.5 bg-white text-red-500 rounded-lg border-2 border-black hover:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40">
                                            <XCircle size={11} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent applications */}
                        <div className="bg-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(108,187,86,0.3)]">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50">RECENT APPLICATIONS</h3>
                                <button onClick={() => setTab('PIPELINE')} className="text-[8px] font-black text-nile-blue uppercase tracking-wider flex items-center gap-1 hover:text-black transition-colors">
                                    VIEW ALL <ChevronRight size={10} />
                                </button>
                            </div>
                            {applications.length === 0 ? (
                                <p className="text-[9px] font-black text-black/20 uppercase py-8 text-center">NO APPLICATIONS YET</p>
                            ) : applications.slice(0, 5).map(app => (
                                <div key={app.id} className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0">
                                    <div className="w-7 h-7 bg-nile-blue text-white rounded-lg flex items-center justify-center font-black text-[10px] flex-shrink-0">
                                        {(app.student_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[9px] uppercase text-black truncate leading-none">{app.student_name || 'STUDENT'}</p>
                                        <p className="text-[7px] font-black text-black/30 uppercase mt-0.5 truncate">{app.job_title || 'POSITION'} · {app.company || '—'}</p>
                                    </div>
                                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase flex-shrink-0 ${statusColor[app.status] || 'bg-black/5 text-black/40'}`}>
                                        {app.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Job status breakdown */}
                    {jobs.length > 0 && (
                        <div className="bg-white border-[2px] border-black rounded-[24px] p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-5">JOB STATUS BREAKDOWN</h3>
                            <div className="space-y-4">
                                {(['active', 'pending', 'rejected', 'archived'] as const).map(s => {
                                    const cnt = jobs.filter(j => j.status === s).length;
                                    const pct = jobs.length > 0 ? Math.round((cnt / jobs.length) * 100) : 0;
                                    return (
                                        <div key={s} className="flex items-center gap-4">
                                            <span className="text-[8px] font-black uppercase tracking-wider text-black/50 w-20 flex-shrink-0">{s}</span>
                                            <div className="flex-1 h-3 bg-nile-white border-[2px] border-black rounded-full overflow-hidden p-0.5">
                                                <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, background: s === 'active' ? '#6CBB56' : s === 'pending' ? '#ca8a04' : s === 'rejected' ? '#ef4444' : '#d1d5db' }} />
                                            </div>
                                            <span className="text-[9px] font-black text-black w-8 text-right">{cnt}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── LISTINGS ─────────────────────────────────────────────── */}
            {tab === 'LISTINGS' && (
                <div className="space-y-6 anime-fade-in">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH JOBS..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white/60 focus:bg-white transition-all" />
                        </div>
                        <div className="flex bg-white p-1 border-[2px] border-black rounded-xl gap-0.5">
                            {(['all', 'pending', 'active', 'rejected', 'archived'] as JobFilter[]).map(f => (
                                <button key={f} onClick={() => setJobFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider transition-all whitespace-nowrap
                                        ${jobFilter === f ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}>
                                    {f}
                                    {f !== 'all' && (
                                        <span className={`ml-1 ${jobFilter === f ? 'text-white/70' : 'text-black/30'}`}>
                                            {jobs.filter(j => j.status === f).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredJobs.length === 0 ? (
                        <EmptyState icon={<Briefcase size={28} />} label={search ? 'No jobs match your search' : `No ${jobFilter} jobs`} />
                    ) : (
                        <div className="space-y-4">
                            {filteredJobs.map(job => (
                                <div key={job.id} className="bg-white border-[2px] border-black rounded-[24px] p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:translate-y-[-1px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(30,73,157,0.4)] transition-all">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-12 h-12 bg-nile-white rounded-2xl border-[2px] border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <Warehouse size={18} className="text-nile-blue" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="font-black text-sm uppercase text-black truncate">{job.title}</h3>
                                                <span className="text-[7px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase">{job.type}</span>
                                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[job.status] || 'bg-black/5 text-black/30'}`}>
                                                    {job.status}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-black text-nile-blue uppercase tracking-wider truncate">{job.company || 'NILE UNIVERSITY'}</p>
                                            <div className="flex gap-4 mt-1 text-[8px] font-black text-black/30 uppercase">
                                                {job.location && <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>}
                                                <span><Clock size={10} className="inline mr-1" />{new Date(job.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {job.status === 'pending' && (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button onClick={() => handleJobAction(job, 'active')} disabled={actionLoading[job.id]}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-40">
                                                {actionLoading[job.id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} strokeWidth={3} />}
                                                APPROVE
                                            </button>
                                            <button onClick={() => handleJobAction(job, 'rejected')} disabled={actionLoading[job.id]}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-red-500 border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-40">
                                                <XCircle size={12} strokeWidth={3} /> DECLINE
                                            </button>
                                        </div>
                                    )}
                                    {job.status === 'active' && (
                                        <button onClick={() => handleJobAction(job, 'archived')} disabled={actionLoading[job.id]}
                                            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-black/50 border-[2px] border-black/20 rounded-xl font-black text-[8px] uppercase hover:border-black hover:text-black transition-all disabled:opacity-40">
                                            <Activity size={12} /> ARCHIVE
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── PIPELINE ─────────────────────────────────────────────── */}
            {tab === 'PIPELINE' && (
                <div className="space-y-6 anime-fade-in">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH APPLICATIONS..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white/60 focus:bg-white transition-all" />
                        </div>
                        <div className="flex bg-white p-1 border-[2px] border-black rounded-xl gap-0.5 flex-wrap">
                            {(['all', 'applied', 'reviewing', 'accepted', 'rejected'] as AppFilter[]).map(f => (
                                <button key={f} onClick={() => setAppFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider transition-all
                                        ${appFilter === f ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}>
                                    {f} {f !== 'all' && <span className={appFilter === f ? 'text-white/60' : 'text-black/20'}>{applications.filter(a => a.status === f).length}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredApps.length === 0 ? (
                        <EmptyState icon={<ClipboardList size={28} />} label={search ? 'No matches' : `No ${appFilter === 'all' ? '' : appFilter} applications`} />
                    ) : (
                        <div className="space-y-3">
                            {filteredApps.map(app => (
                                <div key={app.id} className="bg-white border-[2px] border-black rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                                        {(app.student_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <p className="font-black text-sm uppercase text-black truncate">{app.student_name || 'STUDENT'}</p>
                                            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[app.status] || 'bg-black/5 text-black/40'}`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black text-nile-blue uppercase truncate">
                                            {app.job_title || 'POSITION'} · {app.company || '—'}
                                        </p>
                                        {app.applied_at && (
                                            <p className="text-[7px] font-black text-black/30 uppercase mt-0.5">
                                                APPLIED {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <User size={12} className="text-black/20" />
                                        <span className="text-[8px] font-black text-black/30 uppercase truncate max-w-[80px]">{app.company || '—'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── POST JOB ─────────────────────────────────────────────── */}
            {tab === 'POST' && (
                <div className="max-w-2xl space-y-6 anime-fade-in">
                    <div className="bg-white border-[2px] border-black rounded-[28px] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3 mb-6 pb-5 border-b-[2px] border-black/5">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                                <FileText size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Post a New Job</h3>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest">POSTED DIRECTLY AS NILE UNIVERSITY · ACTIVE IMMEDIATELY</p>
                            </div>
                        </div>

                        <form onSubmit={handlePostJob} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="JOB TITLE *">
                                    <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Software Engineer Intern"
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </Field>
                                <Field label="JOB TYPE">
                                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-white cursor-pointer transition-all">
                                        <option value="full-time">Full-Time</option>
                                        <option value="part-time">Part-Time</option>
                                        <option value="internship">Internship</option>
                                        <option value="contract">Contract</option>
                                        <option value="volunteer">Volunteer</option>
                                    </select>
                                </Field>
                                <Field label="LOCATION *">
                                    <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                        placeholder="e.g. Abuja, Nigeria / Remote"
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </Field>
                                <Field label="SALARY / STIPEND">
                                    <input type="text" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                                        placeholder="e.g. ₦150,000 / month"
                                        className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                                </Field>
                            </div>
                            <Field label="DESCRIPTION *">
                                <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Describe the role, responsibilities, and what students will gain..."
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all resize-none" />
                            </Field>
                            <Field label="REQUIREMENTS">
                                <textarea rows={3} value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))}
                                    placeholder="List key requirements (one per line)..."
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all resize-none" />
                            </Field>
                            <Field label="SKILLS">
                                <input type="text" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                                    placeholder="e.g. React, Node.js, Python (comma-separated)"
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] bg-nile-white/40 focus:bg-white transition-all" />
                            </Field>

                            <button type="submit" disabled={posting}
                                className="w-full py-4 bg-black text-white border-[2px] border-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#6CBB56] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {posting ? 'POSTING...' : 'POST JOB LISTING'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon, color, accent }: {
    label: string; value: number; icon: React.ReactNode; color: string; accent?: boolean;
}) => (
    <div className={`border-[2px] border-black rounded-[20px] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${color.includes('bg-black') ? color : `bg-white ${color}`}`}>
        <div className="flex justify-between items-start mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.includes('bg-black') ? 'bg-white/10' : 'bg-black/5'}`}>
                {icon}
            </div>
            {accent && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
        </div>
        <p className={`text-2xl md:text-3xl font-black leading-none ${color.includes('bg-black') ? 'text-white' : ''}`}>{value.toLocaleString()}</p>
        <p className={`text-[7px] font-black uppercase tracking-[0.2em] mt-1.5 ${color.includes('bg-black') ? 'text-white/50' : 'opacity-60'}`}>{label}</p>
    </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-black/50">{label}</label>
        {children}
    </div>
);

const EmptyState = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
        <div className="text-black/20 mx-auto mb-3 flex justify-center">{icon}</div>
        <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">{label}</p>
    </div>
);

export default StaffJobs;
