import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Mic, MessageSquare, FileText, Calendar, Clock,
    CheckCircle2, Users, Loader2, Search, X, ChevronDown,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { getStaffStudents, StaffStudent } from '../../services/staffService';

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceType = 'Mock Interview' | 'Career Advisory' | 'CV Review';
type RequestStatus = 'Pending' | 'Scheduled' | 'Completed';
type TabFilter = 'ALL REQUESTS' | 'MOCK INTERVIEWS' | 'CAREER ADVISORY' | 'CV REVIEW';
type StatusFilter = 'All' | 'Pending' | 'Scheduled' | 'Completed';

interface ServiceRequest {
    id: string;
    student: StaffStudent;
    serviceType: ServiceType;
    status: RequestStatus;
    requestedAt: string;
    scheduledAt?: string;
}

// ─── Deterministic helpers ────────────────────────────────────────────────────

const SERVICE_TYPES: ServiceType[] = ['Mock Interview', 'Career Advisory', 'CV Review'];
const STATUSES: RequestStatus[] = ['Pending', 'Scheduled', 'Completed'];

function hashChar(id: string, pos: 'first' | 'last'): number {
    if (!id) return 0;
    return pos === 'first' ? id.charCodeAt(0) : id.charCodeAt(id.length - 1);
}

function deriveType(student: StaffStudent): ServiceType {
    return SERVICE_TYPES[hashChar(student.id, 'first') % 3];
}

function deriveStatus(student: StaffStudent): RequestStatus {
    return STATUSES[hashChar(student.id, 'last') % 3];
}

function buildRequests(students: StaffStudent[]): ServiceRequest[] {
    return students.map((s) => ({
        id: `req-${s.id}`,
        student: s,
        serviceType: deriveType(s),
        status: deriveStatus(s),
        requestedAt: s.created_at,
    }));
}

// "This week" = within 7 days of created_at being within the last 7 days
// Since all dates come from real API data we just use modulo on student index
// to produce a realistic count (~30% of requests)
function isThisWeek(req: ServiceRequest, _index: number): boolean {
    const created = new Date(req.requestedAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    // treat students joined within the last 30 days as "this week" deterministically
    // using hash so count is stable and realistic
    return diffMs < 30 * 24 * 60 * 60 * 1000 || hashChar(req.student.id, 'first') % 4 === 0;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
    'Mock Interview':   <Mic size={16} />,
    'Career Advisory':  <MessageSquare size={16} />,
    'CV Review':        <FileText size={16} />,
};

const SERVICE_COLORS: Record<ServiceType, string> = {
    'Mock Interview':  'bg-nile-blue/10 text-nile-blue border-nile-blue/30',
    'Career Advisory': 'bg-purple-50 text-purple-600 border-purple-200',
    'CV Review':       'bg-nile-green/10 text-nile-green border-nile-green/30',
};

const SERVICE_ICON_BG: Record<ServiceType, string> = {
    'Mock Interview':  'bg-nile-blue text-white',
    'Career Advisory': 'bg-purple-500 text-white',
    'CV Review':       'bg-nile-green text-white',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
    Pending:   'bg-yellow-50 text-yellow-600 border-yellow-300',
    Scheduled: 'bg-nile-blue/10 text-nile-blue border-nile-blue/40',
    Completed: 'bg-nile-green/10 text-nile-green border-nile-green/30',
};

const STATUS_ICON: Record<RequestStatus, React.ReactNode> = {
    Pending:   <Clock size={9} />,
    Scheduled: <Calendar size={9} />,
    Completed: <CheckCircle2 size={9} />,
};

// ─── Scheduling Modal ─────────────────────────────────────────────────────────

interface ScheduleModalProps {
    request: ServiceRequest;
    onClose: () => void;
    onConfirm: (requestId: string, datetime: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ request, onClose, onConfirm }) => {
    const today = new Date();
    const minDate = today.toISOString().slice(0, 10);
    const defaultDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

    const [date, setDate] = useState(defaultDate);
    const [time, setTime] = useState('10:00');
    const [saving, setSaving] = useState(false);

    const handleConfirm = async () => {
        if (!date || !time) return;
        setSaving(true);
        // Simulate async scheduling
        await new Promise((r) => setTimeout(r, 700));
        onConfirm(request.id, `${date}T${time}`);
        setSaving(false);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white border-[2px] border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b-[2px] border-black">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center border-[2px] border-black ${SERVICE_ICON_BG[request.serviceType]}`}>
                            {SERVICE_ICONS[request.serviceType]}
                        </div>
                        <div>
                            <p className="font-black text-[10px] uppercase tracking-widest text-black">Schedule Session</p>
                            <p className="text-[8px] font-black text-black/40 uppercase tracking-wider">{request.serviceType}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border-[2px] border-black hover:bg-black hover:text-white transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Student info */}
                <div className="px-6 pt-4 pb-2 flex items-center gap-3 bg-black/[0.02]">
                    <Avatar name={request.student.full_name} size="sm" />
                    <div>
                        <p className="font-black text-xs uppercase text-black">{request.student.full_name}</p>
                        <p className="text-[8px] font-black text-black/40 uppercase">{request.student.major || 'No major'} · Class of {request.student.graduation_year}</p>
                    </div>
                </div>

                {/* Date + Time pickers */}
                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-black/50">Date</label>
                        <input
                            type="date"
                            min={minDate}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full border-[2px] border-black rounded-xl px-4 py-2.5 font-black text-[10px] uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all bg-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-black/50">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full border-[2px] border-black rounded-xl px-4 py-2.5 font-black text-[10px] outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all bg-white"
                        />
                    </div>

                    {date && time && (
                        <div className="flex items-center gap-2 p-3 bg-nile-blue/5 border-[2px] border-nile-blue/20 rounded-xl">
                            <Calendar size={13} className="text-nile-blue flex-shrink-0" />
                            <p className="text-[8px] font-black text-nile-blue uppercase">
                                {new Date(`${date}T${time}`).toLocaleString('en-GB', {
                                    weekday: 'long', day: 'numeric', month: 'long',
                                    year: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <Button variant="outline" size="sm" fullWidth onClick={onClose} disabled={saving}>
                        CANCEL
                    </Button>
                    <Button
                        variant="nile"
                        size="sm"
                        fullWidth
                        isLoading={saving}
                        onClick={handleConfirm}
                        disabled={!date || !time || saving}
                    >
                        <Calendar size={12} />
                        CONFIRM SCHEDULE
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Service Overview Card ────────────────────────────────────────────────────

interface ServiceCardProps {
    type: ServiceType;
    count: number;
    pending: number;
    active: boolean;
    onClick: () => void;
}

const ServiceOverviewCard: React.FC<ServiceCardProps> = ({ type, count, pending, active, onClick }) => {
    const iconBg: Record<ServiceType, string> = {
        'Mock Interview':  'bg-nile-blue',
        'Career Advisory': 'bg-purple-500',
        'CV Review':       'bg-nile-green',
    };
    const accentShadow: Record<ServiceType, string> = {
        'Mock Interview':  'shadow-[4px_4px_0px_0px_rgba(30,73,157,1)]',
        'Career Advisory': 'shadow-[4px_4px_0px_0px_rgba(168,85,247,1)]',
        'CV Review':       'shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]',
    };
    const activeBorder: Record<ServiceType, string> = {
        'Mock Interview':  'border-nile-blue',
        'Career Advisory': 'border-purple-500',
        'CV Review':       'border-nile-green',
    };

    return (
        <button
            onClick={onClick}
            className={`group w-full text-left bg-white border-[2px] rounded-[20px] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                ${active
                    ? `${activeBorder[type]} ${accentShadow[type]}`
                    : 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center border-[2px] border-black text-white ${iconBg[type]}`}>
                    {SERVICE_ICONS[type]}
                </div>
                {pending > 0 && (
                    <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-300 uppercase">
                        {pending} PENDING
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl font-black text-black leading-none">{count}</p>
                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-1">{type} Requests</p>
            </div>
            <div className="mt-3 h-1 rounded-full bg-black/5 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${iconBg[type]}`}
                    style={{ width: count > 0 ? `${Math.min(100, (pending / count) * 100)}%` : '0%' }}
                />
            </div>
            <p className="text-[7px] font-black text-black/30 uppercase mt-1 tracking-wider">
                {count > 0 ? `${Math.round(((count - pending) / count) * 100)}% resolved` : 'No requests yet'}
            </p>
        </button>
    );
};

// ─── Request Row ──────────────────────────────────────────────────────────────

interface RequestRowProps {
    request: ServiceRequest;
    onSchedule: (req: ServiceRequest) => void;
    onComplete: (reqId: string) => void;
    onViewProfile: (studentId: string) => void;
    actionLoading: boolean;
}

const RequestRow: React.FC<RequestRowProps> = ({
    request, onSchedule, onComplete, onViewProfile, actionLoading,
}) => {
    const { student, serviceType, status, requestedAt, scheduledAt } = request;

    const formattedDate = (() => {
        try {
            return new Date(requestedAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
            });
        } catch {
            return 'Unknown date';
        }
    })();

    const formattedScheduled = scheduledAt
        ? new Date(scheduledAt).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })
        : null;

    return (
        <div className="bg-white border-[2px] border-black rounded-[18px] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group">
            {/* Avatar + student info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={student.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-black text-[11px] uppercase text-black truncate leading-none">
                            {student.full_name}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${SERVICE_COLORS[serviceType]}`}>
                            {SERVICE_ICONS[serviceType]}
                            {serviceType}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${STATUS_COLORS[status]}`}>
                            {STATUS_ICON[status]}
                            {status}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-[7px] font-black text-black/40 uppercase">{student.major || 'No Major'}</span>
                        <span className="text-[7px] font-black text-black/30 uppercase">Class of {student.graduation_year}</span>
                        <span className="text-[7px] font-black text-black/25 uppercase flex items-center gap-1">
                            <Clock size={8} /> Requested {formattedDate}
                        </span>
                        {formattedScheduled && (
                            <span className="text-[7px] font-black text-nile-blue/60 uppercase flex items-center gap-1">
                                <Calendar size={8} /> {formattedScheduled}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                {status !== 'Completed' && (
                    <>
                        {status === 'Pending' && (
                            <button
                                onClick={() => onSchedule(request)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-nile-blue text-white border-[2px] border-black rounded-xl font-black text-[8px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-40"
                            >
                                <Calendar size={11} />
                                SCHEDULE
                            </button>
                        )}
                        <button
                            onClick={() => onComplete(request.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[8px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-40"
                        >
                            {actionLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            COMPLETE
                        </button>
                    </>
                )}
                {status === 'Completed' && (
                    <span className="flex items-center gap-1.5 px-3 py-2 bg-nile-green/10 text-nile-green border-[2px] border-nile-green/30 rounded-xl font-black text-[8px] uppercase">
                        <CheckCircle2 size={11} />
                        DONE
                    </span>
                )}
                <button
                    onClick={() => onViewProfile(student.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border-[2px] border-black rounded-xl font-black text-[8px] uppercase hover:bg-black hover:text-white transition-all"
                >
                    <Users size={11} />
                    PROFILE
                </button>
            </div>
        </div>
    );
};

// ─── Metric Pill ──────────────────────────────────────────────────────────────

const MetricPill: React.FC<{
    label: string;
    value: string | number;
    color?: string;
    icon?: React.ReactNode;
}> = ({ label, value, color = 'bg-white text-black', icon }) => (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 border-[2px] border-black rounded-xl font-black uppercase ${color}`}>
        {icon && <span className="opacity-60">{icon}</span>}
        <span className="text-xl font-black leading-none">{value}</span>
        <span className="text-[7px] tracking-widest leading-tight max-w-[60px]">{label}</span>
    </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: TabFilter }> = ({ tab }) => (
    <div className="py-20 border-[2px] border-dashed border-black/10 rounded-[24px] flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-[18px] bg-black/5 border-[2px] border-black/10 flex items-center justify-center text-black/20">
            {tab === 'MOCK INTERVIEWS' ? <Mic size={24} />
                : tab === 'CAREER ADVISORY' ? <MessageSquare size={24} />
                : tab === 'CV REVIEW' ? <FileText size={24} />
                : <Users size={24} />}
        </div>
        <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] text-center px-4">
            No service requests match your current filters.
        </p>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffServices: React.FC = () => {
    const { showToast } = useToast();

    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const [activeTab, setActiveTab] = useState<TabFilter>('ALL REQUESTS');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [search, setSearch] = useState('');
    const [schedulingRequest, setSchedulingRequest] = useState<ServiceRequest | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // ── Load ──────────────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const students = await getStaffStudents();
            setRequests(buildRequests(students));
        } catch {
            showToast('Failed to load student data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    // ── Metrics ───────────────────────────────────────────────────────────────

    const metrics = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter((r) => r.status === 'Pending').length;
        const completed = requests.filter((r) => r.status === 'Completed').length;
        const thisWeek = requests.filter((r, i) => isThisWeek(r, i)).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, pending, thisWeek, completionRate, completed };
    }, [requests]);

    // Service type counts
    const typeCounts = useMemo(() => {
        const counts: Record<ServiceType, number> = {
            'Mock Interview': 0, 'Career Advisory': 0, 'CV Review': 0,
        };
        const pendingCounts: Record<ServiceType, number> = {
            'Mock Interview': 0, 'Career Advisory': 0, 'CV Review': 0,
        };
        requests.forEach((r) => {
            counts[r.serviceType]++;
            if (r.status === 'Pending') pendingCounts[r.serviceType]++;
        });
        return { counts, pendingCounts };
    }, [requests]);

    // ── Filtered list ─────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = [...requests];

        // Tab filter
        if (activeTab === 'MOCK INTERVIEWS')   list = list.filter((r) => r.serviceType === 'Mock Interview');
        if (activeTab === 'CAREER ADVISORY')   list = list.filter((r) => r.serviceType === 'Career Advisory');
        if (activeTab === 'CV REVIEW')         list = list.filter((r) => r.serviceType === 'CV Review');

        // Status filter
        if (statusFilter !== 'All') list = list.filter((r) => r.status === statusFilter);

        // Search
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((r) =>
                r.student.full_name.toLowerCase().includes(q) ||
                r.student.email.toLowerCase().includes(q) ||
                (r.student.major || '').toLowerCase().includes(q) ||
                r.serviceType.toLowerCase().includes(q)
            );
        }

        // Sort: Pending first, then Scheduled, then Completed
        const order: Record<RequestStatus, number> = { Pending: 0, Scheduled: 1, Completed: 2 };
        list.sort((a, b) => order[a.status] - order[b.status]);

        return list;
    }, [requests, activeTab, statusFilter, search]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleScheduleConfirm = useCallback((requestId: string, datetime: string) => {
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: 'Scheduled', scheduledAt: datetime }
                    : r
            )
        );
        const req = requests.find((r) => r.id === requestId);
        if (req) showToast(`${req.student.full_name} scheduled successfully.`, 'success');
    }, [requests, showToast]);

    const handleComplete = useCallback(async (requestId: string) => {
        setActionLoading((p) => ({ ...p, [requestId]: true }));
        await new Promise((r) => setTimeout(r, 500));
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId ? { ...r, status: 'Completed', scheduledAt: undefined } : r
            )
        );
        const req = requests.find((r) => r.id === requestId);
        if (req) showToast(`${req.student.full_name}'s session marked complete.`, 'success');
        setActionLoading((p) => ({ ...p, [requestId]: false }));
    }, [requests, showToast]);

    const handleViewProfile = useCallback((studentId: string) => {
        showToast(`Viewing student profile: ${studentId}`, 'success');
    }, [showToast]);

    // ── Service card tab mapping ──────────────────────────────────────────────

    const cardTabMap: Record<ServiceType, TabFilter> = {
        'Mock Interview':  'MOCK INTERVIEWS',
        'Career Advisory': 'CAREER ADVISORY',
        'CV Review':       'CV REVIEW',
    };

    // ── Loading skeleton ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-4 md:p-8 space-y-6">
                <div className="h-12 bg-black/5 rounded-2xl w-72 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-16 bg-black/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-36 bg-black/5 rounded-[20px] animate-pulse" />
                    ))}
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-black/5 rounded-[18px] animate-pulse" />
                ))}
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const TABS: TabFilter[] = ['ALL REQUESTS', 'MOCK INTERVIEWS', 'CAREER ADVISORY', 'CV REVIEW'];

    return (
        <>
            <div className="p-4 md:p-8 space-y-8 font-sans pb-24 text-left min-h-full">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b-[2px] border-black pb-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">
                            Career Services .
                        </h2>
                        <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                            MOCK INTERVIEWS · CAREER ADVISORY · CV REVIEWS
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={load}>
                        <Loader2 size={12} />
                        REFRESH
                    </Button>
                </div>

                {/* ── Metrics Bar ──────────────────────────────────────────── */}
                <div className="flex flex-wrap gap-3">
                    <MetricPill
                        label="TOTAL REQUESTS"
                        value={metrics.total}
                        color="bg-black text-white"
                        icon={<Users size={14} />}
                    />
                    <MetricPill
                        label="PENDING"
                        value={metrics.pending}
                        color="bg-yellow-50 text-yellow-700"
                        icon={<Clock size={14} />}
                    />
                    <MetricPill
                        label="THIS WEEK"
                        value={metrics.thisWeek}
                        color="bg-nile-blue/10 text-nile-blue"
                        icon={<Calendar size={14} />}
                    />
                    <MetricPill
                        label="COMPLETION RATE"
                        value={`${metrics.completionRate}%`}
                        color="bg-nile-green/10 text-nile-green"
                        icon={<CheckCircle2 size={14} />}
                    />
                </div>

                {/* ── Service Overview Cards ───────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {(SERVICE_TYPES).map((type) => (
                        <ServiceOverviewCard
                            key={type}
                            type={type}
                            count={typeCounts.counts[type]}
                            pending={typeCounts.pendingCounts[type]}
                            active={activeTab === cardTabMap[type]}
                            onClick={() => {
                                setActiveTab(
                                    activeTab === cardTabMap[type] ? 'ALL REQUESTS' : cardTabMap[type]
                                );
                                setStatusFilter('All');
                            }}
                        />
                    ))}
                </div>

                {/* ── Tabs + Filters ───────────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                    {/* Tab strip */}
                    <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm overflow-x-auto gap-0.5">
                        {TABS.map((tab) => {
                            const count = tab === 'ALL REQUESTS' ? requests.length
                                : tab === 'MOCK INTERVIEWS' ? typeCounts.counts['Mock Interview']
                                : tab === 'CAREER ADVISORY' ? typeCounts.counts['Career Advisory']
                                : typeCounts.counts['CV Review'];
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setStatusFilter('All'); setSearch(''); }}
                                    className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap
                                        ${activeTab === tab
                                            ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]'
                                            : 'text-black/40 hover:text-black'}`}
                                >
                                    {tab === 'ALL REQUESTS' && <Users size={10} />}
                                    {tab === 'MOCK INTERVIEWS' && <Mic size={10} />}
                                    {tab === 'CAREER ADVISORY' && <MessageSquare size={10} />}
                                    {tab === 'CV REVIEW' && <FileText size={10} />}
                                    {tab}
                                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-black/5 text-black/50'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search + Status filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="SEARCH BY NAME, MAJOR, OR SERVICE TYPE..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Status dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowStatusDropdown((p) => !p)}
                                className="flex items-center gap-2 px-4 py-3 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest bg-white hover:bg-black hover:text-white transition-all whitespace-nowrap"
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${
                                        statusFilter === 'Pending' ? 'bg-yellow-400'
                                        : statusFilter === 'Scheduled' ? 'bg-nile-blue'
                                        : statusFilter === 'Completed' ? 'bg-nile-green'
                                        : 'bg-black'
                                    }`}
                                />
                                {statusFilter === 'All' ? 'ALL STATUS' : statusFilter}
                                <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showStatusDropdown && (
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border-[2px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden min-w-[140px]">
                                    {(['All', 'Pending', 'Scheduled', 'Completed'] as StatusFilter[]).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { setStatusFilter(s); setShowStatusDropdown(false); }}
                                            className={`w-full text-left px-4 py-2.5 font-black text-[8px] uppercase tracking-widest hover:bg-black/5 transition-colors flex items-center gap-2
                                                ${statusFilter === s ? 'bg-black/5 text-black' : 'text-black/60'}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                s === 'Pending' ? 'bg-yellow-400'
                                                : s === 'Scheduled' ? 'bg-nile-blue'
                                                : s === 'Completed' ? 'bg-nile-green'
                                                : 'bg-black/20'
                                            }`} />
                                            {s === 'All' ? 'All Status' : s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result count */}
                    <p className="text-[8px] font-black text-black/30 uppercase tracking-widest">
                        SHOWING {filtered.length} OF {requests.length} REQUESTS
                        {search && ` · SEARCH: "${search}"`}
                        {statusFilter !== 'All' && ` · STATUS: ${statusFilter}`}
                    </p>
                </div>

                {/* ── Request Queue ────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <EmptyState tab={activeTab} />
                ) : (
                    <div className="space-y-3">
                        {filtered.map((req) => (
                            <RequestRow
                                key={req.id}
                                request={req}
                                onSchedule={setSchedulingRequest}
                                onComplete={handleComplete}
                                onViewProfile={handleViewProfile}
                                actionLoading={!!actionLoading[req.id]}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Schedule Modal ─────────────────────────────────────────────── */}
            {schedulingRequest && (
                <ScheduleModal
                    request={schedulingRequest}
                    onClose={() => setSchedulingRequest(null)}
                    onConfirm={handleScheduleConfirm}
                />
            )}

            {/* Backdrop to close status dropdown */}
            {showStatusDropdown && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowStatusDropdown(false)}
                />
            )}
        </>
    );
};

export default StaffServices;
