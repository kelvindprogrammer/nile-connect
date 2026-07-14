import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, MapPin, DollarSign, Clock, Briefcase, Bookmark,
    ExternalLink, ShieldCheck, Loader2, AlertCircle, Building,
    Globe, Users2, BadgeCheck, FileCheck2, Share2,
} from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import QuickApplyModal from '../../components/QuickApplyModal';
import PostBar from '../../components/PostBar';
import { useToast } from '../../context/ToastContext';
import { getJobDetail } from '../../services/jobService';
import type { JobDetail as JobDetailType } from '../../types/job';
import { DOCUMENT_TYPES } from '../../types/application';

const typeColors: Record<string, string> = {
    'full-time':  'bg-nile-green text-black',
    'remote':     'bg-nile-blue text-white',
    'hybrid':     'bg-nile-white text-black border border-gray-100',
    'internship': 'bg-black text-white',
    'part-time':  'bg-yellow-100 text-yellow-700 border border-gray-100',
};

const docLabel = (type: string) => DOCUMENT_TYPES.find(d => d.value === type)?.label ?? type;

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
    const [job, setJob] = useState<JobDetailType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            if (!id) { setError(true); setIsLoading(false); return; }
            getJobDetail(id)
                .then(data => setJob(data))
                .catch(() => setError(true))
                .finally(() => setIsLoading(false));
        }, 0);
        return () => clearTimeout(t);
    }, [id]);

    const handleSave = () => {
        setIsSaved(v => !v);
        showToast(isSaved ? 'Job removed from bookmarks' : 'Job saved to bookmarks!', 'success');
    };

    if (isLoading) return (
        <>
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 size={32} className="animate-spin text-nile-blue/40" />
            </div>
        </>
    );

    if (error || !job) return (
        <>
            <div className="p-8 flex flex-col items-center justify-center h-[60vh] gap-4">
                <AlertCircle size={40} className="text-red-400" />
                <p className="text-[10px] font-semibold text-black/40">Job not found</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/student/jobs')}>
                    <ArrowLeft size={14} className="mr-2" /> BACK TO JOB BOARD
                </Button>
            </div>
        </>
    );

    const typeKey = (job.type || '').toLowerCase();
    const typeClass = typeColors[typeKey] || 'bg-nile-white text-black border border-gray-100';
    const skills = job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const requirements = job.requirements
        ? job.requirements.split('\n').map(s => s.trim()).filter(Boolean)
        : [];
    const companyName = job.employer?.company_name || '';
    const initials = companyName
        ? companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <>
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
                            {job.employer?.logo_url ? (
                                <img src={job.employer.logo_url} alt={companyName} className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] object-cover border border-gray-100 shadow-green flex-shrink-0" />
                            ) : (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] bg-nile-blue text-white flex items-center justify-center text-xl md:text-2xl font-semibold border border-gray-100 shadow-green flex-shrink-0">
                                    {initials}
                                </div>
                            )}
                            <div className="space-y-1">
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-semibold text-black leading-none">{job.title}</h1>
                                    <span className={`text-[7px] font-semibold px-2 py-0.5 rounded-full border border-gray-100 ${typeClass}`}>
                                        {job.type?.toUpperCase() || 'ROLE'}
                                    </span>
                                    {job.is_remote && (
                                        <span className="text-[7px] font-semibold px-2 py-0.5 rounded-full border border-gray-100 bg-nile-green/10 text-nile-green flex items-center gap-1">
                                            <Globe size={9} /> REMOTE
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Building size={12} strokeWidth={2.5} className="text-nile-blue/50" />
                                    <p className="text-[10px] font-bold text-nile-blue/50">{companyName}</p>
                                    {job.employer?.is_verified && (
                                        <BadgeCheck size={12} className="text-nile-blue" />
                                    )}
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
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-3 border border-gray-100 rounded-xl transition-all bg-white hover:bg-black/5"
                                title="Share to feed"
                            >
                                <Share2 size={16} strokeWidth={3} />
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

                        {(job.required_docs?.length > 0 || job.optional_docs?.length > 0) && (
                            <Card title="APPLICATION DOCUMENTS">
                                <div className="space-y-3">
                                    {job.required_docs?.map(type => (
                                        <div key={type} className="flex items-center gap-3">
                                            <FileCheck2 size={14} className="text-nile-blue flex-shrink-0" strokeWidth={2.5} />
                                            <span className="font-bold text-black text-[10px]">{docLabel(type)}</span>
                                            <span className="text-[8px] font-semibold text-red-500">REQUIRED</span>
                                        </div>
                                    ))}
                                    {job.optional_docs?.map(type => (
                                        <div key={type} className="flex items-center gap-3">
                                            <FileCheck2 size={14} className="text-black/30 flex-shrink-0" strokeWidth={2.5} />
                                            <span className="font-bold text-nile-blue/70 text-[10px]">{docLabel(type)}</span>
                                            <span className="text-[8px] font-semibold text-black/30">OPTIONAL</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {job.employer?.about && (
                            <Card title={`ABOUT ${companyName.toUpperCase()}`}>
                                <p className="font-bold text-nile-blue/80 leading-relaxed text-[11px] whitespace-pre-line">
                                    {job.employer.about}
                                </p>
                                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100/10">
                                    {job.employer.industry && (
                                        <span className="text-[9px] font-semibold text-black/40 flex items-center gap-1">
                                            <Briefcase size={11} /> {job.employer.industry}
                                        </span>
                                    )}
                                    {job.employer.company_size && (
                                        <span className="text-[9px] font-semibold text-black/40 flex items-center gap-1">
                                            <Users2 size={11} /> {job.employer.company_size}
                                        </span>
                                    )}
                                    {job.employer.headquarters && (
                                        <span className="text-[9px] font-semibold text-black/40 flex items-center gap-1">
                                            <MapPin size={11} /> {job.employer.headquarters}
                                        </span>
                                    )}
                                    {job.employer.website && (
                                        <a href={job.employer.website} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-nile-blue flex items-center gap-1 hover:underline">
                                            <Globe size={11} /> WEBSITE
                                        </a>
                                    )}
                                </div>
                            </Card>
                        )}

                        {job.other_open_positions?.length > 0 && (
                            <Card title={`OTHER OPEN ROLES AT ${companyName.toUpperCase()}`}>
                                <div className="space-y-3">
                                    {job.other_open_positions.map(pos => (
                                        <Link
                                            key={pos.id}
                                            to={`/student/jobs/${pos.id}`}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:shadow-card hover:bg-nile-white/40 transition-all"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[11px] text-black truncate">{pos.title}</p>
                                                <p className="text-[8px] font-semibold text-black/30">{pos.location}{pos.is_remote ? ' · Remote' : ''}</p>
                                            </div>
                                            <ExternalLink size={12} className="text-black/30 flex-shrink-0" />
                                        </Link>
                                    ))}
                                </div>
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
                                {job.employment_category && (
                                    <DetailItem icon={<FileCheck2 size={16} />} label="CATEGORY" value={job.employment_category.replace(/[-_]/g, ' ').toUpperCase()} color="text-nile-blue" />
                                )}
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

            <QuickApplyModal
                isOpen={showApplyModal}
                onClose={() => setShowApplyModal(false)}
                jobTitle={job.title}
                company={companyName}
                jobId={job.id}
            />

            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share to feed">
                <PostBar
                    prefillJobId={job.id}
                    prefillContent={`Check out this opportunity: ${job.title} at ${companyName}`}
                    onPostCreated={() => { setShowShareModal(false); showToast('Shared to feed!', 'success'); }}
                />
            </Modal>
        </>
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
