import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, GraduationCap, Briefcase, ShieldCheck,
    ExternalLink, Loader2, AlertCircle, MessageCircle,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { getEmployerApplications, updateApplicationStatus, EmployerApplication } from '../../services/employerService';

const statusBadge: Record<string, string> = {
    applied:   'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    screening: 'bg-purple-50 text-purple-600 border-purple-200',
    interview: 'bg-orange-50 text-orange-500 border-orange-200',
    offer:     'bg-nile-green/20 text-nile-green border-nile-green/30',
    rejected:  'bg-red-50 text-red-500 border-red-200',
};

const NEXT_STATUS: Record<string, string> = {
    applied:   'screening',
    screening: 'interview',
    interview: 'offer',
};

const CandidateDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [apps, setApps] = useState<EmployerApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [advancing, setAdvancing] = useState<string | null>(null);

    useEffect(() => {
        if (!id) { setIsLoading(false); return; }
        getEmployerApplications()
            .then(all => setApps(all.filter(a => a.student_id === id)))
            .catch(() => showToast('Failed to load candidate details.', 'error'))
            .finally(() => setIsLoading(false));
    }, [id, showToast]);

    if (isLoading) return (
        <div className="flex items-center justify-center h-full py-24">
            <Loader2 size={32} className="animate-spin text-nile-blue/40" />
        </div>
    );

    if (apps.length === 0) return (
        <div className="p-8 anime-fade-in text-left space-y-6">
            <button onClick={() => navigate('/candidates')}
                className="flex items-center gap-2 text-black/40 font-black uppercase tracking-widest text-[9px] hover:text-black transition-colors">
                <ArrowLeft size={14} strokeWidth={3} /> BACK TO TALENT POOL
            </button>
            <div className="py-24 text-center border-[2px] border-dashed border-black/10 rounded-[32px]">
                <AlertCircle size={32} className="text-black/20 mx-auto mb-4" />
                <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Candidate not found or no applications</p>
            </div>
        </div>
    );

    const candidate = apps[0];
    const badge = statusBadge[candidate.status] || 'bg-black/5 text-black/40 border-black/10';
    const nextStatus = NEXT_STATUS[candidate.status];

    const handleAdvance = async (appId: string, status: string) => {
        setAdvancing(appId);
        try {
            await updateApplicationStatus(appId, status);
            setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
            showToast(`Application moved to ${status}`, 'success');
        } catch {
            showToast('Update failed. Please try again.', 'error');
        } finally {
            setAdvancing(null);
        }
    };

    const handleReject = async (appId: string) => {
        setAdvancing(appId);
        try {
            await updateApplicationStatus(appId, 'rejected');
            setApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' } : a));
            showToast('Application rejected', 'success');
        } catch {
            showToast('Update failed.', 'error');
        } finally {
            setAdvancing(null);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Nav */}
            <button onClick={() => navigate('/candidates')}
                className="flex items-center gap-2 text-black/40 font-black uppercase tracking-widest text-[9px] hover:text-black transition-colors">
                <ArrowLeft size={14} strokeWidth={3} /> BACK TO TALENT POOL
            </button>

            {/* Header Card */}
            <Card className="!p-6 md:!p-8 border-nile-green/30">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] overflow-hidden flex-shrink-0">
                            <Avatar name={candidate.student_name || 'Candidate'} size="lg" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-black text-black uppercase leading-none tracking-tighter">
                                    {candidate.student_name || 'Unknown Candidate'}
                                </h1>
                                {candidate.is_verified && (
                                    <ShieldCheck size={16} className="text-nile-green flex-shrink-0" strokeWidth={2.5} />
                                )}
                            </div>
                            <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-widest">
                                {candidate.major || 'Student'}{candidate.graduation_year ? ` · Class of ${candidate.graduation_year}` : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {candidate.student_email && (
                                    <span className="flex items-center gap-1 text-[8px] font-black text-black/40 uppercase">
                                        <Mail size={10} className="text-nile-blue" /> {candidate.student_email}
                                    </span>
                                )}
                                <span className={`text-[7px] font-black px-2.5 py-0.5 rounded-full border ${badge}`}>
                                    {candidate.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" size="md" onClick={() => navigate('/messages')}
                            className="flex-1 md:flex-none flex items-center gap-2">
                            <MessageCircle size={14} /> MESSAGE
                        </Button>
                        {nextStatus && (
                            <Button variant="primary" size="md" onClick={() => handleAdvance(apps[0].id, nextStatus)}
                                isLoading={advancing === apps[0].id}
                                className="flex-1 md:flex-none flex items-center gap-2">
                                ADVANCE <ExternalLink size={12} />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Applications */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                    APPLICATIONS ({apps.length})
                </h3>
                {apps.map(app => {
                    const appBadge = statusBadge[app.status] || 'bg-black/5 text-black/40 border-black/10';
                    const appNext = NEXT_STATUS[app.status];
                    return (
                        <Card key={app.id} className="!p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={14} className="text-nile-blue flex-shrink-0" />
                                        <h4 className="font-black text-sm uppercase tracking-tight">{app.job_title}</h4>
                                    </div>
                                    {app.applied_at && (
                                        <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mt-1">
                                            Applied {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                                <span className={`text-[7px] font-black px-2.5 py-1 rounded-full border flex-shrink-0 ${appBadge}`}>
                                    {app.status.toUpperCase()}
                                </span>
                            </div>
                            {app.status !== 'rejected' && app.status !== 'offer' && (
                                <div className="flex gap-2 pt-2 border-t border-black/5">
                                    {appNext && (
                                        <Button variant="nile" size="sm"
                                            isLoading={advancing === app.id}
                                            onClick={() => handleAdvance(app.id, appNext)}
                                            className="text-[8px]">
                                            MOVE TO {appNext.toUpperCase()}
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm"
                                        isLoading={advancing === app.id}
                                        onClick={() => handleReject(app.id)}
                                        className="text-[8px] text-red-500 border-red-300 hover:bg-red-500 hover:text-white hover:border-red-500">
                                        REJECT
                                    </Button>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Academic info */}
            {(candidate.major || candidate.graduation_year) && (
                <Card className="!p-5 space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">ACADEMIC PROFILE</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {candidate.major && (
                            <div>
                                <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mb-0.5">Major</p>
                                <p className="font-black text-sm uppercase">{candidate.major}</p>
                            </div>
                        )}
                        {candidate.graduation_year > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mb-0.5">Graduation</p>
                                <p className="font-black text-sm uppercase">{candidate.graduation_year}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mb-0.5">Verification</p>
                            <div className="flex items-center gap-1.5">
                                {candidate.is_verified
                                    ? <><ShieldCheck size={13} className="text-nile-green" strokeWidth={2.5} /> <span className="font-black text-xs text-nile-green uppercase">Verified</span></>
                                    : <><AlertCircle size={13} className="text-black/30" /> <span className="font-black text-xs text-black/30 uppercase">Unverified</span></>
                                }
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default CandidateDetail;
