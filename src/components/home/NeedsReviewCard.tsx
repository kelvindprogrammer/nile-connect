import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../Avatar';
import { getEmployerApplications, type EmployerApplication } from '../../services/employerService';
import SidebarCard from './SidebarCard';

const NeedsReviewCard: React.FC = () => {
    const navigate = useNavigate();
    const [apps, setApps] = useState<EmployerApplication[] | null>(null);

    useEffect(() => {
        getEmployerApplications({ stage: 'submitted' })
            .then(list => setApps(list.slice(0, 4)))
            .catch(() => setApps([]));
    }, []);

    return (
        <SidebarCard title="Needs review" seeAllTo="/employer/applications" isLoading={apps === null} empty={apps?.length === 0} emptyLabel="No new applications to review">
            {apps?.map(app => (
                <button
                    key={app.id}
                    onClick={() => navigate('/employer/applications')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                    <Avatar name={app.student_name} size="sm" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{app.student_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{app.job_title}</p>
                    </div>
                </button>
            ))}
        </SidebarCard>
    );
};

export default NeedsReviewCard;
