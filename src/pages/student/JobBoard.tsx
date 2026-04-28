import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Search, MapPin, DollarSign, SlidersHorizontal, Bookmark,
    Loader2, ChevronDown, X, Check,
} from 'lucide-react';
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
    'full-time': 'bg-nile-green text-black',
    'remote': 'bg-nile-blue text-white',
    'hybrid': 'bg-nile-white text-black border-[1.5px] border-black',
    'internship': 'bg-black text-white',
    'part-time': 'bg-yellow-100 text-yellow-700 border-[1.5px] border-black',
};

const typeLabel: Record<string, string> = {
    'full-time': 'FULL-TIME', 'remote': 'REMOTE', 'hybrid': 'HYBRID',
    'internship': 'INTERNSHIP', 'part-time': 'PART-TIME',
};

const JOB_TYPES = ['ALL', 'FULL-TIME', 'REMOTE', 'HYBRID', 'INTERNSHIP', 'PART-TIME'];
const LOCATIONS = ['ALL', 'ABUJA', 'LAGOS', 'KANO', 'REMOTE', 'INTERNATIONAL'];

const JobBoard = () => {
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isApplyModalOpen, setApplyModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [locationFilter, setLocationFilter] = useState('ALL');
    const filterRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<{ jobs: Job[] }>>('/jobs', { params: search ? { q: search } : {} })
            .then(({ data }) => setJobs(data.data.jobs ?? []))
            .catch(() => setJobs([]))
            .finally(() => setIsLoading(false));
    }, [search]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const clearFilters = () => { setTypeFilter('ALL'); setLocationFilter('ALL'); };
    const hasFilters = typeFilter !== 'ALL' || locationFilter !== 'ALL';

    const filtered = jobs.filter(j => {
        const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.company_name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'ALL' || (j.type || '').toLowerCase() === typeFilter.toLowerCase();
        const matchesLocation = locationFilter === 'ALL' || (j.location || '').toLowerCase().includes(locationFilter.toLowerCase());
        return matchesSearch && matchesType && matchesLocation;
    });

    const handleQuickApply = (job: Job) => { setSelectedJob(job); setApplyModalOpen(true); };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-24 text-left">

                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b-[2px] border-black pb-6">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">Job Board .</h2>
                        <p className="text-[8px] md:text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em] mt-1">BROWSE ACTIVE CAREER OPPORTUNITIES</p>
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        {/* Search */}
                        <div className="relative group flex-1 xl:w-64">
                            <Search size={13} strokeWidth={3} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH ROLES..."
                                className="w-full bg-nile-white/40 border-[2px] border-black rounded-xl py-2.5 pl-10 pr-4 font-black text-[9px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all"
                            />
                        </div>

                        {/* Filter Button */}
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setShowFilters(v => !v)}
                                className={`flex items-center gap-2 px-4 py-2.5 border-[2px] border-black rounded-xl font-black text-[9px] uppercase transition-all
                                    ${showFilters || hasFilters
                                        ? 'bg-nile-blue text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]'
                                        : 'bg-white hover:bg-nile-white'}`}
                            >
                                <SlidersHorizontal size={13} strokeWidth={3} />
                                FILTER
                                {hasFilters && (
                                    <span className="w-4 h-4 bg-nile-green text-black rounded-full text-[7px] flex items-center justify-center font-black">
                                        {(typeFilter !== 'ALL' ? 1 : 0) + (locationFilter !== 'ALL' ? 1 : 0)}
                                    </span>
                                )}
                                <ChevronDown size={12} strokeWidth={3} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>

                            {showFilters && (
                                <div className="absolute top-full right-0 mt-2 w-72 bg-white border-[2px] border-black rounded-[20px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 z-50 space-y-5 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest">FILTERS</span>
                                        {hasFilters && (
                                            <button onClick={clearFilters} className="text-[8px] font-black text-red-400 uppercase hover:text-red-600 transition-colors flex items-center gap-1">
                                                <X size={10} strokeWidth={3} /> CLEAR ALL
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[8px] font-black text-black/40 uppercase tracking-widest">JOB TYPE</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {JOB_TYPES.map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTypeFilter(t)}
                                                    className={`flex items-center justify-between px-3 py-2 border-[1.5px] border-black rounded-lg font-black text-[8px] uppercase transition-all
                                                        ${typeFilter === t ? 'bg-nile-blue text-white' : 'bg-nile-white hover:bg-white'}`}
                                                >
                                                    {t}
                                                    {typeFilter === t && <Check size={9} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[8px] font-black text-black/40 uppercase tracking-widest">LOCATION</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {LOCATIONS.map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => setLocationFilter(l)}
                                                    className={`flex items-center justify-between px-3 py-2 border-[1.5px] border-black rounded-lg font-black text-[8px] uppercase transition-all
                                                        ${locationFilter === l ? 'bg-nile-blue text-white' : 'bg-nile-white hover:bg-white'}`}
                                                >
                                                    {l}
                                                    {locationFilter === l && <Check size={9} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button fullWidth size="sm" onClick={() => setShowFilters(false)}>
                                        APPLY FILTERS {filtered.length > 0 ? `(${filtered.length})` : ''}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active filter pills */}
                {hasFilters && (
                    <div className="flex flex-wrap gap-2">
                        {typeFilter !== 'ALL' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-nile-blue text-white border-[2px] border-black rounded-lg text-[8px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                TYPE: {typeFilter}
                                <button onClick={() => setTypeFilter('ALL')}><X size={9} strokeWidth={3} /></button>
                            </span>
                        )}
                        {locationFilter !== 'ALL' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-nile-blue text-white border-[2px] border-black rounded-lg text-[8px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                LOCATION: {locationFilter}
                                <button onClick={() => setLocationFilter('ALL')}><X size={9} strokeWidth={3} /></button>
                            </span>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[24px] space-y-3">
                        <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">NO JOBS FOUND</p>
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-[9px] font-black text-nile-blue uppercase underline hover:text-nile-green transition-colors">
                                CLEAR FILTERS
                            </button>
                        )}
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
        showToast(isSaved ? 'Job removed from saved' : 'Job saved to bookmarks', 'success');
    };

    const initials = job.company_name
        ? job.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const tags = job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3) : [];
    const jobTypeKey = (job.type || '').toLowerCase();
    const typeClass = typeColors[jobTypeKey] || 'bg-nile-white text-black border-[1.5px] border-black';
    const typeName = typeLabel[jobTypeKey] || job.type?.toUpperCase() || 'ROLE';

    return (
        <div className="bg-white p-5 md:p-6 rounded-[20px] border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all group flex flex-col text-left">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-nile-blue text-white flex items-center justify-center text-sm font-black border-[2px] border-black shadow-[2px_2px_0px_0px_#6CBB56] flex-shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-black text-black uppercase leading-none tracking-tighter truncate">{job.title}</h3>
                        <p className="text-[9px] font-bold text-nile-blue/50 uppercase mt-1 tracking-widest truncate">{job.company_name}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className={`p-2 border-[2px] border-black rounded-lg transition-all flex-shrink-0 ${isSaved ? 'bg-nile-green text-black' : 'bg-white hover:bg-black/5'}`}
                >
                    <Bookmark size={13} strokeWidth={3} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                {job.location && (
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-black/60 uppercase">
                        <MapPin size={10} strokeWidth={3} className="text-nile-blue" />
                        <span>{job.location}</span>
                    </div>
                )}
                {job.salary && (
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-black/60 uppercase">
                        <DollarSign size={10} strokeWidth={3} className="text-nile-green" />
                        <span>{job.salary}</span>
                    </div>
                )}
                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border-[1.5px] border-black ${typeClass}`}>{typeName}</span>
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-5">
                    {tags.map(tag => (
                        <span key={tag} className="text-[7px] font-black uppercase px-2 py-1 bg-nile-white border border-black/10 rounded-md">{tag}</span>
                    ))}
                </div>
            )}

            <div className="flex gap-2 mt-auto">
                <Button fullWidth size="sm" onClick={onApply}>QUICK APPLY</Button>
                <Button variant="outline" size="sm" onClick={onNavigate}>VIEW</Button>
            </div>
        </div>
    );
};

export default JobBoard;
