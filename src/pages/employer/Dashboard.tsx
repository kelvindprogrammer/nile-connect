import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, FileText, Calendar as CalendarIcon, Settings, Sparkles } from 'lucide-react';
import Feed from '../../components/Feed';
import ProfileSnapshotCard from '../../components/home/ProfileSnapshotCard';
import ActiveListingsCard from '../../components/home/ActiveListingsCard';
import NeedsReviewCard from '../../components/home/NeedsReviewCard';
import EventsCard from '../../components/home/EventsCard';
import { useAuth } from '../../context/AuthContext';
import { getEmployerProfile, EmployerProfile } from '../../services/employerService';

const EmployerDashboard = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<EmployerProfile | null>(null);

    useEffect(() => {
        getEmployerProfile().then(setProfile).catch(() => {});
    }, []);

    const companyName = profile?.company_name || user?.company || 'Your company';
    const recruiterName = user?.name || 'Recruiter';

    return (
        <div className="max-w-[1180px] mx-auto p-4 md:py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px] gap-5 anime-fade-in font-sans pb-24 md:pb-6 items-start">

            {/* ── Left rail: company snapshot ─────────────────────────── */}
            <div className="hidden lg:flex flex-col gap-5 sticky top-[76px]">
                <ProfileSnapshotCard
                    name={companyName}
                    headline={recruiterName}
                    coverClassName="bg-nile-green"
                    accentText="text-nile-green-700"
                    profilePath="/employer/profile"
                    stats={[
                        { label: 'Status', value: profile?.status === 'approved' ? 'Verified' : 'Pending' },
                    ]}
                    shortcuts={[
                        { label: 'Applications', icon: FileText, to: '/employer/applications' },
                        { label: 'Events', icon: CalendarIcon, to: '/employer/events' },
                        { label: 'Insights', icon: Sparkles, to: '/employer/insights' },
                        { label: 'Settings', icon: Settings, to: '/employer/settings' },
                    ]}
                />
                {profile?.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-start gap-2.5">
                        <Clock size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-700 leading-relaxed">Your company profile is pending staff approval. You'll be notified once it's verified.</p>
                    </div>
                )}
                {profile?.status === 'approved' && (
                    <div className="bg-nile-green/5 border border-nile-green/20 rounded-2xl p-4 flex items-start gap-2.5">
                        <CheckCircle2 size={15} className="text-nile-green flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-nile-green-700 leading-relaxed">Your company is verified and visible to students.</p>
                    </div>
                )}
            </div>

            {/* ── Center: composer + feed ──────────────────────────────── */}
            <div className="min-w-0">
                <div className="lg:hidden mb-4">
                    <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">{companyName}</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Welcome back, {recruiterName.split(' ')[0]}</p>
                </div>
                <Feed />
            </div>

            {/* ── Right rail: listings, review queue, events ───────────── */}
            <div className="hidden xl:flex flex-col gap-5 sticky top-[76px]">
                <ActiveListingsCard />
                <NeedsReviewCard />
                <EventsCard seeAllTo="/employer/events" />
            </div>
        </div>
    );
};

export default EmployerDashboard;
