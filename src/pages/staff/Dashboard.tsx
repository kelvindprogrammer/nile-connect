import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, GraduationCap, Calendar as CalendarIcon, BarChart2, Sparkles, Settings } from 'lucide-react';
import Feed from '../../components/Feed';
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
        <div className="max-w-[1180px] mx-auto p-4 md:py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px] gap-5 anime-fade-in font-sans pb-24 md:pb-6 items-start">

            {/* ── Left rail: staff snapshot ────────────────────────────── */}
            <div className="hidden lg:flex flex-col gap-5 sticky top-[76px]">
                <ProfileSnapshotCard
                    name={staffName}
                    headline={user?.department || 'Career Services'}
                    coverClassName="bg-gray-900"
                    accentText="text-gray-900"
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
            </div>

            {/* ── Center: composer + feed ──────────────────────────────── */}
            <div className="min-w-0">
                <div className="lg:hidden mb-4">
                    <h1 className="text-lg font-semibold text-gray-900 leading-tight">Welcome, {staffName.split(' ')[0]}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.department || 'Career Services'}</p>
                </div>

                {totalPending > 0 && (
                    <button onClick={() => navigate('/staff/insights')}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 mb-4 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100/60 transition-colors">
                        <span className="text-sm font-medium text-red-600">
                            {totalPending} pending approval{totalPending !== 1 ? 's' : ''} need your attention
                        </span>
                        <ChevronRight size={16} className="text-red-400 flex-shrink-0" />
                    </button>
                )}

                <Feed />
            </div>

            {/* ── Right rail: stats, events ─────────────────────────────── */}
            <div className="hidden xl:flex flex-col gap-5 sticky top-[76px]">
                <StaffStatsCard stats={stats} />
                <EventsCard seeAllTo="/staff/events" />
            </div>
        </div>
    );
};

export default StaffDashboard;
