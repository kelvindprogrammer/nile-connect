import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Search, MapPin, DollarSign, SlidersHorizontal, Bookmark, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import QuickApplyModal from '../../components/QuickApplyModal';
import Button from '../../components/Button';
import { apiClient } from '../../services/api';

interface Job {
    id: string;
    title: string;
    company_name: string;
    location: string;
    type: string;
    salary: string;
    skills: string;
    description: string;
    applicant_count: number;
    posted_at: string;
}

interface ApiEnvelope<T> { data: T; }

const typeColors: Record<string, string> = {
    'full-time':  'bg-nile-green text-black',
    'remote':     'bg-nile-blue text-white',
    'hybrid':     'bg-nile-white text-black border-[1.5px] border-black',
    'internship': 'bg-black text-white',
    'part-time':  'bg-yellow-100 text-yellow-700 border-[1.5px] border-black',
};

const typeLabel: Record<string, string> = {
    'full-time': 'FULL-TIME', 'remote': 'REMOTE', 'hybrid': 'HYBRID',
    'internship': 'INTERNSHIP', 'part-time': 'PART-TIME',
};

const JobBoard = () => {
    const [search, setSearch] = useState('');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isApplyModalOpen, setApplyModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<{ jobs: Job[] }>>('/api/jobs', { params: search ? { q: search } : {} })
            .then(({ data }) => setJobs(data.data.jobs ?? []))
            .catch(() => setJobs([]))
            .finally(() => setIsLoading(false));
    }, [search]);

    const handleQuickApply = (job: Job) => {
        setSelectedJob(job);
        setApplyModalOpen(true);
    };

    const filtered = jobs.filter(j =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 md:space-y-10 anime-fade-in font-sans pb-20 text-left h-full">
                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 md:gap-6 border-b-[2px] border-black pb-6 md:pb-8">
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">Job Board .</h2>
                        <p className="text-[8px] md:text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">BROWSE ACTIVE CAREER OPPORTUNITIES</p>
                    </div>

                    <div className="flex items-center space-x-3 w-full xl:w-auto">
                        <div className="relative group flex-1 xl:w-64">
                            <Search size={14} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH ROLES..."
                                className="w-full bg-nile-white/40 border-[2px] border-black rounded-xl py-2.5 md:py-3 pl-10 md:pl-11 pr-4 font-black text-[9px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                            <SlidersHorizontal size={14} className="mr-2" /> FILTER
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[24px]">
                        <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">NO JOBS FOUND</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                        {filtered.map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onNavigate={() => navigate(`/student/jobs/${job.id}`)}
                                onApply={() => handleQuickApply(job)}
                            />
                        ))}
                    </div>
                )}

                {selectedJob && (
                    <QuickApplyModal
                        isOpen={isApplyModalOpen}
                        onClose={() => setApplyModalOpen(false)}
                        jobTitle={selectedJob.title}
                        company={selectedJob.company_name}
                        jobId={selectedJob.id}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

const JobCard = ({ job, onNavigate, onApply }: { job: Job; onNavigate: () => void; onApply: () => void }) => {
    const { showToast } = useToast();
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        setIsSaved(!isSaved);
        showToast(isSaved ? 'Job archived' : 'Job bookmarked', 'success');
    };

    const initials = job.company_name
        ? job.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const tags = job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3) : [];
    const jobTypeKey = (job.type || '').toLowerCase();
    const typeClass = typeColors[jobTypeKey] || 'bg-nile-white text-black border-[1.5px] border-black';
    const typeName = typeLabel[jobTypeKey] || job.type?.toUpperCase() || 'ROLE';

    return (
        <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all group flex flex-col text-left">
            <div className="flex justify-between items-start mb-4 md:mb-6">
                <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-nile-blue text-white flex items-center justify-center text-xs md:text-sm font-black border-[2px] border-black shadow-[2px_2px_0px_0px_#6CBB56] flex-shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-black text-black uppercase leading-none tracking-tighter truncate">{job.title}</h3>
                        <p className="text-[9px] md:text-[10px] font-bold text-nile-blue/50 uppercase mt-1 tracking-widest leading-none truncate">{job.company_name}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className={`p-2 border-[2px] border-black rounded-lg transition-all flex-shrink-0 ${isSaved ? 'bg-nile-green text-black' : 'bg-white hover:bg-black/5'}`}
                >
                    <Bookmark size={14} strokeWidth={3} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 md:mb-6">
                {job.location && (
                    <div className="flex items-center space-x-1.5 text-[8px] md:text-[9px] font-black text-black/60 uppercase">
                        <MapPin size={10} strokeWidth={3} className="text-nile-blue" />
                        <span>{job.location}</span>
                    </div>
                )}
                {job.salary && (
                    <div className="flex items-center space-x-1.5 text-[8px] md:text-[9px] font-black text-black/60 uppercase">
                        <DollarSign size={10} strokeWidth={3} className="text-nile-green" />
                        <span>{job.salary}</span>
                    </div>
                )}
                <span className={`text-[6px] md:text-[7px] font-black px-2 py-0.5 rounded-full border-[1.5px] border-black ${typeClass}`}>{typeName}</span>
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-6 md:mb-8">
                    {tags.map(tag => (
                        <span key={tag} className="text-[6px] md:text-[7px] font-black uppercase px-2 py-1 bg-nile-white border border-black/10 rounded-md tracking-tighter">{tag}</span>
                    ))}
                </div>
            )}

            <div className="flex space-x-2 md:space-x-3 mt-auto">
                <Button fullWidth size="sm" onClick={onApply}>QUICK APPLY</Button>
                <Button variant="outline" size="sm" onClick={onNavigate}>VIEW</Button>
            </div>
        </div>
    );
};

export default JobBoard;
