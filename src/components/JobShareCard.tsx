import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Wifi, BadgeCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJobDetail } from '../services/jobService';
import type { JobDetail } from '../types/job';

interface JobShareCardProps {
    jobId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    internship: 'Internship',
    siwes: 'SIWES',
    nyse: 'NYSC',
    graduate: 'Graduate Role',
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contract',
};

const JobShareCard: React.FC<JobShareCardProps> = ({ jobId }) => {
    const { user } = useAuth();
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getJobDetail(jobId)
            .then(j => { if (!cancelled) setJob(j); })
            .catch(() => { if (!cancelled) setFailed(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [jobId]);

    const viewHref = user?.role === 'student' ? `/student/jobs/${jobId}` : `/employer/jobs`;

    if (loading) {
        return (
            <div className="mx-4 mb-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
        );
    }
    if (failed || !job) {
        return (
            <div className="mx-4 mb-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-400">
                This job is no longer available.
            </div>
        );
    }

    return (
        <Link
            to={viewHref}
            className="mx-4 mb-2 block rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-nile-blue/20 transition-colors p-4"
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-nile-blue/10 text-nile-blue flex items-center justify-center flex-shrink-0">
                    <Briefcase size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <h5 className="font-semibold text-sm text-gray-900 truncate">{job.title}</h5>
                        {job.employer.is_verified && <BadgeCheck size={14} className="text-nile-blue flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{job.employer.company_name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                        {job.is_remote && <span className="flex items-center gap-1"><Wifi size={12} />Remote</span>}
                        <span className="px-2 py-0.5 rounded-full bg-nile-blue/10 text-nile-blue font-medium">
                            {CATEGORY_LABELS[job.employment_category] || job.employment_category}
                        </span>
                        {job.salary && <span>{job.salary}</span>}
                    </div>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200/60 text-xs font-medium text-nile-blue">
                View job →
            </div>
        </Link>
    );
};

export default JobShareCard;
