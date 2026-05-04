import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    ArrowLeft, MapPin, DollarSign, Clock, Briefcase, Bookmark,
    ExternalLink, ShieldCheck, Loader2, AlertCircle, Building,
} from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/api';

interface JobDetail {
    id: string;
    title: string;
    company_name: string;
    location: string;
    type: string;
    salary: string;
    skills: string;
    description: string;
    requirements: string;
    applicant_count: number;
    posted_at: string;
    status: string;
}

interface ApiEnvelope<T> { data: T; }

const typeColors: Record<string, string> = {
    'full-time':  'bg-nile-green text-black',
    'remote':     'bg-nile-blue text-white',
    'hybrid':     'bg-nile-white text-black border-[1.5px] border-black',
    'internship': 'bg-black text-white',
    'part-time':  'bg-yellow-100 text-yellow-700 border-[1.5px] border-black',
};

function postedAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

const JobDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [job, setJob] = useState<JobDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!id) { setError(true); setIsLoading(false); return; }
        apiClient
            .get<ApiEnvelope<{ job: JobDetail }>>(`/api/jobs/${id}`)
            .then(({ data }) => {
                if (data.data?.job) setJob(data.data.job);
                else setError(true);
            })
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleApply = async () => {
        if (!id) return;
        setApplying(true);
        try {
            await apiClient.post('/api/jobs', { job_id: id });
            showToast('Application submitted!', 'success');
            navigate('/applications');
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to apply. Please try again.';
            showToast(msg, 'error');
        } finally {
            setApplying(false);
        }
    };

    const handleSave = () => {
        setIsSaved(v => !v);
        showToast(isSaved ? 'Job removed from bookmarks' : 'Job saved to bookmarks!', 'success');
    };

    if (isLoading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 size={32} className="animate-spin text-nile-blue/40" />
            </div>
        </DashboardLayout>
    );

    if (error || !job) return (
        <DashboardLayout>
            <div className="p-8 flex flex-col items-center justify-center h-[60vh] gap-4">
                <AlertCircle size={40} className="text-red-400" />
                <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Job not found</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
                    <ArrowLeft size={14} className="mr-2" /> BACK TO JOB BOARD
                </Button>
            </div>
        </DashboardLayout>
    );

    const typeKey = (job.type || '').toLowerCase();
    const typeClass = typeColors[typeKey] || 'bg-nile-white text-black border-[1.5px] border-black';
    const skills = job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const requirements = job.requirements
        ? job.requirements.split('\n').map(s => s.trim()).filter(Boolean)
        : [];
    const initials = job.company_name
        ? job.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 anime-fade-in font-sans pb-24 text-left">

                {/* Back */}
                <button
                    onClick={() => navigate('/jobs')}
                    className="flex items-center gap-2 text-black/40 font-black uppercase tracking-widest text-[9px] hover:text-black transition-colors group"
                >
                    <ArrowLeft size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                    BACK TO JOB BOARD
                </button>

                {/* Header Card */}
                <div className="bg-white border-[2px] border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(108,187,86,1)] p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] bg-nile-blue text-white flex items-center justify-center text-xl md:text-2xl font-black border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] flex-shrink-0">
                                {initials}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-black text-black uppercase leading-none tracking-tighter">{job.title}</h1>
                                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border-[1.5px] border-black ${typeClass}`}>
                                        {job.type?.toUpperCase() || 'ROLE'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Building size={12} strokeWidth={2.5} className="text-nile-blue/50" />
                                    <p className="text-[10px] font-bold text-nile-blue/50 uppercase tracking-widest">{job.company_name}</p>
                                </div>
                                <div className="flex items-center gap-4 pt-1 flex-wrap">
                                    {job.location && (
                                        <span className="text-[8px] font-black text-black/40 uppercase flex items-center gap-1">
                                            <MapPin size={10} strokeWidth={3} className="text-nile-blue" /> {job.location}
                                        </span>
                                    )}
                                    {job.salary && (
                                        <span className="text-[8px] font-black text-black/40 uppercase flex items-center gap-1">
                                            <DollarSign size={10} strokeWidth={3} className="text-nile-green" /> {job.salary}
                                        </span>
                                    )}
                                    <span className="text-[8px] font-black text-black/30 uppercase flex items-center gap-1">
                                        <Clock size={10} strokeWidth={3} /> {postedAgo(job.posted_at)}
                                    </span>
                                    <span className="text-[8px] font-black text-black/30 uppercase">
                                        {job.applicant_count} applicant{job.applicant_count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={handleSave}
                                className={`p-3 border-[2px] border-black rounded-xl transition-all ${isSaved ? 'bg-nile-green text-black' : 'bg-white hover:bg-black/5'}`}
                            >
                                <Bookmark size={16} strokeWidth={3} fill={isSaved ? 'currentColor' : 'none'} />
                            </button>
                            <Button
                                variant="primary"
                                size="md"
                                className="flex-1 md:flex-none"
                                onClick={handleApply}
                                isLoading={applying}
                            >
                                APPLY NOW <ExternalLink size={14} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                    {/* Main */}
                    <div className="xl:col-span-2 space-y-6">
                        {job.description && (
                            <Card title="ROLE DESCRIPTION">
                                <p className="font-bold text-nile-blue/80 leading-relaxed text-[11px] whitespace-pre-line">
                                    {job.description}
                                </p>
                            </Card>
                        )}

                        {requirements.length > 0 && (
                            <Card title="KEY REQUIREMENTS">
                                <ul className="space-y-3">
                                    {requirements.map((req, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <ShieldCheck size={14} className="text-nile-green flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <span className="font-bold text-nile-blue/70 text-[10px] uppercase leading-snug">{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card title="JOB DETAILS">
                            <div className="space-y-5">
                                {job.location && (
                                    <DetailItem icon={<MapPin size={16} />} label="LOCATION" value={job.location} color="text-nile-blue" />
                                )}
                                {job.salary && (
                                    <DetailItem icon={<DollarSign size={16} />} label="SALARY" value={job.salary} color="text-nile-green" />
                                )}
                                <DetailItem icon={<Briefcase size={16} />} label="TYPE" value={job.type?.toUpperCase() || 'N/A'} color="text-nile-blue" />
                            </div>

                            {skills.length > 0 && (
                                <div className="mt-6 pt-5 border-t-[2px] border-black/5">
                                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-3">SKILLS</p>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map(tag => (
                                            <span key={tag} className="text-[8px] font-black text-black uppercase px-2.5 py-1 bg-nile-white border-[2px] border-black rounded-lg hover:bg-black hover:text-white transition-colors cursor-pointer">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        <div className="bg-nile-blue text-white border-[2px] border-black rounded-[20px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-3">READY TO APPLY?</p>
                            <Button
                                fullWidth
                                size="md"
                                onClick={handleApply}
                                isLoading={applying}
                                className="!bg-white !text-black hover:!bg-nile-green border-[2px] border-black"
                            >
                                SUBMIT APPLICATION
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const DetailItem = ({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string; color: string;
}) => (
    <div className="flex items-start gap-4">
        <div className={`w-9 h-9 bg-nile-white rounded-xl border-[2px] border-black flex items-center justify-center ${color} shadow-sm flex-shrink-0`}>
            {icon}
        </div>
        <div className="text-left min-w-0">
            <p className="text-[8px] font-black text-black/30 uppercase tracking-[0.2em]">{label}</p>
            <p className="text-[10px] font-black text-black uppercase tracking-tight truncate">{value}</p>
        </div>
    </div>
);

export default JobDetail;
