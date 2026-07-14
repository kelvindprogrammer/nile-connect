import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users } from 'lucide-react';
import { getEmployerJobs, type JobListing } from '../../services/employerService';
import SidebarCard from './SidebarCard';

const ActiveListingsCard: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<JobListing[] | null>(null);

    useEffect(() => {
        getEmployerJobs()
            .then(list => setJobs(list.filter(j => j.status === 'active').slice(0, 3)))
            .catch(() => setJobs([]));
    }, []);

    return (
        <SidebarCard title="Your active listings" seeAllTo="/employer/jobs" isLoading={jobs === null} empty={jobs?.length === 0} emptyLabel="No active listings — post a job to get started">
            {jobs?.map(job => (
                <button
                    key={job.id}
                    onClick={() => navigate(`/employer/jobs/${job.id}`)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="w-9 h-9 rounded-lg bg-nile-green/10 text-nile-green-700 flex items-center justify-center flex-shrink-0">
                        <Briefcase size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{job.title}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users size={11} /> {job.applicant_count} applicant{job.applicant_count !== 1 ? 's' : ''}
                        </p>
                    </div>
                </button>
            ))}
        </SidebarCard>
    );
};

export default ActiveListingsCard;
