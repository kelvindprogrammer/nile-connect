import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, GraduationCap, Calendar as CalendarIcon, BarChart2, Sparkles, Settings, Briefcase, HeartHandshake, Mail } from 'lucide-react';
import Feed from '../../components/Feed';
import HomeLayout from '../../components/home/HomeLayout';
import MobileQuickActions from '../../components/home/MobileQuickActions';
import ProfileSnapshotCard from '../../components/home/ProfileSnapshotCard';
import StaffStatsCard from '../../components/home/StaffStatsCard';
import EventsCard from '../../components/home/EventsCard';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, DashboardStats } from '../../services/staffService';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    const fetchStats = useCallback(() => {
        getDashboardStats().then(setStats).catch(() => {});
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchStats, 0);
        return () => clearTimeout(t);
    }, [fetchStats]);

    const staffName = user?.name || 'Staff';
    const totalPending = (stats?.pending_employers ?? 0) + (stats?.pending_jobs ?? 0);

    return (
        <HomeLayout
            left={
                <ProfileSnapshotCard
                    name={staffName}
                    headline={user?.department || 'Career Services'}
                    coverClassName="bg-ink-900"
                    accentText="text-ink-800"
                    profilePath="/staff/profile"
                    stats={[]}
                    shortcuts={[
                        { label: 'Services queue', icon: GraduationCap, to: '/staff/services' },
                        { label: 'Events', icon: CalendarIcon, to: '/staff/events' },
                        { label: 'Reports', icon: BarChart2, to: '/staff/reports' },
                        { label: 'Insights', icon: Sparkles, to: '/staff/insights' },
                        { label: 'Settings', icon: Settings, to: '/staff/settings' },
                    ]}
                />
            }
            right={
                <>
                    <StaffStatsCard stats={stats} />
                    <EventsCard seeAllTo="/staff/events" />
                </>
            }
            mobileHeader={
                <MobileQuickActions
                    greeting="Welcome"
                    name={staffName.split(' ')[0]}
                    subLabel={user?.department || 'Career Services'}
                    accent="text-ink-800"
                    stats={[
                        { label: 'Pending employers', value: stats?.pending_employers ?? '—', to: '/staff/insights' },
                        { label: 'Pending jobs', value: stats?.pending_jobs ?? '—', to: '/staff/jobs' },
                        { label: 'Students', value: stats?.total_students ?? '—', to: '/staff/crm' },
                    ]}
                    actions={[
                        { label: 'Services', icon: GraduationCap, to: '/staff/services' },
                        { label: 'Events', icon: CalendarIcon, to: '/staff/events' },
                        { label: 'Jobs', icon: Briefcase, to: '/staff/jobs' },
                        { label: 'Network', icon: HeartHandshake, to: '/staff/crm' },
                        { label: 'Reports', icon: BarChart2, to: '/staff/reports' },
                        { label: 'Insights', icon: Sparkles, to: '/staff/insights', badge: totalPending },
                        { label: 'Messages', icon: Mail, to: '/staff/messages' },
                        { label: 'Settings', icon: Settings, to: '/staff/settings' },
                    ]}
                />
            }
        >
            {totalPending > 0 && (
                <button onClick={() => navigate('/staff/insights')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 mb-4 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100/60 transition-colors">
                    <span className="text-sm font-medium text-red-600">
                        {totalPending} pending approval{totalPending !== 1 ? 's' : ''} need your attention
                    </span>
                    <ChevronRight size={16} className="text-red-400 flex-shrink-0" />
                </button>
            )}

            <Feed />
        </HomeLayout>
    );
};

export default StaffDashboard;
