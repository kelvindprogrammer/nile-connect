import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    ArrowLeft, MapPin, DollarSign, Clock, Briefcase, Bookmark,
    ExternalLink, ShieldCheck, Loader2, AlertCircle, Building,
    FileText, Upload, X,
} from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { apiClient, getErrorMessage } from '../../services/api';
import { uploadFile } from '../../services/messageService';

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
    'hybrid':     'bg-nile-white text-black border border-gray-100',
    'internship': 'bg-black text-white',
    'part-time':  'bg-yellow-100 text-yellow-700 border border-gray-100',
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
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [uploadingCv, setUploadingCv] = useState(false);
    const cvInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            if (!id) { setError(true); setIsLoading(false); return; }
            apiClient
                .get<ApiEnvelope<{ job: JobDetail }>>(`/api/jobs/${id}`)
                .then(({ data }) => {
                    if (data.data?.job) setJob(data.data.job);
                    else setError(true);
                })
                .catch(() => setError(true))
                .finally(() => setIsLoading(false));
        }, 0);
        return () => clearTimeout(t);
    }, [id]);

    // Pre-fill the CV from the student's profile, if they've uploaded one.
    useEffect(() => {
        apiClient
            .get<ApiEnvelope<{ resume_url?: string }>>('/api/student/profile')
            .then(({ data }) => setResumeUrl(data.data?.resume_url || ''))
            .catch(() => {});
    }, []);

    const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            showToast('CV must be a PDF file', 'error');
            if (cvInputRef.current) cvInputRef.current.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('CV must be under 10MB', 'error');
            if (cvInputRef.current) cvInputRef.current.value = '';
            return;
        }
        setUploadingCv(true);
        try {
            const { url } = await uploadFile(file);
            setResumeUrl(url);
            showToast('CV attached', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'CV upload failed', 'error');
        } finally {
            setUploadingCv(false);
            if (cvInputRef.current) cvInputRef.current.value = '';
        }
    };

    const handleSubmitApplication = async () => {
        if (!id) return;
        if (!resumeUrl) {
            showToast('Please attach your CV before applying', 'error');
            return;
        }
        setApplying(true);
        try {
            await apiClient.post('/api/jobs', { job_id: id, cover_letter: coverLetter, resume_url: resumeUrl });
            showToast('Application submitted!', 'success');
            setShowApplyModal(false);
            navigate('/student/applications');
        } catch (err) {
            showToast(getErrorMessage(err, 'Failed to apply. Please try again.'), 'error');
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
                <p className="text-[10px] font-semibold text-black/40">Job not found</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/student/jobs')}>
                    <ArrowLeft size={14} className="mr-2" /> BACK TO JOB BOARD
                </Button>
            </div>
        </DashboardLayout>
    );

    const typeKey = (job.type || '').toLowerCase();
    const typeClass = typeColors[typeKey] || 'bg-nile-white text-black border border-gray-100';
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
                    onClick={() => navigate('/student/jobs')}
                    className="flex items-center gap-2 text-black/40 font-semibold text-[9px] hover:text-black transition-colors group"
                >
                    <ArrowLeft size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                    BACK TO JOB BOARD
                </button>

                {/* Header Card */}
                <div className="bg-white border border-gray-100 rounded-[24px] shadow-green p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] bg-nile-blue text-white flex items-center justify-center text-xl md:text-2xl font-semibold border border-gray-100 shadow-green flex-shrink-0">
                                {initials}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-semibold text-black leading-none">{job.title}</h1>
                                    <span className={`text-[7px] font-semibold px-2 py-0.5 rounded-full border border-gray-100 ${typeClass}`}>
                                        {job.type?.toUpperCase() || 'ROLE'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Building size={12} strokeWidth={2.5} className="text-nile-blue/50" />
                                    <p className="text-[10px] font-bold text-nile-blue/50">{job.company_name}</p>
                                </div>
                                <div className="flex items-center gap-4 pt-1 flex-wrap">
                                    {job.location && (
                                        <span className="text-[8px] font-semibold text-black/40 flex items-center gap-1">
                                            <MapPin size={10} strokeWidth={3} className="text-nile-blue" /> {job.location}
                                        </span>
                                    )}
                                    {job.salary && (
                                        <span className="text-[8px] font-semibold text-black/40 flex items-center gap-1">
                                            <DollarSign size={10} strokeWidth={3} className="text-nile-green" /> {job.salary}
                                        </span>
                                    )}
                                    <span className="text-[8px] font-semibold text-black/30 flex items-center gap-1">
                                        <Clock size={10} strokeWidth={3} /> {postedAgo(job.posted_at)}
                                    </span>
                                    <span className="text-[8px] font-semibold text-black/30">
                                        {job.applicant_count} applicant{job.applicant_count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={handleSave}
                                className={`p-3 border border-gray-100 rounded-xl transition-all ${isSaved ? 'bg-nile-green text-black' : 'bg-white hover:bg-black/5'}`}
                            >
                                <Bookmark size={16} strokeWidth={3} fill={isSaved ? 'currentColor' : 'none'} />
                            </button>
                            <Button
                                variant="primary"
                                size="md"
                                className="flex-1 md:flex-none"
                                onClick={() => setShowApplyModal(true)}
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
                                            <span className="font-bold text-nile-blue/70 text-[10px] leading-snug">{req}</span>
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
                                <div className="mt-6 pt-5 border-t border-gray-100/5">
                                    <p className="text-[9px] font-semibold text-black/30 mb-3">SKILLS</p>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map(tag => (
                                            <span key={tag} className="text-[8px] font-semibold text-black px-2.5 py-1 bg-nile-white border border-gray-100 rounded-lg hover:bg-black hover:text-white transition-colors cursor-pointer">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        <div className="bg-nile-blue text-white border border-gray-100 rounded-[20px] p-5 shadow-card">
                            <p className="text-[8px] font-semibold text-white/50 mb-3">READY TO APPLY?</p>
                            <Button
                                fullWidth
                                size="md"
                                onClick={() => setShowApplyModal(true)}
                                className="!bg-white !text-black hover:!bg-nile-green border border-gray-100"
                            >
                                SUBMIT APPLICATION
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !applying && setShowApplyModal(false)}>
                    <div className="bg-white border border-gray-100 rounded-[28px] shadow-card max-w-lg w-full p-6 md:p-8 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold truncate pr-4">Apply — {job.title}</h3>
                            <button onClick={() => setShowApplyModal(false)} className="p-1.5 border border-gray-100/10 rounded-lg hover:bg-black/5 flex-shrink-0">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>

                        {/* CV */}
                        <div className="space-y-2">
                            <p className="text-[9px] font-semibold text-black/40">YOUR CV (PDF)</p>
                            {resumeUrl ? (
                                <div className="flex items-center justify-between gap-3 p-3 bg-nile-white rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText size={16} className="text-nile-blue flex-shrink-0" />
                                        <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-[10px] font-semibold underline truncate">
                                            View attached CV
                                        </a>
                                    </div>
                                    <button type="button" onClick={() => cvInputRef.current?.click()} className="text-[9px] font-semibold text-nile-blue hover:underline flex-shrink-0 flex items-center gap-1">
                                        {uploadingCv ? <Loader2 size={12} className="animate-spin" /> : 'CHANGE'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => cvInputRef.current?.click()}
                                    disabled={uploadingCv}
                                    className="w-full p-4 border-[2px] border-dashed border-black/20 rounded-xl text-[10px] font-semibold text-black/40 hover:border-nile-blue hover:text-nile-blue transition-all flex items-center justify-center gap-2"
                                >
                                    {uploadingCv ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    UPLOAD CV (PDF)
                                </button>
                            )}
                            <input ref={cvInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCvUpload} />
                        </div>

                        {/* Cover letter */}
                        <div className="space-y-2">
                            <p className="text-[9px] font-semibold text-black/40">COVER LETTER (OPTIONAL)</p>
                            <textarea
                                className="w-full h-32 bg-nile-white/40 border border-gray-100 rounded-2xl p-4 font-bold text-xs outline-none focus:bg-white focus:shadow-blue transition-all resize-none"
                                placeholder="Tell the employer why you're a great fit for this role..."
                                value={coverLetter}
                                onChange={e => setCoverLetter(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button fullWidth variant="outline" onClick={() => setShowApplyModal(false)} disabled={applying}>CANCEL</Button>
                            <Button fullWidth onClick={handleSubmitApplication} isLoading={applying}>
                                SUBMIT APPLICATION
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

const DetailItem = ({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string; color: string;
}) => (
    <div className="flex items-start gap-4">
        <div className={`w-9 h-9 bg-nile-white rounded-xl border border-gray-100 flex items-center justify-center ${color} shadow-sm flex-shrink-0`}>
            {icon}
        </div>
        <div className="text-left min-w-0">
            <p className="text-[8px] font-semibold text-black/30">{label}</p>
            <p className="text-[10px] font-semibold text-black tracking-tight truncate">{value}</p>
        </div>
    </div>
);

export default JobDetail;
