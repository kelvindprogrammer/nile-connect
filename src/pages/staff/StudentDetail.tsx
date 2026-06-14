import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, ShieldCheck, AlertCircle, Loader2, FileText, Briefcase,
    MessageCircle, Calendar, Clock, CheckCircle2, XCircle, Zap, AtSign, GraduationCap,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { apiClient } from '../../services/api';

interface AppItem {
    id: string;
    job_id: string;
    job_title: string;
    company: string;
    status: string;
    applied_at: string | null;
    cover_letter: string;
    resume_url: string;
}

interface ServiceReqItem {
    id: string;
    type: string;
    status: string;
    notes: string;
    feedback: string;
    scheduled_at: string | null;
    room_id: string;
    created_at: string;
    staff_name: string;
}

interface StudentDetailData {
    id: string;
    full_name: string;
    username: string;
    email: string;
    major: string;
    graduation_year: number;
    is_verified: boolean;
    resume_url: string;
    student_subtype: string;
    created_at: string;
    applications: AppItem[];
    service_requests: ServiceReqItem[];
}

interface ApiEnvelope<T> { data: T; }

const APP_STATUS_BADGE: Record<string, string> = {
    applied: 'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    screening: 'bg-purple-50 text-purple-600 border-purple-200',
    interview: 'bg-orange-50 text-orange-500 border-orange-200',
    offer: 'bg-nile-green/20 text-nile-green border-nile-green/30',
    rejected: 'bg-red-50 text-red-500 border-red-200',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
    mock_interview: 'Mock Interview',
    career_advisory: 'Career Advisory',
    cv_review: 'CV Review',
};

const SERVICE_STATUS_BADGE: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-600 border-yellow-300',
    scheduled: 'bg-nile-blue/10 text-nile-blue border-nile-blue/40',
    completed: 'bg-nile-green/10 text-nile-green border-nile-green/30',
    declined: 'bg-red-50 text-red-500 border-red-200',
};

const SERVICE_STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock size={9} />,
    scheduled: <Calendar size={9} />,
    completed: <CheckCircle2 size={9} />,
    declined: <XCircle size={9} />,
};

const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const StaffStudentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [student, setStudent] = useState<StudentDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(() => {
            if (!id) { setLoading(false); setNotFound(true); return; }
            apiClient
                .get<ApiEnvelope<StudentDetailData>>(`/api/staff/student-detail?id=${id}`)
                .then(({ data }) => { if (!cancelled) setStudent(data.data); })
                .catch(() => { if (!cancelled) setNotFound(true); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }, 0);
        return () => { cancelled = true; clearTimeout(t); };
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center h-full py-24">
            <Loader2 size={32} className="animate-spin text-nile-blue/40" />
        </div>
    );

    if (notFound || !student) return (
        <div className="p-8 anime-fade-in text-left space-y-6">
            <button onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-black/40 font-semibold text-[9px] hover:text-black transition-colors">
                <ArrowLeft size={14} strokeWidth={3} /> BACK
            </button>
            <div className="py-24 text-center border-[2px] border-dashed border-black/10 rounded-[32px]">
                <AlertCircle size={32} className="text-black/20 mx-auto mb-4" />
                <p className="text-[9px] font-semibold text-black/30">Student not found</p>
            </div>
        </div>
    );

    const joined = formatDate(student.created_at);

    return (
        <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Nav */}
            <button onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-black/40 font-semibold text-[9px] hover:text-black transition-colors">
                <ArrowLeft size={14} strokeWidth={3} /> BACK
            </button>

            {/* Header Card */}
            <Card className="!p-6 md:!p-8 border-nile-blue/30">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] border border-gray-100 shadow-blue overflow-hidden flex-shrink-0">
                            <Avatar name={student.full_name || 'Student'} size="lg" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-semibold text-black leading-none">
                                    {student.full_name || 'Unknown Student'}
                                </h1>
                                {student.is_verified && (
                                    <ShieldCheck size={16} className="text-nile-green flex-shrink-0" strokeWidth={2.5} />
                                )}
                            </div>
                            <p className="text-[9px] font-semibold text-nile-blue/50">
                                {student.major || 'Undeclared'}{student.graduation_year ? ` · Class of ${student.graduation_year}` : ''}
                                {student.student_subtype ? ` · ${student.student_subtype}` : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                {student.email && (
                                    <span className="flex items-center gap-1 text-[8px] font-semibold text-black/40">
                                        <Mail size={10} className="text-nile-blue" /> {student.email}
                                    </span>
                                )}
                                {student.username && (
                                    <span className="flex items-center gap-1 text-[8px] font-semibold text-black/40">
                                        <AtSign size={10} className="text-nile-blue" /> {student.username}
                                    </span>
                                )}
                                {joined && (
                                    <span className="flex items-center gap-1 text-[8px] font-semibold text-black/30">
                                        <Calendar size={10} /> Joined {joined}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {student.resume_url && (
                            <Button variant="outline" size="md"
                                onClick={() => window.open(student.resume_url, '_blank')}
                                className="flex-1 md:flex-none flex items-center gap-2">
                                <FileText size={14} /> VIEW CV
                            </Button>
                        )}
                        <Button variant="primary" size="md"
                            onClick={() => navigate('/staff/messages', { state: { startConversationWith: { id: student.id, full_name: student.full_name } } })}
                            className="flex-1 md:flex-none flex items-center gap-2">
                            <MessageCircle size={14} /> MESSAGE
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Service Requests */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-semibold text-black/40">
                    CAREER SERVICE REQUESTS ({student.service_requests.length})
                </h3>
                {student.service_requests.length === 0 ? (
                    <Card className="!p-6 text-center">
                        <p className="text-[9px] font-semibold text-black/30">No career service requests yet.</p>
                    </Card>
                ) : student.service_requests.map(req => {
                    const scheduled = formatDateTime(req.scheduled_at);
                    return (
                        <Card key={req.id} className="!p-5 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="font-semibold text-sm tracking-tight">{SERVICE_TYPE_LABELS[req.type] || req.type}</h4>
                                    <p className="text-[8px] font-semibold text-black/30 mt-1">
                                        Requested {formatDate(req.created_at)}
                                        {scheduled && ` · Scheduled ${scheduled}`}
                                        {req.staff_name && ` · Handled by ${req.staff_name}`}
                                    </p>
                                </div>
                                <span className={`flex items-center gap-1 text-[7px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${SERVICE_STATUS_BADGE[req.status] || 'bg-black/5 text-black/40 border-black/10'}`}>
                                    {SERVICE_STATUS_ICON[req.status]}
                                    {req.status.toUpperCase()}
                                </span>
                            </div>
                            {req.notes && (
                                <p className="text-[9px] font-semibold text-black/50 leading-relaxed border-t border-black/5 pt-3">{req.notes}</p>
                            )}
                            {req.status === 'completed' && req.feedback && (
                                <div className="p-3 bg-nile-green/5 border border-nile-green/20 rounded-xl">
                                    <p className="text-[7px] font-semibold text-nile-green/70 mb-1">FEEDBACK</p>
                                    <p className="text-[9px] font-semibold text-black/60 leading-relaxed">{req.feedback}</p>
                                </div>
                            )}
                            {req.status === 'scheduled' && req.room_id && (
                                <button
                                    onClick={() => navigate(`/staff/session/${req.room_id}`)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[8px] shadow-green transition-all w-fit"
                                >
                                    <Zap size={11} /> JOIN SESSION
                                </button>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Applications */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-semibold text-black/40">
                    JOB APPLICATIONS ({student.applications.length})
                </h3>
                {student.applications.length === 0 ? (
                    <Card className="!p-6 text-center">
                        <p className="text-[9px] font-semibold text-black/30">No job applications yet.</p>
                    </Card>
                ) : student.applications.map(app => (
                    <Card key={app.id} className="!p-5 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Briefcase size={14} className="text-nile-blue flex-shrink-0" />
                                    <h4 className="font-semibold text-sm tracking-tight">{app.job_title || 'Untitled role'}</h4>
                                </div>
                                {app.company && (
                                    <p className="text-[8px] font-semibold text-nile-blue/50 mt-1">{app.company}</p>
                                )}
                                {app.applied_at && (
                                    <p className="text-[8px] font-semibold text-black/30 mt-1">
                                        Applied {formatDate(app.applied_at)}
                                    </p>
                                )}
                            </div>
                            <span className={`text-[7px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${APP_STATUS_BADGE[app.status] || 'bg-black/5 text-black/40 border-black/10'}`}>
                                {app.status.toUpperCase()}
                            </span>
                        </div>
                        {app.cover_letter && (
                            <p className="text-[9px] font-semibold text-black/50 leading-relaxed border-t border-black/5 pt-3">{app.cover_letter}</p>
                        )}
                        {app.resume_url && (
                            <a
                                href={app.resume_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[8px] font-semibold text-nile-green underline"
                            >
                                <FileText size={10} /> VIEW CV ATTACHED TO THIS APPLICATION
                            </a>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default StaffStudentDetail;
