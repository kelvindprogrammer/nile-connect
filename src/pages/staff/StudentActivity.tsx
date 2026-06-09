import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Briefcase, Activity, Search,
    Calendar, MessageSquare, Eye,
    CheckCircle2, Clock, Loader2,
    Download, TrendingUp, Users,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getDashboardStats, getStaffApplications,
    type DashboardStats, type StaffApplication,
} from '../../services/staffService';

type ActionType = 'applied' | 'interview_scheduled' | 'offer_sent' | 'rejected' | 'screening';
type BadgeStatus = 'pending' | 'urgent' | 'completed';

interface ActivityRow {
    id:          string;
    studentName: string;
    companyName: string;
    action:      ActionType;
    timestamp:   string;
    details:     string;
    status:      BadgeStatus;
}

function toAction(appStatus: string): ActionType {
    switch (appStatus) {
        case 'interview': return 'interview_scheduled';
        case 'offer':     return 'offer_sent';
        case 'rejected':  return 'rejected';
        case 'screening': return 'screening';
        default:          return 'applied';
    }
}

function toBadge(appStatus: string): BadgeStatus {
    if (appStatus === 'interview')            return 'urgent';
    if (appStatus === 'offer' || appStatus === 'rejected') return 'completed';
    return 'pending';
}

function fmtDate(iso: string | null): string {
    if (!iso || iso.startsWith('0001')) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1)  return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days} days ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const actionLabel: Record<ActionType, string> = {
    applied:              'APPLIED',
    interview_scheduled:  'INTERVIEW',
    offer_sent:           'OFFER',
    rejected:             'REJECTED',
    screening:            'SCREENING',
};

const actionIcon: Record<ActionType, React.ReactNode> = {
    applied:              <Briefcase size={13} className="text-nile-blue" />,
    interview_scheduled:  <Calendar size={13} className="text-orange-500" />,
    offer_sent:           <CheckCircle2 size={13} className="text-nile-green" />,
    rejected:             <Clock size={13} className="text-red-500" />,
    screening:            <MessageSquare size={13} className="text-purple-500" />,
};

const badgeClasses: Record<BadgeStatus, string> = {
    pending:   'bg-yellow-50 text-yellow-600 border-yellow-200',
    urgent:    'bg-red-50 text-red-500 border-red-200',
    completed: 'bg-nile-green/10 text-nile-green border-nile-green/20',
};

const StudentActivity = () => {
    const { showToast } = useToast();
    const [stats,       setStats]       = useState<DashboardStats | null>(null);
    const [apps,        setApps]        = useState<StaffApplication[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [search,      setSearch]      = useState('');

    const load = useCallback(async () => {
        try {
            const [s, a] = await Promise.all([getDashboardStats(), getStaffApplications()]);
            setStats(s);
            setApps(a);
        } catch {
            showToast('Failed to load activity data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const rows: ActivityRow[] = useMemo(() => apps.map(a => ({
        id:          a.id,
        studentName: a.student_name || '—',
        companyName: a.company      || '—',
        action:      toAction(a.status),
        timestamp:   fmtDate(a.applied_at),
        details:     `${actionLabel[toAction(a.status)]} — ${a.job_title || 'job'}`,
        status:      toBadge(a.status),
    })), [apps]);

    const filtered = useMemo(() => rows.filter(r =>
        !search ||
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        r.companyName.toLowerCase().includes(search.toLowerCase())
    ), [rows, search]);

    const interviews  = rows.filter(r => r.action === 'interview_scheduled').length;
    const offers      = rows.filter(r => r.action === 'offer_sent').length;

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans text-left pb-24 md:pb-8">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-[2px] border-black pb-6">
                <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter">Activity Monitor .</h2>
                    <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">OVERSIGHT OF STUDENT-EMPLOYER INTERACTIONS</p>
                </div>
                <button
                    onClick={() => {}}
                    className="flex items-center gap-2 px-4 py-2.5 border-[2px] border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none"
                >
                    <Download size={13} /> EXPORT REPORT
                </button>
            </header>

            {/* Insight cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        label: 'TOTAL APPLICATIONS',
                        value: isLoading ? '…' : (stats?.total_applications ?? 0).toString(),
                        icon: <Activity size={18} />,
                        color: 'bg-nile-blue/5 border-nile-blue/20',
                        textColor: 'text-nile-blue',
                    },
                    {
                        label: 'ACTIVE INTERVIEWS',
                        value: isLoading ? '…' : interviews.toString(),
                        icon: <Calendar size={18} />,
                        color: 'bg-orange-50 border-orange-200',
                        textColor: 'text-orange-500',
                    },
                    {
                        label: 'OFFERS EXTENDED',
                        value: isLoading ? '…' : offers.toString(),
                        icon: <CheckCircle2 size={18} />,
                        color: 'bg-nile-green/5 border-nile-green/20',
                        textColor: 'text-nile-green',
                    },
                ].map(c => (
                    <div key={c.label} className={`bg-white border-[2px] border-black rounded-[24px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between`}>
                        <div className="space-y-1.5">
                            <p className="text-[8px] font-black text-black/30 uppercase tracking-widest">{c.label}</p>
                            <h4 className="text-3xl font-black text-black leading-none">{c.value}</h4>
                        </div>
                        <div className={`w-12 h-12 rounded-[16px] border-[2px] border-black flex items-center justify-center ${c.color} ${c.textColor}`}>
                            {c.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border-[2px] border-black rounded-[24px] overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">

                {/* Search bar */}
                <div className="p-5 border-b-[2px] border-black/5 bg-nile-white/30 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                        <input
                            type="text"
                            placeholder="SEARCH BY STUDENT OR COMPANY..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        />
                    </div>
                    <div className="text-[8px] font-black text-black/30 uppercase self-center whitespace-nowrap">
                        {filtered.length} RECORD{filtered.length !== 1 ? 'S' : ''}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-[2px] border-black/5 bg-nile-white/50">
                                {['STUDENT', 'ACTION', 'EMPLOYER', 'TIMESTAMP', 'STATUS', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-[8px] font-black uppercase tracking-[0.2em] text-black/30">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <Loader2 size={28} className="animate-spin mx-auto text-nile-blue/20" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <Users size={28} className="mx-auto text-black/10 mb-2" />
                                        <p className="text-[9px] font-black text-black/25 uppercase">
                                            {search ? 'No matching records' : 'No applications to show yet'}
                                        </p>
                                    </td>
                                </tr>
                            ) : filtered.map(row => (
                                <tr key={row.id} className="border-b border-black/5 hover:bg-nile-white/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-[10px] flex-shrink-0">
                                                {row.studentName.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="font-black text-[10px] uppercase text-black truncate max-w-[120px]">{row.studentName}</p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-white border border-black/10 flex-shrink-0">
                                                {actionIcon[row.action]}
                                            </div>
                                            <p className="text-[9px] font-black uppercase text-black/50 tracking-wider">{actionLabel[row.action]}</p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-black text-[10px] uppercase text-nile-blue truncate max-w-[120px]">{row.companyName}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-[9px] font-bold text-black/35 uppercase whitespace-nowrap">{row.timestamp}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${badgeClasses[row.status]}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button className="p-2 rounded-lg text-black/20 hover:bg-black hover:text-white border border-transparent hover:border-black transition-all">
                                            <Eye size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentActivity;
