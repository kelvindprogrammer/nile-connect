import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, FileText, Calendar as CalendarIcon, Settings, Sparkles, Users, Briefcase, Mail, Building2 } from 'lucide-react';
import Feed from '../../components/Feed';
import HomeLayout from '../../components/home/HomeLayout';
import MobileQuickActions from '../../components/home/MobileQuickActions';
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
        <HomeLayout
            left={
                <>
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
                    <VerificationNotice status={profile?.status} />
                </>
            }
            right={
                <>
                    <ActiveListingsCard />
                    <NeedsReviewCard />
                    <EventsCard seeAllTo="/employer/events" />
                </>
            }
            mobileHeader={
                <>
                    <MobileQuickActions
                        greeting="Welcome back"
                        name={companyName}
                        subLabel={recruiterName}
                        accent="text-nile-green"
                        actions={[
                            { label: 'Talent', icon: Users, to: '/employer/candidates' },
                            { label: 'Jobs', icon: Briefcase, to: '/employer/jobs' },
                            { label: 'Applications', icon: FileText, to: '/employer/applications' },
                            { label: 'Events', icon: CalendarIcon, to: '/employer/events' },
                            { label: 'Messages', icon: Mail, to: '/employer/messages' },
                            { label: 'Insights', icon: Sparkles, to: '/employer/insights' },
                            { label: 'Profile', icon: Building2, to: '/employer/profile' },
                            { label: 'Settings', icon: Settings, to: '/employer/settings' },
                        ]}
                    />
                    <VerificationNotice status={profile?.status} />
                </>
            }
        >
            <Feed />
        </HomeLayout>
    );
};

/** Verification banner, shared by the desktop rail and the mobile header so the
 *  two can never drift apart. */
const VerificationNotice = ({ status }: { status?: string }) => {
    if (status === 'pending') {
        return (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-2.5">
                <Clock size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 leading-relaxed">
                    Your company profile is pending staff approval. You'll be notified once it's verified.
                </p>
            </div>
        );
    }
    if (status === 'approved') {
        return (
            <div className="bg-nile-green/5 border border-nile-green/20 rounded-xl p-4 flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-nile-green flex-shrink-0 mt-0.5" />
                <p className="text-xs text-nile-green-700 leading-relaxed">
                    Your company is verified and visible to students.
                </p>
            </div>
        );
    }
    return null;
};

export default EmployerDashboard;
