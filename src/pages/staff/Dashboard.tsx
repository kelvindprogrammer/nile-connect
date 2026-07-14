import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Feed from '../../components/Feed';
import { useAuth } from '../../hooks/useAuth';
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
        <div className="max-w-2xl mx-auto p-4 md:py-6 space-y-4 anime-fade-in font-sans pb-24 md:pb-6">

            {/* ── Identity header ─────────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-4 flex items-center gap-4">
                <Avatar name={staffName} size="lg" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">Welcome, {staffName.split(' ')[0]}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.department || 'Career Services'}</p>
                </div>
                <button onClick={() => navigate('/staff/insights')}
                    className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0">
                    <Sparkles size={13} /> Insights <ChevronRight size={13} />
                </button>
            </div>

            {/* ── Pending-approvals pill (time-sensitive, must not be buried) ── */}
            {totalPending > 0 && (
                <button onClick={() => navigate('/staff/insights')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100/60 transition-colors">
                    <span className="text-sm font-medium text-red-600">
                        {totalPending} pending approval{totalPending !== 1 ? 's' : ''} need your attention
                    </span>
                    <ChevronRight size={16} className="text-red-400 flex-shrink-0" />
                </button>
            )}

            {/* ── Feed ─────────────────────────────────────────────────── */}
            <Feed />
        </div>
    );
};

export default StaffDashboard;
