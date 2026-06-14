import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mic, MessageSquare, FileText, Calendar, Clock,
    CheckCircle2, Users, Loader2, Search, X, ChevronDown, XCircle, Zap,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { apiClient, getErrorMessage } from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceType = 'mock_interview' | 'career_advisory' | 'cv_review';
type RequestStatus = 'pending' | 'scheduled' | 'completed' | 'declined';
type TabFilter = 'ALL REQUESTS' | 'MOCK INTERVIEWS' | 'CAREER ADVISORY' | 'CV REVIEW';
type StatusFilter = 'All' | RequestStatus;

interface ServiceRequestItem {
    id: string;
    type: ServiceType;
    status: RequestStatus;
    notes: string;
    feedback: string;
    scheduled_at: string | null;
    room_id: string;
    created_at: string;
    student_id: string;
    student_name: string;
    student_email: string;
    major: string;
    graduation_year: number;
    resume_url: string;
    staff_id: string;
    staff_name: string;
}

interface ApiEnvelope<T> { data: T; }

// ─── Display maps ──────────────────────────────────────────────────────────────

const SERVICE_TYPES: ServiceType[] = ['mock_interview', 'career_advisory', 'cv_review'];
const TYPE_LABELS: Record<ServiceType, string> = {
    mock_interview: 'Mock Interview',
    career_advisory: 'Career Advisory',
    cv_review: 'CV Review',
};

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
    mock_interview: <Mic size={16} />,
    career_advisory: <MessageSquare size={16} />,
    cv_review: <FileText size={16} />,
};

const SERVICE_COLORS: Record<ServiceType, string> = {
    mock_interview: 'bg-nile-blue/10 text-nile-blue border-nile-blue/30',
    career_advisory: 'bg-purple-50 text-purple-600 border-purple-200',
    cv_review: 'bg-nile-green/10 text-nile-green border-nile-green/30',
};

const SERVICE_ICON_BG: Record<ServiceType, string> = {
    mock_interview: 'bg-nile-blue text-white',
    career_advisory: 'bg-purple-500 text-white',
    cv_review: 'bg-nile-green text-white',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    completed: 'Completed',
    declined: 'Declined',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
    pending: 'bg-yellow-50 text-yellow-600 border-yellow-300',
    scheduled: 'bg-nile-blue/10 text-nile-blue border-nile-blue/40',
    completed: 'bg-nile-green/10 text-nile-green border-nile-green/30',
    declined: 'bg-red-50 text-red-500 border-red-200',
};

const STATUS_ICON: Record<RequestStatus, React.ReactNode> = {
    pending: <Clock size={9} />,
    scheduled: <Calendar size={9} />,
    completed: <CheckCircle2 size={9} />,
    declined: <XCircle size={9} />,
};

const cardTabMap: Record<ServiceType, TabFilter> = {
    mock_interview: 'MOCK INTERVIEWS',
    career_advisory: 'CAREER ADVISORY',
    cv_review: 'CV REVIEW',
};

// ─── Schedule Modal ─────────────────────────────────────────────────────────────

interface ScheduleModalProps {
    request: ServiceRequestItem;
    saving: boolean;
    onClose: () => void;
    onConfirm: (requestId: string, isoDatetime: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ request, saving, onClose, onConfirm }) => {
    const today = new Date();
    const minDate = today.toISOString().slice(0, 10);
    const defaultDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

    const [date, setDate] = useState(defaultDate);
    const [time, setTime] = useState('10:00');

    const handleConfirm = () => {
        if (!date || !time) return;
        onConfirm(request.id, new Date(`${date}T${time}`).toISOString());
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white border border-gray-100 rounded-[24px] shadow-card w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center border border-gray-100 ${SERVICE_ICON_BG[request.type]}`}>
                            {SERVICE_ICONS[request.type]}
                        </div>
                        <div>
                            <p className="font-semibold text-[10px] text-black">Schedule Session</p>
                            <p className="text-[8px] font-semibold text-black/40 tracking-wider">{TYPE_LABELS[request.type]}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 hover:bg-black hover:text-white transition-all">
                        <X size={14} />
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2 flex items-center gap-3 bg-black/[0.02]">
                    <Avatar name={request.student_name} size="sm" />
                    <div>
                        <p className="font-semibold text-xs text-black">{request.student_name}</p>
                        <p className="text-[8px] font-semibold text-black/40">{request.major || 'No major'} · Class of {request.graduation_year}</p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-semibold text-black/50">Date</label>
                        <input
                            type="date"
                            min={minDate}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full border border-gray-100 rounded-xl px-4 py-2.5 font-semibold text-[10px] outline-none focus:shadow-card transition-all bg-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-semibold text-black/50">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full border border-gray-100 rounded-xl px-4 py-2.5 font-semibold text-[10px] outline-none focus:shadow-card transition-all bg-white"
                        />
                    </div>

                    {date && time && (
                        <div className="flex items-center gap-2 p-3 bg-nile-blue/5 border-[2px] border-nile-blue/20 rounded-xl">
                            <Calendar size={13} className="text-nile-blue flex-shrink-0" />
                            <p className="text-[8px] font-semibold text-nile-blue">
                                {new Date(`${date}T${time}`).toLocaleString('en-GB', {
                                    weekday: 'long', day: 'numeric', month: 'long',
                                    year: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                            </p>
                        </div>
                    )}
                </div>

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

// ─── Complete Modal ───────────────────────────────────────────────────────────

interface CompleteModalProps {
    request: ServiceRequestItem;
    saving: boolean;
    onClose: () => void;
    onConfirm: (requestId: string, feedback: string) => void;
}

const CompleteModal: React.FC<CompleteModalProps> = ({ request, saving, onClose, onConfirm }) => {
    const [feedback, setFeedback] = useState('');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white border border-gray-100 rounded-[24px] shadow-card w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[12px] flex items-center justify-center border border-gray-100 bg-nile-green text-white">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <p className="font-semibold text-[10px] text-black">Mark Session Complete</p>
                            <p className="text-[8px] font-semibold text-black/40 tracking-wider">{request.student_name} · {TYPE_LABELS[request.type]}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 hover:bg-black hover:text-white transition-all">
                        <X size={14} />
                    </button>
                </div>

                <div className="p-6 space-y-2">
                    <label className="text-[8px] font-semibold text-black/50">FEEDBACK FOR STUDENT (OPTIONAL)</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Share notes, scores or recommendations from this session..."
                        className="w-full h-28 border border-gray-100 rounded-xl px-4 py-3 font-semibold text-[10px] outline-none focus:shadow-card transition-all bg-white resize-none"
                    />
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <Button variant="outline" size="sm" fullWidth onClick={onClose} disabled={saving}>
                        CANCEL
                    </Button>
                    <Button
                        variant="nileGreen"
                        size="sm"
                        fullWidth
                        isLoading={saving}
                        onClick={() => onConfirm(request.id, feedback)}
                        disabled={saving}
                    >
                        <CheckCircle2 size={12} />
                        MARK COMPLETE
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
        mock_interview: 'bg-nile-blue',
        career_advisory: 'bg-purple-500',
        cv_review: 'bg-nile-green',
    };
    const accentShadow: Record<ServiceType, string> = {
        mock_interview: 'shadow-blue',
        career_advisory: 'shadow-soft-md',
        cv_review: 'shadow-green',
    };
    const activeBorder: Record<ServiceType, string> = {
        mock_interview: 'border-nile-blue',
        career_advisory: 'border-purple-500',
        cv_review: 'border-nile-green',
    };

    return (
        <button
            onClick={onClick}
            className={`group w-full text-left bg-white border-[2px] rounded-[20px] p-5 transition-all hover:-translate-y-0.5 hover:shadow-card
                ${active
                    ? `${activeBorder[type]} ${accentShadow[type]}`
                    : 'border-black shadow-card'
                }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center border border-gray-100 text-white ${iconBg[type]}`}>
                    {SERVICE_ICONS[type]}
                </div>
                {pending > 0 && (
                    <span className="text-[7px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-300">
                        {pending} PENDING
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl font-semibold text-black leading-none">{count}</p>
                <p className="text-[8px] font-semibold text-black/40 mt-1">{TYPE_LABELS[type]} Requests</p>
            </div>
            <div className="mt-3 h-1 rounded-full bg-black/5 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${iconBg[type]}`}
                    style={{ width: count > 0 ? `${Math.min(100, ((count - pending) / count) * 100)}%` : '0%' }}
                />
            </div>
            <p className="text-[7px] font-semibold text-black/30 mt-1 tracking-wider">
                {count > 0 ? `${Math.round(((count - pending) / count) * 100)}% resolved` : 'No requests yet'}
            </p>
        </button>
    );
};

// ─── Request Row ──────────────────────────────────────────────────────────────

interface RequestRowProps {
    request: ServiceRequestItem;
    onSchedule: (req: ServiceRequestItem) => void;
    onComplete: (req: ServiceRequestItem) => void;
    onDecline: (reqId: string) => void;
    onJoin: (roomId: string) => void;
    onViewProfile: (studentId: string) => void;
    actionLoading: boolean;
}

const RequestRow: React.FC<RequestRowProps> = ({
    request, onSchedule, onComplete, onDecline, onJoin, onViewProfile, actionLoading,
}) => {
    const { type, status, created_at, scheduled_at, student_name, major, graduation_year, resume_url, staff_name, feedback, room_id } = request;

    const formattedDate = (() => {
        try {
            return new Date(created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
            });
        } catch {
            return 'Unknown date';
        }
    })();

    const formattedScheduled = scheduled_at
        ? new Date(scheduled_at).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })
        : null;

    return (
        <div className="bg-white border border-gray-100 rounded-[18px] p-4 flex flex-col gap-3 hover:shadow-card transition-all group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar + student info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={student_name} size="sm" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <p className="font-semibold text-[11px] text-black truncate leading-none">
                                {student_name || 'Unknown student'}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[7px] font-semibold px-2 py-0.5 rounded-full border ${SERVICE_COLORS[type]}`}>
                                {SERVICE_ICONS[type]}
                                {TYPE_LABELS[type]}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[7px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                                {STATUS_ICON[status]}
                                {STATUS_LABELS[status]}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1">
                            <span className="text-[7px] font-semibold text-black/40">{major || 'No Major'}</span>
                            <span className="text-[7px] font-semibold text-black/30">Class of {graduation_year || '—'}</span>
                            <span className="text-[7px] font-semibold text-black/25 flex items-center gap-1">
                                <Clock size={8} /> Requested {formattedDate}
                            </span>
                            {formattedScheduled && (
                                <span className="text-[7px] font-semibold text-nile-blue/60 flex items-center gap-1">
                                    <Calendar size={8} /> {formattedScheduled}
                                </span>
                            )}
                            {staff_name && (
                                <span className="text-[7px] font-semibold text-black/25">Assigned: {staff_name}</span>
                            )}
                            {resume_url && (
                                <a
                                    href={resume_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[7px] font-semibold text-nile-green underline flex items-center gap-1"
                                >
                                    <FileText size={8} /> VIEW CV
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                    {status === 'pending' && (
                        <>
                            <button
                                onClick={() => onSchedule(request)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-nile-blue text-white border border-gray-100 rounded-xl font-semibold text-[8px] shadow-card transition-all disabled:opacity-40"
                            >
                                <Calendar size={11} />
                                SCHEDULE
                            </button>
                            <button
                                onClick={() => onDecline(request.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-red-500 border border-red-200 rounded-xl font-semibold text-[8px] hover:bg-red-50 transition-all disabled:opacity-40"
                            >
                                {actionLoading ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                                DECLINE
                            </button>
                        </>
                    )}
                    {(status === 'pending' || status === 'scheduled') && (
                        <button
                            onClick={() => onComplete(request)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-nile-green text-white border border-gray-100 rounded-xl font-semibold text-[8px] shadow-card transition-all disabled:opacity-40"
                        >
                            {actionLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            COMPLETE
                        </button>
                    )}
                    {status === 'scheduled' && room_id && (
                        <button
                            onClick={() => onJoin(room_id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[8px] shadow-green transition-all"
                        >
                            <Zap size={11} />
                            JOIN SESSION
                        </button>
                    )}
                    {status === 'completed' && (
                        <span className="flex items-center gap-1.5 px-3 py-2 bg-nile-green/10 text-nile-green border-[2px] border-nile-green/30 rounded-xl font-semibold text-[8px]">
                            <CheckCircle2 size={11} />
                            DONE
                        </span>
                    )}
                    {status === 'declined' && (
                        <span className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-400 border-[2px] border-red-200 rounded-xl font-semibold text-[8px]">
                            <XCircle size={11} />
                            DECLINED
                        </span>
                    )}
                    <button
                        onClick={() => onViewProfile(request.student_id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-black border border-gray-100 rounded-xl font-semibold text-[8px] hover:bg-black hover:text-white transition-all"
                    >
                        <Users size={11} />
                        PROFILE
                    </button>
                </div>
            </div>

            {status === 'completed' && feedback && (
                <div className="p-3 bg-nile-green/5 border border-nile-green/20 rounded-xl">
                    <p className="text-[7px] font-semibold text-nile-green/70 mb-1">FEEDBACK GIVEN</p>
                    <p className="text-[9px] font-semibold text-black/60 leading-relaxed">{feedback}</p>
                </div>
            )}
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
    <div className={`flex items-center gap-2.5 px-4 py-2.5 border border-gray-100 rounded-xl font-semibold ${color}`}>
        {icon && <span className="opacity-60">{icon}</span>}
        <span className="text-xl font-semibold leading-none">{value}</span>
        <span className="text-[7px] leading-tight max-w-[60px]">{label}</span>
    </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: TabFilter }> = ({ tab }) => (
    <div className="py-20 border-[2px] border-dashed border-black/10 rounded-[24px] flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-[18px] bg-black/5 border border-gray-100/10 flex items-center justify-center text-black/20">
            {tab === 'MOCK INTERVIEWS' ? <Mic size={24} />
                : tab === 'CAREER ADVISORY' ? <MessageSquare size={24} />
                : tab === 'CV REVIEW' ? <FileText size={24} />
                : <Users size={24} />}
        </div>
        <p className="text-[9px] font-semibold text-black/30 text-center px-4">
            No service requests match your current filters.
        </p>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffServices: React.FC = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const [activeTab, setActiveTab] = useState<TabFilter>('ALL REQUESTS');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [search, setSearch] = useState('');
    const [schedulingRequest, setSchedulingRequest] = useState<ServiceRequestItem | null>(null);
    const [completingRequest, setCompletingRequest] = useState<ServiceRequestItem | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    // ── Load ──────────────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data } = await apiClient.get<ApiEnvelope<{ requests: ServiceRequestItem[] }>>('/api/staff/service-requests');
            setRequests(data.data?.requests || []);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    // ── Metrics ───────────────────────────────────────────────────────────────

    const metrics = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter((r) => r.status === 'pending').length;
        const scheduled = requests.filter((r) => r.status === 'scheduled').length;
        const completed = requests.filter((r) => r.status === 'completed').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, pending, scheduled, completionRate, completed };
    }, [requests]);

    // Service type counts
    const typeCounts = useMemo(() => {
        const counts: Record<ServiceType, number> = { mock_interview: 0, career_advisory: 0, cv_review: 0 };
        const pendingCounts: Record<ServiceType, number> = { mock_interview: 0, career_advisory: 0, cv_review: 0 };
        requests.forEach((r) => {
            counts[r.type]++;
            if (r.status === 'pending') pendingCounts[r.type]++;
        });
        return { counts, pendingCounts };
    }, [requests]);

    // ── Filtered list ─────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = [...requests];

        if (activeTab === 'MOCK INTERVIEWS') list = list.filter((r) => r.type === 'mock_interview');
        if (activeTab === 'CAREER ADVISORY') list = list.filter((r) => r.type === 'career_advisory');
        if (activeTab === 'CV REVIEW') list = list.filter((r) => r.type === 'cv_review');

        if (statusFilter !== 'All') list = list.filter((r) => r.status === statusFilter);

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((r) =>
                r.student_name.toLowerCase().includes(q) ||
                r.student_email.toLowerCase().includes(q) ||
                (r.major || '').toLowerCase().includes(q) ||
                TYPE_LABELS[r.type].toLowerCase().includes(q)
            );
        }

        const order: Record<RequestStatus, number> = { pending: 0, scheduled: 1, completed: 2, declined: 3 };
        list.sort((a, b) => order[a.status] - order[b.status] || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        return list;
    }, [requests, activeTab, statusFilter, search]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const updateRequest = useCallback(async (id: string, payload: Record<string, unknown>, successMsg: string) => {
        setActionLoading((p) => ({ ...p, [id]: true }));
        try {
            await apiClient.put(`/api/staff/service-requests?id=${id}`, payload);
            showToast(successMsg, 'success');
            await load();
        } catch (err) {
            showToast(getErrorMessage(err, 'Failed to update request'), 'error');
        } finally {
            setActionLoading((p) => ({ ...p, [id]: false }));
        }
    }, [load, showToast]);

    const handleScheduleConfirm = useCallback(async (requestId: string, isoDatetime: string) => {
        await updateRequest(requestId, { status: 'scheduled', scheduled_at: isoDatetime }, 'Session scheduled — a video room has been created.');
        setSchedulingRequest(null);
    }, [updateRequest]);

    const handleCompleteConfirm = useCallback(async (requestId: string, feedback: string) => {
        await updateRequest(requestId, { status: 'completed', feedback }, 'Session marked complete.');
        setCompletingRequest(null);
    }, [updateRequest]);

    const handleDecline = useCallback((requestId: string) => {
        updateRequest(requestId, { status: 'declined' }, 'Request declined.');
    }, [updateRequest]);

    const handleViewProfile = useCallback((studentId: string) => {
        navigate(`/staff/students/${studentId}`);
    }, [navigate]);

    const handleJoinSession = useCallback((roomId: string) => {
        navigate(`/staff/session/${roomId}`);
    }, [navigate]);

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

    if (loadError) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="w-16 h-16 bg-red-50 border-[2px] border-red-200 rounded-[20px] flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
            </div>
            <div>
                <p className="font-semibold text-lg text-black">Could not load service requests</p>
                <p className="text-[9px] font-semibold text-black/40 mt-1">Please try again or log out and back in</p>
            </div>
            <button onClick={load} className="px-6 py-3 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-green transition-all">
                TRY AGAIN
            </button>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const TABS: TabFilter[] = ['ALL REQUESTS', 'MOCK INTERVIEWS', 'CAREER ADVISORY', 'CV REVIEW'];

    return (
        <>
            <div className="p-4 md:p-8 space-y-8 font-sans pb-24 text-left min-h-full">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-semibold text-black leading-none">
                            Career Services .
                        </h2>
                        <p className="text-[9px] font-semibold text-black/40 mt-1">
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
                    <MetricPill label="TOTAL REQUESTS" value={metrics.total} color="bg-black text-white" icon={<Users size={14} />} />
                    <MetricPill label="PENDING" value={metrics.pending} color="bg-yellow-50 text-yellow-700" icon={<Clock size={14} />} />
                    <MetricPill label="SCHEDULED" value={metrics.scheduled} color="bg-nile-blue/10 text-nile-blue" icon={<Calendar size={14} />} />
                    <MetricPill label="COMPLETION RATE" value={`${metrics.completionRate}%`} color="bg-nile-green/10 text-nile-green" icon={<CheckCircle2 size={14} />} />
                </div>

                {/* ── Service Overview Cards ───────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {SERVICE_TYPES.map((type) => (
                        <ServiceOverviewCard
                            key={type}
                            type={type}
                            count={typeCounts.counts[type]}
                            pending={typeCounts.pendingCounts[type]}
                            active={activeTab === cardTabMap[type]}
                            onClick={() => {
                                setActiveTab(activeTab === cardTabMap[type] ? 'ALL REQUESTS' : cardTabMap[type]);
                                setStatusFilter('All');
                            }}
                        />
                    ))}
                </div>

                {/* ── Tabs + Filters ───────────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                    <div className="flex bg-white p-1 border border-gray-100 rounded-2xl shadow-sm overflow-x-auto gap-0.5">
                        {TABS.map((tab) => {
                            const count = tab === 'ALL REQUESTS' ? requests.length
                                : tab === 'MOCK INTERVIEWS' ? typeCounts.counts.mock_interview
                                : tab === 'CAREER ADVISORY' ? typeCounts.counts.career_advisory
                                : typeCounts.counts.cv_review;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setStatusFilter('All'); setSearch(''); }}
                                    className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-semibold text-[8px] transition-all whitespace-nowrap
                                        ${activeTab === tab ? 'bg-black text-white shadow-green' : 'text-black/40 hover:text-black'}`}
                                >
                                    {tab === 'ALL REQUESTS' && <Users size={10} />}
                                    {tab === 'MOCK INTERVIEWS' && <Mic size={10} />}
                                    {tab === 'CAREER ADVISORY' && <MessageSquare size={10} />}
                                    {tab === 'CV REVIEW' && <FileText size={10} />}
                                    {tab}
                                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-black/5 text-black/50'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="SEARCH BY NAME, EMAIL, MAJOR, OR SERVICE TYPE..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 font-semibold text-[9px] outline-none focus:shadow-card bg-white transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black">
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowStatusDropdown((p) => !p)}
                                className="flex items-center gap-2 px-4 py-3 border border-gray-100 rounded-xl font-semibold text-[9px] bg-white hover:bg-black hover:text-white transition-all whitespace-nowrap"
                            >
                                <span className={`w-2 h-2 rounded-full ${
                                    statusFilter === 'pending' ? 'bg-yellow-400'
                                        : statusFilter === 'scheduled' ? 'bg-nile-blue'
                                        : statusFilter === 'completed' ? 'bg-nile-green'
                                        : statusFilter === 'declined' ? 'bg-red-400'
                                        : 'bg-black'
                                }`} />
                                {statusFilter === 'All' ? 'ALL STATUS' : STATUS_LABELS[statusFilter]}
                                <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showStatusDropdown && (
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-card overflow-hidden min-w-[140px]">
                                    {(['All', 'pending', 'scheduled', 'completed', 'declined'] as StatusFilter[]).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { setStatusFilter(s); setShowStatusDropdown(false); }}
                                            className={`w-full text-left px-4 py-2.5 font-semibold text-[8px] hover:bg-black/5 transition-colors flex items-center gap-2
                                                ${statusFilter === s ? 'bg-black/5 text-black' : 'text-black/60'}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                s === 'pending' ? 'bg-yellow-400'
                                                    : s === 'scheduled' ? 'bg-nile-blue'
                                                    : s === 'completed' ? 'bg-nile-green'
                                                    : s === 'declined' ? 'bg-red-400'
                                                    : 'bg-black/20'
                                            }`} />
                                            {s === 'All' ? 'All Status' : STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-[8px] font-semibold text-black/30">
                        SHOWING {filtered.length} OF {requests.length} REQUESTS
                        {search && ` · SEARCH: "${search}"`}
                        {statusFilter !== 'All' && ` · STATUS: ${STATUS_LABELS[statusFilter]}`}
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
                                onComplete={setCompletingRequest}
                                onDecline={handleDecline}
                                onJoin={handleJoinSession}
                                onViewProfile={handleViewProfile}
                                actionLoading={!!actionLoading[req.id]}
                            />
                        ))}
                    </div>
                )}
            </div>

            {schedulingRequest && (
                <ScheduleModal
                    request={schedulingRequest}
                    saving={!!actionLoading[schedulingRequest.id]}
                    onClose={() => setSchedulingRequest(null)}
                    onConfirm={handleScheduleConfirm}
                />
            )}

            {completingRequest && (
                <CompleteModal
                    request={completingRequest}
                    saving={!!actionLoading[completingRequest.id]}
                    onClose={() => setCompletingRequest(null)}
                    onConfirm={handleCompleteConfirm}
                />
            )}

            {showStatusDropdown && (
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
            )}
        </>
    );
};

export default StaffServices;
