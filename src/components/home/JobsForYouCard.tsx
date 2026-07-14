import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { getJobs } from '../../services/jobService';
import type { JobListItem } from '../../types/job';
import SidebarCard from './SidebarCard';

const JobsForYouCard: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<JobListItem[] | null>(null);

    useEffect(() => {
        getJobs().then(list => setJobs(list.slice(0, 3))).catch(() => setJobs([]));
    }, []);

    return (
        <SidebarCard title="Opportunities for you" seeAllTo="/student/jobs" isLoading={jobs === null} empty={jobs?.length === 0} emptyLabel="No open roles right now">
            {jobs?.map(job => (
                <button
                    key={job.id}
                    onClick={() => navigate(`/student/jobs/${job.id}`)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="w-9 h-9 rounded-lg bg-nile-blue/10 text-nile-blue flex items-center justify-center flex-shrink-0">
                        <Briefcase size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{job.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{job.company_name}{job.location ? ` · ${job.location}` : ''}</p>
                    </div>
                </button>
            ))}
        </SidebarCard>
    );
};

export default JobsForYouCard;
