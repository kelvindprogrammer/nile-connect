import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutList, FileText, Sparkles } from 'lucide-react';
import Feed from '../../components/Feed';
import ProfileSnapshotCard from '../../components/home/ProfileSnapshotCard';
import JobsForYouCard from '../../components/home/JobsForYouCard';
import EventsCard from '../../components/home/EventsCard';
import PeopleSuggestionsCard from '../../components/home/PeopleSuggestionsCard';
import { useAuth } from '../../context/AuthContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { getMyApplications } from '../../services/studentService';
import { getConnections } from '../../services/connectionService';
import { recordProfileView } from '../../services/profileService';

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { picture } = useProfilePicture();

    const [appsCount, setAppsCount] = useState<number | null>(null);
    const [connCount, setConnCount] = useState<number | null>(null);
    const [profileViews, setProfileViews] = useState<number | null>(null);

    const firstName = (user?.name || 'Student').split(' ')[0];
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting = getGreeting();

    useEffect(() => {
        getMyApplications().then(a => setAppsCount(a.length)).catch(() => setAppsCount(0));
        getConnections().then(c => setConnCount(c.accepted.length)).catch(() => setConnCount(0));
        if (user?.id) recordProfileView(user.id).then(r => setProfileViews(r.total_views)).catch(() => setProfileViews(0));
    }, [user?.id]);

    return (
        <div className="max-w-[1180px] mx-auto p-4 md:py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px] gap-5 anime-fade-in font-sans pb-24 md:pb-6 items-start">

            {/* ── Left rail: profile snapshot ─────────────────────────── */}
            <div className="hidden lg:flex flex-col gap-5 sticky top-[76px]">
                <ProfileSnapshotCard
                    name={user?.name || 'Student'}
                    headline={`${user?.major || 'Computer Science'} · Nile University`}
                    avatarSrc={picture}
                    profilePath="/student/profile"
                    stats={[
                        { label: 'Profile views', value: profileViews ?? '—' },
                        { label: 'Connections', value: connCount ?? '—', to: '/student/network' },
                        { label: 'Applications', value: appsCount ?? '—', to: '/student/applications' },
                    ]}
                    shortcuts={[
                        { label: 'Career services', icon: GraduationCap, to: '/student/career' },
                        { label: 'Applied jobs', icon: LayoutList, to: '/student/applications' },
                        { label: 'My documents', icon: FileText, to: '/student/documents' },
                        { label: 'Insights', icon: Sparkles, to: '/student/insights' },
                    ]}
                />
                {strength < 100 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-700">Profile strength</p>
                            <span className="text-xs font-semibold text-nile-blue">{strength}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-nile-blue rounded-full transition-all duration-700" style={{ width: `${strength}%` }} />
                        </div>
                        <button onClick={() => navigate('/student/profile/edit')} className="text-xs font-medium text-nile-blue hover:underline">
                            Complete your profile →
                        </button>
                    </div>
                )}
            </div>

            {/* ── Center: composer + feed ──────────────────────────────── */}
            <div className="min-w-0">
                <div className="lg:hidden mb-4">
                    <p className="text-xs text-gray-400">{greeting},</p>
                    <h1 className="text-lg font-semibold text-gray-900 leading-tight">{firstName}</h1>
                </div>
                <Feed />
            </div>

            {/* ── Right rail: opportunities, events, network ──────────── */}
            <div className="hidden xl:flex flex-col gap-5 sticky top-[76px]">
                <JobsForYouCard />
                <PeopleSuggestionsCard seeAllTo="/student/network" />
                <EventsCard seeAllTo="/student/events" />
            </div>
        </div>
    );
};

export default StudentDashboard;
