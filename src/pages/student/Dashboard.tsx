import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutList, FileText, Sparkles, Briefcase, Calendar, Users } from 'lucide-react';
import Feed from '../../components/Feed';
import HomeLayout from '../../components/home/HomeLayout';
import MobileQuickActions from '../../components/home/MobileQuickActions';
import ProfileSnapshotCard from '../../components/home/ProfileSnapshotCard';
import JobsForYouCard from '../../components/home/JobsForYouCard';
import EventsCard from '../../components/home/EventsCard';
import PeopleSuggestionsCard from '../../components/home/PeopleSuggestionsCard';
import ProfileStrengthCard from '../../components/home/ProfileStrengthCard';
import { useAuth } from '../../context/AuthContext';
import { useProfile, getProfileCompletion } from '../../hooks/useProfile';
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
    const { profile, isLoading: profileLoading } = useProfile(user?.id);
    const { picture } = useProfilePicture();

    const [appsCount, setAppsCount] = useState<number | null>(null);
    const [connCount, setConnCount] = useState<number | null>(null);
    const [profileViews, setProfileViews] = useState<number | null>(null);

    const firstName = (user?.name || 'Student').split(' ')[0];
    const completion = getProfileCompletion(profile, {
        hasName: !!user?.name,
        hasEmail: !!user?.email,
        hasAvatar: !!picture,
        hasResume: !!user?.resumeUrl,
    });

    useEffect(() => {
        getMyApplications().then(a => setAppsCount(a.length)).catch(() => setAppsCount(0));
        getConnections().then(c => setConnCount(c.accepted.length)).catch(() => setConnCount(0));
        if (user?.id) recordProfileView(user.id).then(r => setProfileViews(r.total_views)).catch(() => setProfileViews(0));
    }, [user?.id]);

    const stats = [
        { label: 'Profile views', value: profileViews ?? '—' },
        { label: 'Connections', value: connCount ?? '—', to: '/student/network' },
        { label: 'Applications', value: appsCount ?? '—', to: '/student/applications' },
    ];

    const shortcuts = [
        { label: 'Career services', icon: GraduationCap, to: '/student/career' },
        { label: 'Applied jobs', icon: LayoutList, to: '/student/applications' },
        { label: 'My documents', icon: FileText, to: '/student/documents' },
        { label: 'Insights', icon: Sparkles, to: '/student/insights' },
    ];

    return (
        <HomeLayout
            left={
                <>
                    <ProfileSnapshotCard
                        name={user?.name || 'Student'}
                        headline={[profile.major || user?.major, 'Nile University'].filter(Boolean).join(' · ')}
                        avatarSrc={picture}
                        profilePath="/student/profile"
                        stats={stats}
                        shortcuts={shortcuts}
                    />
                    <ProfileStrengthCard
                        completion={completion}
                        isLoading={profileLoading}
                        onComplete={() => navigate('/student/profile/edit')}
                    />
                </>
            }
            right={
                <>
                    <JobsForYouCard />
                    <PeopleSuggestionsCard seeAllTo="/student/network" />
                    <EventsCard seeAllTo="/student/events" />
                </>
            }
            mobileHeader={
                <>
                    <MobileQuickActions
                        greeting={getGreeting()}
                        name={firstName}
                        subLabel={profile.major || user?.major || undefined}
                        stats={stats}
                        actions={[
                            { label: 'Jobs', icon: Briefcase, to: '/student/jobs' },
                            { label: 'Events', icon: Calendar, to: '/student/events' },
                            { label: 'Network', icon: Users, to: '/student/network' },
                            { label: 'Career', icon: GraduationCap, to: '/student/career' },
                            { label: 'Applied', icon: LayoutList, to: '/student/applications' },
                            { label: 'Documents', icon: FileText, to: '/student/documents' },
                            { label: 'Insights', icon: Sparkles, to: '/student/insights' },
                            { label: 'Profile', icon: GraduationCap, to: '/student/profile' },
                        ]}
                    />
                    <ProfileStrengthCard
                        completion={completion}
                        isLoading={profileLoading}
                        onComplete={() => navigate('/student/profile/edit')}
                    />
                    <EventsCard seeAllTo="/student/events" />
                </>
            }
        >
            <Feed />
        </HomeLayout>
    );
};

export default StudentDashboard;
