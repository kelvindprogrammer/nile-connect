import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, MapPin, Wallet, SlidersHorizontal, Bookmark,
    Loader2, ChevronDown, X, Check, Briefcase, Clock, Users, Sparkles,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import QuickApplyModal from '../../components/QuickApplyModal';
import Button from '../../components/Button';
import { getJobs } from '../../services/jobService';
import type { JobListItem as Job } from '../../types/job';

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

const JOB_TYPES = ['All', 'Full-time', 'Remote', 'Hybrid', 'Internship', 'Part-time'];
const LOCATIONS = ['All', 'Abuja', 'Lagos', 'Kano', 'Remote', 'International'];
const EMPLOYMENT_CATEGORIES = ['All', 'internship', 'siwes', 'nyse', 'graduate', 'full-time', 'part-time', 'contract'];

const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
};

const isRecentlyPosted = (iso?: string) => {
    if (!iso) return false;
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return days <= 2;
};

const deadlineInfo = (iso?: string): { label: string; urgent: boolean } | null => {
    if (!iso) return null;
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { label: 'Closed', urgent: false };
    if (days === 0) return { label: 'Closes today', urgent: true };
    if (days <= 3) return { label: `${days}d left`, urgent: true };
    if (days <= 14) return { label: `${days}d left`, urgent: false };
    return { label: `Closes ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, urgent: false };
};

const JobBoard = () => {
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isApplyModalOpen, setApplyModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [typeFilter, setTypeFilter] = useState('All');
    const [locationFilter, setLocationFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [remoteOnly, setRemoteOnly] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        getJobs(search ? { q: search } : undefined)
            .then(setJobs)
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

    const clearFilters = () => { setTypeFilter('All'); setLocationFilter('All'); setCategoryFilter('All'); setRemoteOnly(false); };
    const hasFilters = typeFilter !== 'All' || locationFilter !== 'All' || categoryFilter !== 'All' || remoteOnly;

    const filtered = jobs.filter(j => {
        const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.company_name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'All' || (j.type || '').toLowerCase() === typeFilter.toLowerCase();
        const matchesLocation = locationFilter === 'All' || (j.location || '').toLowerCase().includes(locationFilter.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || (j.employment_category || '').toLowerCase() === categoryFilter.toLowerCase();
        const matchesRemote = !remoteOnly || j.is_remote;
        return matchesSearch && matchesType && matchesLocation && matchesCategory && matchesRemote;
    });

    const handleQuickApply = (job: Job) => { setSelectedJob(job); setApplyModalOpen(true); };

    return (
        <>
            <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-24 text-left max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">Opportunities</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {isLoading ? 'Loading roles…' : `${filtered.length} open ${filtered.length === 1 ? 'role' : 'roles'} matched to your profile`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="relative group flex-1 lg:w-72">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-nile-blue transition-colors" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by title or company"
                                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                            />
                        </div>

                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setShowFilters(v => !v)}
                                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all
                                    ${showFilters || hasFilters
                                        ? 'bg-nile-blue text-white border-nile-blue shadow-blue'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
                            >
                                <SlidersHorizontal size={15} />
                                Filters
                                {hasFilters && (
                                    <span className="w-5 h-5 bg-nile-green text-white rounded-full text-[10px] flex items-center justify-center font-semibold">
                                        {(typeFilter !== 'All' ? 1 : 0) + (locationFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0) + (remoteOnly ? 1 : 0)}
                                    </span>
                                )}
                                <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>

                            {showFilters && (
                                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-soft-lg p-5 z-50 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-900">Filters</span>
                                        {hasFilters && (
                                            <button onClick={clearFilters} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">
                                                Clear all
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-400">Job type</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {JOB_TYPES.map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTypeFilter(t)}
                                                    className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-medium transition-all
                                                        ${typeFilter === t ? 'bg-nile-blue text-white border-nile-blue' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                                                >
                                                    {t}
                                                    {typeFilter === t && <Check size={13} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-400">Location</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {LOCATIONS.map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => setLocationFilter(l)}
                                                    className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-medium transition-all
                                                        ${locationFilter === l ? 'bg-nile-blue text-white border-nile-blue' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                                                >
                                                    {l}
                                                    {locationFilter === l && <Check size={13} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-gray-400">Category</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {EMPLOYMENT_CATEGORIES.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setCategoryFilter(c)}
                                                    className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-medium capitalize transition-all
                                                        ${categoryFilter === c ? 'bg-nile-blue text-white border-nile-blue' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                                                >
                                                    {c}
                                                    {categoryFilter === c && <Check size={13} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <label className="flex items-center justify-between px-3 py-2.5 border border-gray-100 rounded-lg cursor-pointer bg-gray-50">
                                        <span className="text-xs font-medium text-gray-700">Remote only</span>
                                        <input
                                            type="checkbox"
                                            checked={remoteOnly}
                                            onChange={e => setRemoteOnly(e.target.checked)}
                                            className="accent-nile-blue w-4 h-4"
                                        />
                                    </label>

                                    <Button fullWidth size="sm" onClick={() => setShowFilters(false)}>
                                        Show {filtered.length} {filtered.length === 1 ? 'role' : 'roles'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active filter pills */}
                {hasFilters && (
                    <div className="flex flex-wrap gap-2">
                        {typeFilter !== 'All' && (
                            <FilterPill label={typeFilter} onClear={() => setTypeFilter('All')} />
                        )}
                        {locationFilter !== 'All' && (
                            <FilterPill label={locationFilter} onClear={() => setLocationFilter('All')} />
                        )}
                        {categoryFilter !== 'All' && (
                            <FilterPill label={categoryFilter} onClear={() => setCategoryFilter('All')} />
                        )}
                        {remoteOnly && (
                            <FilterPill label="Remote only" onClear={() => setRemoteOnly(false)} />
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={28} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl space-y-3 bg-white">
                        <Briefcase size={28} className="mx-auto text-gray-300" />
                        <p className="text-sm font-medium text-gray-400">No roles match your filters right now</p>
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-sm font-medium text-nile-blue hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
        </>
    );
};

const FilterPill = ({ label, onClear }: { label: string; onClear: () => void }) => (
    <span className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-nile-blue/10 text-nile-blue rounded-full text-xs font-medium capitalize">
        {label}
        <button onClick={onClear} className="hover:bg-nile-blue/20 rounded-full p-0.5 transition-colors">
            <X size={11} />
        </button>
    </span>
);

const JobCard = ({ job, onNavigate, onApply }: { job: Job; onNavigate: () => void; onApply: () => void }) => {
    const { showToast } = useToast();
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSaved(!isSaved);
        showToast(isSaved ? 'Job removed from saved' : 'Job saved to bookmarks', 'success');
    };

    const initials = job.company_name
        ? job.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const tags = job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4) : [];
    const jobTypeKey = (job.type || '').toLowerCase();
    const typeClass = typeStyles[jobTypeKey] || 'bg-gray-100 text-gray-600';
    const typeName = typeLabel[jobTypeKey] || job.type || 'Role';
    const deadline = deadlineInfo(job.deadline);
    const isNew = isRecentlyPosted(job.posted_at);

    return (
        <div
            onClick={onNavigate}
            className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-card hover:shadow-soft-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col text-left"
        >
            <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nile-blue to-nile-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-semibold text-gray-900 leading-snug truncate group-hover:text-nile-blue transition-colors">{job.title}</h3>
                            {isNew && (
                                <span className="flex-shrink-0 text-[10px] font-semibold text-nile-green bg-nile-green/10 px-1.5 py-0.5 rounded-full">New</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-sm text-gray-500 truncate">{job.company_name}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className={`p-2 rounded-lg transition-all flex-shrink-0 ${isSaved ? 'bg-nile-green/10 text-nile-green' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                >
                    <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-xs text-gray-500">
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
                {typeof job.applicant_count === 'number' && (
                    <span className="flex items-center gap-1">
                        <Users size={12} className="text-gray-400" /> {job.applicant_count} applied
                    </span>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeClass}`}>{typeName}</span>
                {tags.map(tag => (
                    <span key={tag} className="text-xs font-medium px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-gray-600">{tag}</span>
                ))}
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                        <Clock size={11} /> {timeAgo(job.posted_at)}
                    </span>
                    {deadline && (
                        <span className={`flex items-center gap-1 font-medium ${deadline.urgent ? 'text-red-500' : 'text-gray-400'}`}>
                            <Sparkles size={11} /> {deadline.label}
                        </span>
                    )}
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={onNavigate}>View</Button>
                    <Button size="sm" onClick={onApply}>Quick apply</Button>
                </div>
            </div>
        </div>
    );
};

export default JobBoard;
