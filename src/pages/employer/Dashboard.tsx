import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, ChevronRight, Sparkles } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Feed from '../../components/Feed';
import { useAuth } from '../../context/AuthContext';
import { getEmployerProfile, EmployerProfile } from '../../services/employerService';

const EmployerDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<EmployerProfile | null>(null);

    useEffect(() => {
        getEmployerProfile().then(setProfile).catch(() => {});
    }, []);

    const companyName = profile?.company_name || user?.company || 'Your company';
    const recruiterName = user?.name || 'Recruiter';

    return (
        <div className="max-w-2xl mx-auto p-4 md:py-6 space-y-4 anime-fade-in font-sans pb-24 md:pb-6">

            {/* ── Identity / verification header ─────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-4 flex items-center gap-4">
                <Avatar name={recruiterName} size="lg" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">{companyName}</h1>
                        {profile?.status === 'approved' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-nile-green/10 text-nile-green text-[11px] font-medium rounded-full">
                                <CheckCircle2 size={11} strokeWidth={2.5} /> Verified
                            </span>
                        )}
                        {profile?.status === 'pending' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[11px] font-medium rounded-full border border-yellow-200">
                                <Clock size={11} strokeWidth={2.5} /> Pending approval
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Welcome back, {recruiterName.split(' ')[0]}</p>
                </div>
                <button onClick={() => navigate('/employer/insights')}
                    className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-nile-green transition-colors flex-shrink-0">
                    <Sparkles size={13} /> Insights <ChevronRight size={13} />
                </button>
            </div>

            {/* ── Feed ─────────────────────────────────────────────────── */}
            <Feed />
        </div>
    );
};

export default EmployerDashboard;
