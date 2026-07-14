import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '../../services/staffService';

interface StaffStatsCardProps {
    stats: DashboardStats | null;
}

const StaffStatsCard: React.FC<StaffStatsCardProps> = ({ stats }) => {
    const navigate = useNavigate();

    const tiles = [
        { label: 'Pending employers', value: stats?.pending_employers, to: '/staff/insights', urgent: true },
        { label: 'Pending job posts', value: stats?.pending_jobs, to: '/staff/insights', urgent: true },
        { label: 'Total students', value: stats?.total_students, to: '/staff/crm' },
        { label: 'Active jobs', value: stats?.active_jobs, to: '/staff/jobs' },
    ];

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">At a glance</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
                {tiles.map(t => (
                    <button
                        key={t.label}
                        onClick={() => navigate(t.to)}
                        className={`text-left p-3 rounded-xl transition-colors ${t.urgent && !!t.value ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                        <p className={`text-lg font-semibold leading-none ${t.urgent && !!t.value ? 'text-red-600' : 'text-gray-900'}`}>
                            {t.value ?? '—'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1 leading-tight">{t.label}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StaffStatsCard;
