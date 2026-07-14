import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Video, ArrowUpRight, Cpu, Sparkles, X, Clock, User, CheckCircle2,
    Zap, Copy, FileText, Loader2, Plus, MessageSquareText,
} from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useAuth } from '../../context/AuthContext';
import { apiClient, getErrorMessage } from '../../services/api';

interface ServiceRequestItem {
    id: string;
    type: 'mock_interview' | 'career_advisory' | 'cv_review';
    status: 'pending' | 'scheduled' | 'completed' | 'declined';
    notes: string;
    feedback: string;
    scheduled_at: string | null;
    room_id: string;
    staff_name: string;
    created_at: string;
}

interface ApiEnvelope<T> { data: T; }

const SERVICE_TYPES: { value: ServiceRequestItem['type']; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'mock_interview', label: 'Mock Interview', icon: <Video size={18} />, description: 'Practice with a staff member in a live video call' },
    { value: 'career_advisory', label: 'Career Advisory', icon: <User size={18} />, description: 'Get 1:1 guidance on your career path' },
    { value: 'cv_review', label: 'CV Review', icon: <FileText size={18} />, description: 'Get expert feedback on your CV' },
];

const TYPE_LABELS: Record<string, string> = {
    mock_interview: 'Mock Interview',
    career_advisory: 'Career Advisory',
    cv_review: 'CV Review',
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    scheduled: 'bg-nile-blue/10 text-nile-blue',
    completed: 'bg-nile-green/10 text-nile-green',
    declined: 'bg-red-100 text-red-600',
};

const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const CareerCenter = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);

    const [sessionLink, setSessionLink] = useState('');
    const [showSessionModal, setShowSessionModal] = useState(false);

    const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestType, setRequestType] = useState<ServiceRequestItem['type']>('mock_interview');
    const [requestNotes, setRequestNotes] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);

    const fetchRequests = useCallback(() => {
        apiClient
            .get<ApiEnvelope<{ requests: ServiceRequestItem[] }>>('/api/student/services')
            .then(({ data }) => setRequests(data.data?.requests || []))
            .catch(() => {})
            .finally(() => setLoadingRequests(false));
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const generateRoomId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const handleStartLiveSession = () => {
        const roomId = generateRoomId();
        const link = `${window.location.origin}/student/session/${roomId}`;
        setSessionLink(link);
        setShowSessionModal(true);
    };

    const handleJoinSession = () => {
        const roomId = sessionLink.split('/session/')[1];
        if (roomId) navigate(`/student/session/${roomId}`);
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingRequest(true);
        try {
            await apiClient.post('/api/student/services', { type: requestType, notes: requestNotes });
            showToast('Request submitted — staff will follow up soon!', 'success');
            setShowRequestModal(false);
            setRequestNotes('');
            setRequestType('mock_interview');
            fetchRequests();
        } catch (err) {
            showToast(getErrorMessage(err, 'Failed to submit request'), 'error');
        } finally {
            setSubmittingRequest(false);
        }
    };

    return (
        <>
            <div className="p-4 md:p-10 space-y-6 md:space-y-8 font-sans bg-nile-white min-h-full pb-24">

                {/* Header */}
                <div className="border-b border-gray-100 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h2 className="text-3xl md:text-6xl font-semibold text-black leading-none">Careers .</h2>
                        <p className="text-[10px] md:text-lg font-bold text-nile-blue/70 mt-2">Accelerate your professional readiness .</p>
                    </div>
                    <button
                        onClick={handleStartLiveSession}
                        className="flex items-center gap-2 px-5 py-3 bg-nile-blue text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-green transition-all flex-shrink-0 animate-pulse"
                    >
                        <Zap size={13} strokeWidth={3} /> START LIVE SESSION
                    </button>
                </div>

                {/* Career Readiness Banner */}
                <div className="bg-nile-green text-white p-6 md:p-8 rounded-[28px] border border-gray-100 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                    <div className="space-y-3 flex-1">
                        <p className="text-[9px] font-semibold text-white/60">OVERALL READINESS</p>
                        <h3 className="text-xl md:text-3xl font-semibold text-white">Profile Strength</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-3 bg-white/20 rounded-full border border-white/30 overflow-hidden max-w-xs">
                                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${strength}%` }} />
                            </div>
                            <span className="font-semibold text-white text-lg">{strength}%</span>
                        </div>
                        <p className="text-[9px] font-bold text-white/70">
                            {strength < 60 ? 'COMPLETE YOUR PROFILE TO UNLOCK MORE OPPORTUNITIES.' : strength < 85 ? 'GREAT PROGRESS! ADD LINKS TO REACH 100%.' : 'EXCELLENT! YOUR PROFILE IS STRONG.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="bg-white text-nile-green font-semibold py-3 px-6 rounded-full border border-gray-100 shadow-card transition-all text-[10px] whitespace-nowrap flex-shrink-0"
                    >
                        REQUEST CAREER SERVICE
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">

                    {/* AI Architect Card */}
                    <div className="bg-white p-6 md:p-8 rounded-[28px] border border-gray-100 shadow-card space-y-5 text-left">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl md:text-2xl font-semibold text-black">AI Architect .</h3>
                            <div className="w-10 h-10 bg-nile-green text-white rounded-xl border border-gray-100 shadow-card flex items-center justify-center">
                                <Cpu size={18} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/student/career/ai')}
                            className="aspect-video border-[2px] border-dashed border-black rounded-[20px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-nile-green/5 transition-all group"
                        >
                            <Sparkles size={36} strokeWidth={2} className="text-nile-blue/30 group-hover:text-nile-green group-hover:scale-110 transition-all" />
                            <div className="text-center">
                                <p className="font-semibold text-black text-sm">Scan &amp; Evolve</p>
                                <p className="text-[9px] font-semibold text-nile-blue/30 mt-1">AI-Powered CV Analysis</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/student/career/ai')}
                            className="w-full bg-nile-green text-white font-semibold py-3.5 rounded-full border border-gray-100 shadow-card transition-all text-[10px] flex items-center justify-center gap-2"
                        >
                            <Cpu size={14} /> LAUNCH NEURAL ANALYSIS
                        </button>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">

                        {/* Mock Interview */}
                        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-gray-100 shadow-card text-left">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg md:text-xl font-semibold text-black">Mock Interview .</h3>
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl border border-gray-100 shadow-card flex items-center justify-center">
                                    <Video size={16} strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="font-bold text-nile-blue/70 text-[10px] mb-5 leading-relaxed tracking-wider">
                                PRACTICE WITH AN AI INTERVIEWER — GET REAL-TIME FEEDBACK AND SCORES ON YOUR ANSWERS.
                            </p>
                            <div className="grid grid-cols-3 gap-2 mb-5">
                                {['Behavioral', 'Technical', 'HR Round'].map(t => (
                                    <div key={t} className="text-center p-2.5 bg-nile-white border border-gray-100/10 rounded-xl">
                                        <p className="text-[8px] font-semibold text-black/50">{t}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => navigate('/student/career/mock-interview')}
                                className="w-full bg-nile-blue text-white font-semibold py-3.5 rounded-full border border-gray-100 shadow-card transition-all text-[10px] flex items-center justify-center gap-2"
                            >
                                <span>START SESSION</span>
                                <ArrowUpRight size={16} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Career Services */}
                        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-gray-100 shadow-card text-left">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg md:text-xl font-semibold text-black">Career Services .</h3>
                                <button
                                    onClick={() => setShowRequestModal(true)}
                                    className="flex items-center gap-1 text-[9px] font-semibold text-nile-blue hover:text-nile-green transition-colors"
                                >
                                    <Plus size={12} strokeWidth={3} /> NEW REQUEST
                                </button>
                            </div>

                            {loadingRequests ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 size={22} className="animate-spin text-nile-blue/30" />
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-8 space-y-3">
                                    <MessageSquareText size={28} className="mx-auto text-nile-blue/20" />
                                    <p className="text-[10px] font-semibold text-black/40">No requests yet. Book a mock interview, career advisory or CV review with our staff.</p>
                                    <Button size="xs" onClick={() => setShowRequestModal(true)}>REQUEST A SERVICE</Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.map(req => (
                                        <ServiceRequestCard
                                            key={req.id}
                                            req={req}
                                            onJoin={(roomId) => navigate(`/student/session/${roomId}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Service Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestModal(false)}>
                    <div className="bg-white border border-gray-100 rounded-[28px] shadow-card max-w-md w-full p-6 md:p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold">Request Career Service</h3>
                            <button onClick={() => setShowRequestModal(false)} className="p-1.5 border border-gray-100/10 rounded-lg hover:bg-black/5">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitRequest} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-semibold text-black/50">SERVICE TYPE</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {SERVICE_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setRequestType(t.value)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                requestType === t.value
                                                    ? 'border-nile-blue bg-nile-blue/5 shadow-blue'
                                                    : 'border-gray-100 hover:border-nile-blue/30'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${requestType === t.value ? 'bg-nile-blue text-white' : 'bg-nile-white text-nile-blue'}`}>
                                                {t.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm leading-none">{t.label}</p>
                                                <p className="text-[9px] font-semibold text-black/40 mt-1">{t.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold text-black/50">WHAT DO YOU NEED HELP WITH?</label>
                                <textarea
                                    value={requestNotes}
                                    onChange={e => setRequestNotes(e.target.value)}
                                    placeholder="e.g. My CV needs improvement and I have an interview at Google next month..."
                                    className="w-full h-24 border border-gray-100 rounded-xl py-3 px-4 font-bold text-sm outline-none focus:shadow-blue transition-all bg-nile-white/40 resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" fullWidth type="button" onClick={() => setShowRequestModal(false)}>CANCEL</Button>
                                <Button fullWidth type="submit" isLoading={submittingRequest}>
                                    SUBMIT REQUEST
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Session Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowSessionModal(false)}>
                    <div className="bg-white border border-gray-100 rounded-[28px] shadow-green max-w-md w-full p-6 space-y-5 anime-fade-in"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-nile-blue rounded-xl border border-gray-100 flex items-center justify-center">
                                    <Video size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-base tracking-tight">Live Session</h3>
                                    <p className="text-[7px] font-semibold text-black/40">REAL-TIME VIDEO CALL</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSessionModal(false)} className="p-1.5 rounded-lg border border-gray-100/10 hover:bg-black/5">
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-4 bg-nile-blue/5 border-[2px] border-nile-blue/20 rounded-[16px] space-y-2">
                            <p className="text-[8px] font-semibold text-black/50">YOUR SESSION LINK</p>
                            <p className="text-[9px] font-bold text-nile-blue break-all leading-relaxed">{sessionLink}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-semibold text-black/60 leading-relaxed">
                                Share this link with your career advisor. When they join, you'll be connected in a live video call — right here in NileConnect.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(sessionLink); showToast('Link copied!', 'success'); }}
                                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-100 rounded-xl font-semibold text-[8px] hover:bg-black hover:text-white transition-all"
                                >
                                    <Copy size={12} /> COPY LINK
                                </button>
                                <button
                                    onClick={handleJoinSession}
                                    className="flex-1 py-2 bg-nile-blue text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-green transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap size={12} /> JOIN NOW
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ServiceRequestCard = ({ req, onJoin }: { req: ServiceRequestItem; onJoin: (roomId: string) => void }) => {
    const scheduled = formatDate(req.scheduled_at);
    return (
        <div className="p-4 border border-gray-100 rounded-[18px] shadow-card bg-white space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-black text-[11px] leading-none">{TYPE_LABELS[req.type] || req.type}</p>
                <span className={`text-[8px] font-semibold px-2 py-1 rounded-full uppercase ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                    {req.status}
                </span>
            </div>
            {req.notes && <p className="text-[9px] font-semibold text-black/50 leading-relaxed">{req.notes}</p>}
            <div className="flex items-center gap-3 flex-wrap text-[8px] font-semibold text-nile-blue/50">
                {req.staff_name && (
                    <span className="flex items-center gap-1"><User size={10} strokeWidth={3} /> {req.staff_name}</span>
                )}
                {scheduled && (
                    <span className="flex items-center gap-1"><Clock size={10} strokeWidth={3} /> {scheduled}</span>
                )}
            </div>
            {req.status === 'completed' && req.feedback && (
                <div className="p-2.5 bg-nile-green/5 border border-nile-green/20 rounded-xl">
                    <p className="text-[8px] font-semibold text-nile-green/70 mb-1">FEEDBACK</p>
                    <p className="text-[9px] font-semibold text-black/60 leading-relaxed">{req.feedback}</p>
                </div>
            )}
            {req.status === 'scheduled' && req.room_id && (
                <button
                    onClick={() => onJoin(req.room_id)}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2 bg-nile-blue text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-green transition-all"
                >
                    <Zap size={12} /> JOIN SESSION
                </button>
            )}
            {req.status === 'completed' && (
                <span className="flex items-center gap-1 text-[8px] font-semibold text-nile-green">
                    <CheckCircle2 size={10} strokeWidth={3} /> COMPLETED
                </span>
            )}
        </div>
    );
};

export default CareerCenter;
