import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, MapPin, Wallet, Clock, Briefcase, Bookmark,
    ShieldCheck, Loader2, AlertCircle, Building,
    Globe, Users2, BadgeCheck, FileCheck2, Share2, ChevronRight,
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

const typeStyles: Record<string, string> = {
    'full-time': 'bg-nile-green/10 text-nile-green-700',
    'remote': 'bg-nile-blue/10 text-nile-blue',
    'hybrid': 'bg-purple-50 text-purple-600',
    'internship': 'bg-amber-50 text-amber-600',
    'part-time': 'bg-gray-100 text-gray-600',
};

const typeLabel: Record<string, string> = {
    'full-time': 'Full-time', 'remote': 'Remote', 'hybrid': 'Hybrid',
    'internship': 'Internship', 'part-time': 'Part-time',
};

const docLabel = (type: string) => DOCUMENT_TYPES.find(d => d.value === type)?.label ?? type;

function postedAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'Today';
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
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 size={32} className="animate-spin text-nile-blue/40" />
        </div>
    );

    if (error || !job) return (
        <div className="p-8 flex flex-col items-center justify-center h-[60vh] gap-4">
            <AlertCircle size={36} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">Job not found</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/student/jobs')}>
                <ArrowLeft size={14} className="mr-2" /> Back to job board
            </Button>
        </div>
    );

    const typeKey = (job.type || '').toLowerCase();
    const typeClass = typeStyles[typeKey] || 'bg-gray-100 text-gray-600';
    const typeName = typeLabel[typeKey] || job.type || 'Role';
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
            <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-24 text-left max-w-6xl mx-auto">

                {/* Back */}
                <button
                    onClick={() => navigate('/student/jobs')}
                    className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-gray-700 transition-colors group"
                >
                    <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                    Back to job board
                </button>

                {/* Header Card */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            {job.employer?.logo_url ? (
                                <img src={job.employer.logo_url} alt={companyName} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-gray-100 flex-shrink-0" />
                            ) : (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-nile-blue to-nile-blue-600 text-white flex items-center justify-center text-xl font-semibold flex-shrink-0">
                                    {initials}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <div className="flex items-center flex-wrap gap-2">
                                    <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight">{job.title}</h1>
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeClass}`}>{typeName}</span>
                                    {job.is_remote && (
                                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-nile-green/10 text-nile-green flex items-center gap-1">
                                            <Globe size={11} /> Remote
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Building size={13} className="text-gray-400" />
                                    <span>{companyName}</span>
                                    {job.employer?.is_verified && (
                                        <BadgeCheck size={14} className="text-nile-blue" />
                                    )}
                                </div>
                                <div className="flex items-center gap-4 pt-0.5 flex-wrap text-xs text-gray-400">
                                    {job.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} className="text-gray-400" /> {job.location}
                                        </span>
                                    )}
                                    {job.salary && (
                                        <span className="flex items-center gap-1">
                                            <Wallet size={12} className="text-gray-400" /> {job.salary}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} /> {postedAgo(job.posted_at)}
                                    </span>
                                    <span>
                                        {job.applicant_count} applicant{job.applicant_count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={handleSave}
                                className={`p-3 rounded-xl transition-all ${isSaved ? 'bg-nile-green/10 text-nile-green' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                            >
                                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-3 rounded-xl transition-all bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                title="Share to feed"
                            >
                                <Share2 size={16} />
                            </button>
                            <Button
                                variant="primary"
                                size="md"
                                className="flex-1 md:flex-none"
                                onClick={() => setShowApplyModal(true)}
                            >
                                Apply now
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Main */}
                    <div className="xl:col-span-2 space-y-6">
                        {job.description && (
                            <Card title="Role description">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {job.description}
                                </p>
                            </Card>
                        )}

                        {requirements.length > 0 && (
                            <Card title="Key requirements">
                                <ul className="space-y-3">
                                    {requirements.map((req, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <ShieldCheck size={16} className="text-nile-green flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700 leading-snug">{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        {(job.required_docs?.length > 0 || job.optional_docs?.length > 0) && (
                            <Card title="Application documents">
                                <div className="space-y-3">
                                    {job.required_docs?.map(type => (
                                        <div key={type} className="flex items-center gap-3">
                                            <FileCheck2 size={15} className="text-nile-blue flex-shrink-0" />
                                            <span className="text-sm text-gray-800">{docLabel(type)}</span>
                                            <span className="text-xs font-medium text-red-500 ml-auto">Required</span>
                                        </div>
                                    ))}
                                    {job.optional_docs?.map(type => (
                                        <div key={type} className="flex items-center gap-3">
                                            <FileCheck2 size={15} className="text-gray-300 flex-shrink-0" />
                                            <span className="text-sm text-gray-600">{docLabel(type)}</span>
                                            <span className="text-xs font-medium text-gray-400 ml-auto">Optional</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {job.employer?.about && (
                            <Card title={`About ${companyName}`}>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {job.employer.about}
                                </p>
                                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
                                    {job.employer.industry && (
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Briefcase size={13} /> {job.employer.industry}
                                        </span>
                                    )}
                                    {job.employer.company_size && (
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Users2 size={13} /> {job.employer.company_size}
                                        </span>
                                    )}
                                    {job.employer.headquarters && (
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <MapPin size={13} /> {job.employer.headquarters}
                                        </span>
                                    )}
                                    {job.employer.website && (
                                        <a href={job.employer.website} target="_blank" rel="noreferrer" className="text-xs text-nile-blue font-medium flex items-center gap-1 hover:underline">
                                            <Globe size={13} /> Website
                                        </a>
                                    )}
                                </div>
                            </Card>
                        )}

                        {job.other_open_positions?.length > 0 && (
                            <Card title={`Other open roles at ${companyName}`}>
                                <div className="space-y-2">
                                    {job.other_open_positions.map(pos => (
                                        <Link
                                            key={pos.id}
                                            to={`/student/jobs/${pos.id}`}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{pos.title}</p>
                                                <p className="text-xs text-gray-400">{pos.location}{pos.is_remote ? ' · Remote' : ''}</p>
                                            </div>
                                            <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card title="Job details">
                            <div className="space-y-5">
                                {job.location && (
                                    <DetailItem icon={<MapPin size={16} />} label="Location" value={job.location} color="text-nile-blue" />
                                )}
                                {job.salary && (
                                    <DetailItem icon={<Wallet size={16} />} label="Salary" value={job.salary} color="text-nile-green" />
                                )}
                                <DetailItem icon={<Briefcase size={16} />} label="Type" value={typeName} color="text-nile-blue" />
                                {job.employment_category && (
                                    <DetailItem icon={<FileCheck2 size={16} />} label="Category" value={job.employment_category.replace(/[-_]/g, ' ')} color="text-nile-blue" />
                                )}
                            </div>

                            {skills.length > 0 && (
                                <div className="mt-6 pt-5 border-t border-gray-50">
                                    <p className="text-xs font-medium text-gray-400 mb-3">Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map(tag => (
                                            <span key={tag} className="text-xs font-medium text-gray-700 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        <div className="bg-nile-blue text-white rounded-2xl p-5">
                            <p className="text-xs text-white/60 mb-3">Ready to apply?</p>
                            <Button
                                fullWidth
                                size="md"
                                onClick={() => setShowApplyModal(true)}
                                className="!bg-white !text-nile-blue hover:!bg-gray-50"
                            >
                                Submit application
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
    <div className="flex items-start gap-3">
        <div className={`w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center ${color} flex-shrink-0`}>
            {icon}
        </div>
        <div className="text-left min-w-0">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-900 capitalize truncate">{value}</p>
        </div>
    </div>
);

export default JobDetail;
