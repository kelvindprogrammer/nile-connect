import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Briefcase, CheckCircle2, XCircle, Search, MapPin,
    Loader2, Archive, ClipboardList, Plus, FileText,
    Send, Building2, CalendarDays, Users,
    AlertCircle, BadgeCheck, Hourglass,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getStaffJobs,
    updateJobStatus,
    getStaffApplications,
    postJob,
    StaffJob,
    StaffApplication,
    PostJobRequest,
} from '../../services/staffService';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'POST_JOB' | 'PENDING_APPROVAL' | 'ACTIVE_JOBS' | 'APPLICATIONS';
type JobTypeFilter = 'all' | 'full-time' | 'part-time' | 'internship' | 'remote' | 'hybrid';
type AppStatusGroup = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_TYPES: { value: string; label: string }[] = [
    { value: 'full-time',  label: 'Full-Time'  },
    { value: 'part-time',  label: 'Part-Time'  },
    { value: 'internship', label: 'Internship' },
    { value: 'remote',     label: 'Remote'     },
    { value: 'hybrid',     label: 'Hybrid'     },
];

const APP_STATUS_GROUPS: { key: AppStatusGroup; label: string; color: string; bg: string; dot: string }[] = [
    { key: 'applied',   label: 'Applied',   color: 'text-nile-blue',  bg: 'bg-nile-blue/10 border-nile-blue/20',   dot: '#1E499D' },
    { key: 'screening', label: 'Screening', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200',        dot: '#9333ea' },
    { key: 'interview', label: 'Interview', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200',        dot: '#ca8a04' },
    { key: 'offer',     label: 'Offer',     color: 'text-nile-green', bg: 'bg-nile-green/10 border-nile-green/20', dot: '#6CBB56' },
    { key: 'rejected',  label: 'Rejected',  color: 'text-red-500',   bg: 'bg-red-50 border-red-200',              dot: '#ef4444' },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
    'full-time':  'bg-nile-blue/10 text-nile-blue border-nile-blue/30',
    'part-time':  'bg-purple-50 text-purple-600 border-purple-200',
    'internship': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'remote':     'bg-nile-green/10 text-nile-green border-nile-green/30',
    'hybrid':     'bg-orange-50 text-orange-500 border-orange-200',
};

const STATUS_BADGE: Record<string, string> = {
    pending:  'bg-yellow-50 text-yellow-600 border-yellow-200',
    active:   'bg-nile-green/15 text-nile-green border-nile-green/30',
    rejected: 'bg-red-50 text-red-500 border-red-200',
    archived: 'bg-black/5 text-black/40 border-black/10',
};

const EMPTY_FORM: PostJobRequest = {
    title: '', type: 'full-time', location: '', salary: '',
    description: '', requirements: '', skills: '',
};

// ─── Helper: company initials ──────────────────────────────────────────────────

function initials(name: string): string {
    return (name || 'N')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode; required?: boolean }> = ({ label, children, required }) => (
    <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-black/50">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = [
    'w-full border-[2px] border-black rounded-xl py-3 px-4',
    'font-black text-xs outline-none',
    'focus:shadow-[3px_3px_0px_0px_#1E499D]',
    'bg-[#F8F9FB]/60 focus:bg-white',
    'transition-all placeholder:text-black/20 placeholder:font-bold placeholder:normal-case placeholder:tracking-normal',
].join(' ');

const EmptyState: React.FC<{ icon: React.ReactNode; headline: string; sub?: string; action?: { label: string; onClick: () => void } }> = ({
    icon, headline, sub, action,
}) => (
    <div className="py-20 flex flex-col items-center text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
        <div className="text-black/20 mb-4">{icon}</div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">{headline}</p>
        {sub && <p className="text-[8px] font-black text-black/20 uppercase tracking-wider mt-1">{sub}</p>}
        {action && (
            <button
                onClick={action.onClick}
                className="mt-5 px-5 py-2.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#6CBB56] transition-all">
                {action.label}
            </button>
        )}
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white border-[2px] border-black/10 rounded-[24px] p-5 animate-pulse space-y-3">
        <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-black/5 rounded-lg w-3/4" />
                <div className="h-2.5 bg-black/5 rounded-lg w-1/2" />
                <div className="h-2 bg-black/5 rounded-lg w-1/3" />
            </div>
        </div>
        <div className="flex gap-2 pt-1">
            <div className="h-8 bg-black/5 rounded-xl flex-1" />
            <div className="h-8 bg-black/5 rounded-xl w-20" />
        </div>
    </div>
);

// ─── Job Card ─────────────────────────────────────────────────────────────────

interface JobCardProps {
    job: StaffJob;
    applicantCount?: number;
    actionLoading: Record<string, boolean>;
    onAction: (job: StaffJob, action: 'active' | 'rejected' | 'archived') => void;
    showApprovalActions?: boolean;
    showArchiveAction?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({
    job, applicantCount, actionLoading, onAction,
    showApprovalActions = false, showArchiveAction = false,
}) => {
    const companyName = job.company || 'Nile University';
    const typeBadge = TYPE_BADGE_COLORS[job.type] ?? 'bg-black/5 text-black/50 border-black/10';
    const statusBadge = STATUS_BADGE[job.status] ?? 'bg-black/5 text-black/30 border-black/10';
    const busy = actionLoading[job.id] ?? false;

    return (
        <div className="group bg-white border-[2px] border-black rounded-[24px] p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] hover:shadow-[5px_5px_0px_0px_rgba(30,73,157,0.35)] hover:-translate-y-[2px] transition-all duration-200">

            {/* Company avatar */}
            <div className="w-12 h-12 bg-nile-blue text-white rounded-2xl border-[2px] border-black flex items-center justify-center font-black text-sm flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-black transition-colors duration-200">
                {initials(companyName)}
            </div>

            {/* Info block */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-sm uppercase text-black truncate leading-none">{job.title}</h3>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${typeBadge}`}>{job.type}</span>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusBadge}`}>{job.status}</span>
                </div>
                <p className="text-[9px] font-black text-nile-blue uppercase tracking-wider truncate">{companyName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[8px] font-black text-black/30 uppercase">
                    {job.location && (
                        <span className="flex items-center gap-1">
                            <MapPin size={9} />{job.location}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <CalendarDays size={9} />{fmtDate(job.posted_at)}
                    </span>
                    {applicantCount !== undefined && (
                        <span className="flex items-center gap-1">
                            <Users size={9} />{applicantCount} APPLICANT{applicantCount !== 1 ? 'S' : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                {showApprovalActions && (
                    <>
                        <button
                            onClick={() => onAction(job, 'active')}
                            disabled={busy}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-40">
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} strokeWidth={3} />}
                            APPROVE
                        </button>
                        <button
                            onClick={() => onAction(job, 'rejected')}
                            disabled={busy}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-red-500 border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-40">
                            <XCircle size={12} strokeWidth={3} />
                            REJECT
                        </button>
                    </>
                )}
                {showArchiveAction && (
                    <button
                        onClick={() => onAction(job, 'archived')}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-black/50 border-[2px] border-black/30 rounded-xl font-black text-[8px] uppercase hover:border-black hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-40">
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                        ARCHIVE
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Application Card ─────────────────────────────────────────────────────────

const AppCard: React.FC<{ app: StaffApplication }> = ({ app }) => {
    const group = APP_STATUS_GROUPS.find(g => g.key === app.status) ?? APP_STATUS_GROUPS[0];

    return (
        <div className="bg-white border-[2px] border-black rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] transition-all duration-200">
            {/* Student avatar */}
            <div className="w-10 h-10 bg-nile-blue text-white rounded-xl border-[2px] border-black flex items-center justify-center font-black text-sm flex-shrink-0">
                {initials(app.student_name || 'S')}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-black text-sm uppercase text-black truncate leading-none">{app.student_name || 'STUDENT'}</p>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${group.bg} ${group.color}`}>
                        {group.label}
                    </span>
                </div>
                <p className="text-[9px] font-black text-nile-blue uppercase truncate">
                    {app.job_title || 'POSITION'} · {app.company || '—'}
                </p>
                <p className="text-[7px] font-black text-black/30 uppercase mt-0.5">
                    APPLIED {fmtDate(app.applied_at)}
                </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 text-black/20">
                <Building2 size={11} />
                <span className="text-[8px] font-black uppercase truncate max-w-[90px]">{app.company || '—'}</span>
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const StaffJobs: React.FC = () => {
    const { showToast } = useToast();

    // ── State ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<ActiveTab>('PENDING_APPROVAL');
    const [jobs, setJobs]           = useState<StaffJob[]>([]);
    const [applications, setApplications] = useState<StaffApplication[]>([]);
    const [loading, setLoading]     = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Active jobs tab filters
    const [typeFilter, setTypeFilter] = useState<JobTypeFilter>('all');
    const [activeSearch, setActiveSearch] = useState('');

    // Applications tab filter
    const [appSearch, setAppSearch] = useState('');

    // Post job form
    const [posting, setPosting]     = useState(false);
    const [form, setForm]           = useState<PostJobRequest>(EMPTY_FORM);

    // ── Data fetching ─────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [jobsData, appsData] = await Promise.all([
                getStaffJobs(),
                getStaffApplications(),
            ]);
            setJobs(jobsData);
            setApplications(appsData);
        } catch {
            showToast('Failed to load placement data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Derived data ──────────────────────────────────────────────────────────

    const pendingJobs = useMemo(() => jobs.filter(j => j.status === 'pending'), [jobs]);
    const activeJobs  = useMemo(() => jobs.filter(j => j.status === 'active'),  [jobs]);

    const filteredActiveJobs = useMemo(() => activeJobs
        .filter(j => typeFilter === 'all' || j.type === typeFilter)
        .filter(j => {
            if (!activeSearch) return true;
            const q = activeSearch.toLowerCase();
            return (
                j.title.toLowerCase().includes(q) ||
                (j.company || '').toLowerCase().includes(q) ||
                (j.location || '').toLowerCase().includes(q)
            );
        }),
        [activeJobs, typeFilter, activeSearch]
    );

    const applicantCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        applications.forEach(a => {
            map[a.job_id] = (map[a.job_id] ?? 0) + 1;
        });
        return map;
    }, [applications]);

    const groupedApplications = useMemo(() => {
        const groups: Record<AppStatusGroup, StaffApplication[]> = {
            applied: [], screening: [], interview: [], offer: [], rejected: [],
        };
        const filtered = applications.filter(a => {
            if (!appSearch) return true;
            const q = appSearch.toLowerCase();
            return (
                (a.student_name || '').toLowerCase().includes(q) ||
                (a.job_title || '').toLowerCase().includes(q) ||
                (a.company || '').toLowerCase().includes(q)
            );
        });
        filtered.forEach(a => {
            const key = a.status as AppStatusGroup;
            if (key in groups) groups[key].push(a);
            else groups.applied.push(a); // fallback bucket
        });
        return groups;
    }, [applications, appSearch]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleJobAction = async (job: StaffJob, action: 'active' | 'rejected' | 'archived') => {
        setActionLoading(prev => ({ ...prev, [job.id]: true }));
        try {
            await updateJobStatus(job.id, action);
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: action } : j));
            const verbs: Record<string, string> = { active: 'approved', rejected: 'rejected', archived: 'archived' };
            showToast(`"${job.title}" ${verbs[action]}.`, action === 'active' ? 'success' : 'error');
        } catch {
            showToast('Action failed. Please try again.', 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [job.id]: false }));
        }
    };

    const handlePostJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.location.trim() || !form.description.trim()) {
            showToast('Title, location and description are required.', 'error');
            return;
        }
        setPosting(true);
        try {
            await postJob(form);
            showToast('Job posted successfully!', 'success');
            setForm(EMPTY_FORM);
            const updated = await getStaffJobs();
            setJobs(updated);
            setActiveTab('ACTIVE_JOBS');
        } catch {
            showToast('Failed to post job. Please try again.', 'error');
        } finally {
            setPosting(false);
        }
    };

    const switchTab = (tab: ActiveTab) => {
        setActiveTab(tab);
        setActiveSearch('');
        setAppSearch('');
        setTypeFilter('all');
    };

    // ── Tab bar config ────────────────────────────────────────────────────────

    const tabs: { id: ActiveTab; icon: React.ReactNode; label: string; badge?: number }[] = [
        {
            id: 'POST_JOB',
            icon: <Plus size={12} strokeWidth={3} />,
            label: 'POST JOB',
        },
        {
            id: 'PENDING_APPROVAL',
            icon: <Hourglass size={12} />,
            label: 'PENDING APPROVAL',
            badge: pendingJobs.length,
        },
        {
            id: 'ACTIVE_JOBS',
            icon: <BadgeCheck size={12} />,
            label: 'ACTIVE JOBS',
            badge: activeJobs.length,
        },
        {
            id: 'APPLICATIONS',
            icon: <ClipboardList size={12} />,
            label: 'APPLICATIONS',
            badge: applications.length,
        },
    ];

    // ── Loading skeleton ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-4 md:p-8 space-y-8 pb-20">
                {/* Header skeleton */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b-[2px] border-black pb-6">
                    <div className="space-y-2">
                        <div className="h-10 md:h-14 bg-black/5 rounded-2xl w-72 animate-pulse" />
                        <div className="h-2.5 bg-black/5 rounded-lg w-48 animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 bg-black/5 rounded-xl w-28 animate-pulse" />
                        ))}
                    </div>
                </div>
                {/* Card skeletons */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-24 text-left min-h-full">

            {/* ── Page header ───────────────────────────────────────────── */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tighter">
                        Jobs &amp; Placement<span className="text-nile-green"> .</span>
                    </h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1.5">
                        {pendingJobs.length} PENDING REVIEW · {activeJobs.length} ACTIVE · {applications.length} APPLICATIONS
                    </p>
                </div>

                {/* Tab bar */}
                <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-x-auto w-full xl:w-auto gap-0.5 flex-shrink-0">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => switchTab(t.id)}
                            className={[
                                'flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-xl',
                                'font-black text-[8px] tracking-widest uppercase',
                                'transition-all duration-150 whitespace-nowrap flex-shrink-0',
                                activeTab === t.id
                                    ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]'
                                    : 'text-black/40 hover:text-black hover:bg-black/5',
                            ].join(' ')}>
                            {t.icon}
                            {t.label}
                            {t.badge !== undefined && t.badge > 0 && (
                                <span className={[
                                    'text-[7px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                                    activeTab === t.id ? 'bg-nile-green text-white' : 'bg-red-100 text-red-500',
                                ].join(' ')}>
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
               TAB: POST JOB
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'POST_JOB' && (
                <div className="max-w-2xl anime-fade-in">
                    <div className="bg-white border-[2px] border-black rounded-[28px] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">

                        {/* Form header */}
                        <div className="flex items-center gap-3 mb-6 pb-5 border-b-[2px] border-black/5">
                            <div className="w-11 h-11 bg-black rounded-xl border-[2px] border-black flex items-center justify-center flex-shrink-0">
                                <FileText size={18} className="text-nile-green" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Post a New Job</h3>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-0.5">
                                    POSTED DIRECTLY BY NILE UNIVERSITY · GOES LIVE IMMEDIATELY
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handlePostJob} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Job Title" required>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Software Engineer Intern"
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Job Type">
                                    <select
                                        value={form.type}
                                        onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                        className={inputCls + ' cursor-pointer'}>
                                        {JOB_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Location" required>
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                        placeholder="e.g. Abuja, Nigeria / Remote"
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Salary / Stipend">
                                    <input
                                        type="text"
                                        value={form.salary}
                                        onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                                        placeholder="e.g. ₦150,000 / month"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>

                            <Field label="Description" required>
                                <textarea
                                    rows={4}
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Describe the role, responsibilities, and what students will gain..."
                                    className={inputCls + ' resize-none'}
                                />
                            </Field>

                            <Field label="Requirements">
                                <textarea
                                    rows={3}
                                    value={form.requirements}
                                    onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))}
                                    placeholder="List key requirements — one per line..."
                                    className={inputCls + ' resize-none'}
                                />
                            </Field>

                            <Field label="Skills">
                                <input
                                    type="text"
                                    value={form.skills}
                                    onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                                    placeholder="e.g. React, Node.js, Python (comma-separated)"
                                    className={inputCls}
                                />
                            </Field>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setForm(EMPTY_FORM)}
                                    className="px-5 py-3.5 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                                    CLEAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={posting}
                                    className="flex-1 py-4 bg-black text-white border-[2px] border-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#6CBB56] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#6CBB56] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                    {posting
                                        ? <><Loader2 size={14} className="animate-spin" /> POSTING...</>
                                        : <><Send size={14} /> POST JOB LISTING</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Info panel */}
                    <div className="mt-4 bg-nile-blue/5 border-[2px] border-nile-blue/20 rounded-[20px] p-5 flex items-start gap-3">
                        <AlertCircle size={16} className="text-nile-blue flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-nile-blue">DIRECT PLACEMENT</p>
                            <p className="text-[8px] font-black text-black/50 mt-1 leading-relaxed">
                                Jobs posted directly by staff go live immediately without employer review. Employer-submitted jobs require your approval and appear in the Pending Approval tab.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
               TAB: PENDING APPROVAL
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'PENDING_APPROVAL' && (
                <div className="space-y-6 anime-fade-in">

                    {/* Section label */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Hourglass size={14} className="text-yellow-600" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-black/50">
                                {pendingJobs.length} JOB{pendingJobs.length !== 1 ? 'S' : ''} AWAITING REVIEW
                            </span>
                            {pendingJobs.length > 0 && (
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                            )}
                        </div>
                    </div>

                    {pendingJobs.length === 0 ? (
                        <EmptyState
                            icon={<CheckCircle2 size={32} />}
                            headline="All caught up!"
                            sub="No employer jobs pending review right now."
                        />
                    ) : (
                        <div className="space-y-4">
                            {pendingJobs.map(job => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    applicantCount={applicantCountMap[job.id]}
                                    actionLoading={actionLoading}
                                    onAction={handleJobAction}
                                    showApprovalActions
                                />
                            ))}
                        </div>
                    )}

                    {/* Tip */}
                    {pendingJobs.length > 0 && (
                        <div className="bg-yellow-50 border-[2px] border-yellow-200 rounded-[18px] p-4 flex items-start gap-2.5">
                            <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[8px] font-black text-yellow-700 uppercase tracking-wider leading-relaxed">
                                REVIEW EACH EMPLOYER JOB CAREFULLY BEFORE APPROVING. APPROVED JOBS BECOME VISIBLE TO ALL STUDENTS IMMEDIATELY.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
               TAB: ACTIVE JOBS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'ACTIVE_JOBS' && (
                <div className="space-y-6 anime-fade-in">

                    {/* Search & type filter */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                type="text"
                                value={activeSearch}
                                onChange={e => setActiveSearch(e.target.value)}
                                placeholder="SEARCH ACTIVE JOBS..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-[#F8F9FB]/60 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Type filter pills */}
                        <div className="flex bg-white p-1 border-[2px] border-black rounded-xl gap-0.5 overflow-x-auto flex-shrink-0">
                            <button
                                onClick={() => setTypeFilter('all')}
                                className={[
                                    'px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider whitespace-nowrap transition-all',
                                    typeFilter === 'all' ? 'bg-black text-white' : 'text-black/40 hover:text-black',
                                ].join(' ')}>
                                ALL <span className={typeFilter === 'all' ? 'text-white/60' : 'text-black/20'}>{activeJobs.length}</span>
                            </button>
                            {JOB_TYPES.map(t => {
                                const cnt = activeJobs.filter(j => j.type === t.value).length;
                                return (
                                    <button
                                        key={t.value}
                                        onClick={() => setTypeFilter(t.value as JobTypeFilter)}
                                        className={[
                                            'px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-wider whitespace-nowrap transition-all',
                                            typeFilter === t.value ? 'bg-black text-white' : 'text-black/40 hover:text-black',
                                        ].join(' ')}>
                                        {t.label} <span className={typeFilter === t.value ? 'text-white/60' : 'text-black/20'}>{cnt}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Results info */}
                    {(activeSearch || typeFilter !== 'all') && (
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black text-black/30 uppercase tracking-wider">
                                {filteredActiveJobs.length} RESULT{filteredActiveJobs.length !== 1 ? 'S' : ''} FOUND
                            </p>
                            <button
                                onClick={() => { setActiveSearch(''); setTypeFilter('all'); }}
                                className="text-[8px] font-black text-nile-blue uppercase tracking-wider hover:text-black transition-colors">
                                CLEAR FILTERS
                            </button>
                        </div>
                    )}

                    {filteredActiveJobs.length === 0 ? (
                        <EmptyState
                            icon={<Briefcase size={32} />}
                            headline={activeSearch || typeFilter !== 'all' ? 'No jobs match your filters' : 'No active jobs yet'}
                            sub={activeSearch ? 'Try a different search term or clear your filters.' : 'Post a job or approve a pending employer submission.'}
                            action={!activeSearch ? { label: 'POST A JOB', onClick: () => switchTab('POST_JOB') } : undefined}
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredActiveJobs.map(job => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    applicantCount={applicantCountMap[job.id] ?? 0}
                                    actionLoading={actionLoading}
                                    onAction={handleJobAction}
                                    showArchiveAction
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
               TAB: APPLICATIONS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'APPLICATIONS' && (
                <div className="space-y-8 anime-fade-in">

                    {/* Search */}
                    <div className="relative max-w-xl">
                        <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                        <input
                            type="text"
                            value={appSearch}
                            onChange={e => setAppSearch(e.target.value)}
                            placeholder="SEARCH BY STUDENT, JOB, OR COMPANY..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-[#F8F9FB]/60 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Pipeline header stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {APP_STATUS_GROUPS.map(g => {
                            const cnt = groupedApplications[g.key].length;
                            return (
                                <div key={g.key} className={`border-[2px] border-black rounded-[18px] p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${g.bg.split(' ')[0]}`}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.dot }} />
                                        <span className={`text-[7px] font-black uppercase tracking-wider ${g.color}`}>{g.label}</span>
                                    </div>
                                    <p className="text-2xl font-black text-black leading-none">{cnt}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* No applications at all */}
                    {applications.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList size={32} />}
                            headline="No applications yet"
                            sub="Applications from students will appear here as they apply to active jobs."
                        />
                    ) : appSearch && Object.values(groupedApplications).every(g => g.length === 0) ? (
                        <EmptyState
                            icon={<Search size={28} />}
                            headline="No applications match your search"
                            sub="Try different keywords."
                        />
                    ) : (
                        /* Grouped pipeline columns */
                        <div className="space-y-10">
                            {APP_STATUS_GROUPS.map(g => {
                                const group = groupedApplications[g.key];
                                if (group.length === 0 && appSearch) return null;
                                return (
                                    <section key={g.key}>
                                        {/* Group heading */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0 border-[2px] border-black" style={{ background: g.dot }} />
                                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${g.color}`}>{g.label}</h3>
                                            <span className="text-[8px] font-black text-black/30 uppercase">
                                                {group.length} APPLICANT{group.length !== 1 ? 'S' : ''}
                                            </span>
                                            <div className="flex-1 h-[1px] bg-black/5" />
                                        </div>

                                        {group.length === 0 ? (
                                            <div className="py-8 text-center border-[1px] border-dashed border-black/10 rounded-[20px]">
                                                <p className="text-[8px] font-black text-black/20 uppercase tracking-wider">
                                                    NO {g.label.toUpperCase()} APPLICATIONS
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {group.map(app => (
                                                    <AppCard key={app.id} app={app} />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StaffJobs;
