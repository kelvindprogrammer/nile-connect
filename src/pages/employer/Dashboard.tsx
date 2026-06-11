import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Users, ClipboardList, TrendingUp, Plus,
    ChevronRight, Clock, CheckCircle2, ArrowRight, Send, Loader2,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    getEmployerProfile, getEmployerJobs, getEmployerApplications,
    EmployerProfile, JobListing, EmployerApplication,
} from '../../services/employerService';
import { apiClient } from '../../services/api';

const statusColor: Record<string, string> = {
    active:    'bg-nile-green/20 text-nile-green',
    pending:   'bg-yellow-50 text-yellow-600',
    rejected:  'bg-red-50 text-red-400',
    applied:   'bg-nile-blue/10 text-nile-blue',
    screening: 'bg-purple-50 text-purple-600',
    interview: 'bg-orange-50 text-orange-500',
    offer:     'bg-nile-green/20 text-nile-green',
};

const EmployerDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState<EmployerProfile | null>(null);
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [applications, setApplications] = useState<EmployerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [postText, setPostText] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        Promise.all([getEmployerProfile(), getEmployerJobs(), getEmployerApplications()])
            .then(([p, j, a]) => { setProfile(p); setJobs(j); setApplications(a); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postText.trim()) return;
        setPosting(true);
        try {
            await apiClient.post('/api/feed', { content: postText });
            setPostText('');
            showToast('Posted to the Nile community!', 'success');
        } catch {
            showToast('Failed to post. Try again.', 'error');
        } finally {
            setPosting(false);
        }
    };

    const companyName = profile?.company_name || user?.company || 'YOUR COMPANY';
    const recruiterName = user?.name || 'RECRUITER';

    const activeJobs = jobs.filter(j => j.status === 'active');
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    const newApps = applications.filter(a => a.status === 'applied');

    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-40 bg-black/5 rounded-[32px]" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-black/5 rounded-[20px]" />)}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 h-80 bg-black/5 rounded-[24px]" />
                <div className="xl:col-span-4 h-80 bg-black/5 rounded-[24px]" />
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 md:pb-8 min-h-full text-left">

            {/* Hero */}
            <section className="bg-white border border-gray-100 rounded-[28px] shadow-green p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-nile-green/5 -skew-x-12 translate-x-1/4" />
                <div className="space-y-3 z-10 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-nile-green text-white text-[8px] font-semibold rounded-full">RECRUITER HUB</span>
                        {profile?.status === 'approved' && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-nile-green/10 text-nile-green text-[8px] font-semibold rounded-full">
                                <CheckCircle2 size={9} strokeWidth={3} /> VERIFIED
                            </span>
                        )}
                        {profile?.status === 'pending' && (
                            <span className="px-2 py-1 bg-yellow-50 text-yellow-600 text-[8px] font-semibold rounded-full border border-yellow-200">PENDING APPROVAL</span>
                        )}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-semibold text-black leading-none">
                        Welcome, {companyName.split(' ')[0]} .
                    </h2>
                    <p className="text-[10px] md:text-sm font-bold text-black/50 leading-relaxed">
                        {activeJobs.length > 0
                            ? `${activeJobs.length} active listing${activeJobs.length > 1 ? 's' : ''} · ${newApps.length} new application${newApps.length !== 1 ? 's' : ''} waiting`
                            : 'Post your first job to start finding talent'}
                    </p>
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => navigate('/employer/jobs')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-green transition-all">
                            <Plus size={13} strokeWidth={3} /> POST JOB
                        </button>
                        <button onClick={() => navigate('/employer/applications')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-card transition-all">
                            VIEW APPLICANTS
                        </button>
                    </div>
                </div>
                {/* Stats card */}
                <div className="hidden md:flex w-[280px] bg-nile-white border border-gray-100 rounded-[24px] p-6 z-10 flex-col gap-4 shadow-blue flex-shrink-0">
                    <p className="text-[8px] font-semibold text-black/30">YOUR PIPELINE</p>
                    <div className="grid grid-cols-2 gap-4">
                        <MiniStat label="ACTIVE JOBS" value={activeJobs.length} />
                        <MiniStat label="PENDING" value={pendingJobs.length} />
                        <MiniStat label="APPLICANTS" value={applications.length} />
                        <MiniStat label="NEW" value={newApps.length} accent />
                    </div>
                </div>
            </section>

            {/* Mobile stats */}
            <div className="grid grid-cols-2 md:hidden gap-3">
                <StatCard label="ACTIVE JOBS" value={activeJobs.length} icon={<Briefcase size={16} />} color="bg-black text-white" />
                <StatCard label="APPLICANTS" value={applications.length} icon={<Users size={16} />} color="bg-nile-blue/10 text-nile-blue" />
                <StatCard label="PENDING" value={pendingJobs.length} icon={<Clock size={16} />} color="bg-yellow-50 text-yellow-600" />
                <StatCard label="NEW APPS" value={newApps.length} icon={<ClipboardList size={16} />} color="bg-nile-green/10 text-nile-green" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* Left: Post + Recent applications */}
                <div className="xl:col-span-8 space-y-6">

                    {/* Compose */}
                    <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-card">
                        <div className="flex items-center gap-3 mb-4">
                            <Avatar name={recruiterName} size="sm" />
                            <p className="text-[9px] font-semibold text-black/40">Share an update with the Nile community</p>
                        </div>
                        <form onSubmit={handlePost}>
                            <textarea
                                value={postText}
                                onChange={e => setPostText(e.target.value)}
                                placeholder="Announce a new role, share company news, hiring tips..."
                                rows={3}
                                className="w-full border border-gray-100 rounded-xl py-3 px-4 font-bold text-xs outline-none focus:shadow-blue bg-nile-white/40 resize-none transition-all"
                            />
                            <div className="flex justify-end mt-3">
                                <button type="submit" disabled={!postText.trim() || posting}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-nile-blue text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-card transition-all disabled:opacity-40">
                                    {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    {posting ? 'POSTING...' : 'POST'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Recent applications */}
                    <div className="bg-white border border-gray-100 rounded-[24px] p-5 md:p-6 shadow-blue">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-semibold text-black/50">LATEST APPLICANTS</h3>
                            <button onClick={() => navigate('/employer/applications')}
                                className="text-[8px] font-semibold text-nile-blue tracking-wider flex items-center gap-1 hover:text-black transition-colors">
                                VIEW ALL <ChevronRight size={10} />
                            </button>
                        </div>
                        {applications.length === 0 ? (
                            <div className="py-10 text-center border-[2px] border-dashed border-black/10 rounded-[20px]">
                                <Users size={24} className="text-black/15 mx-auto mb-3" />
                                <p className="text-[9px] font-semibold text-black/25">No applications yet — post a job to get started</p>
                            </div>
                        ) : applications.slice(0, 6).map(app => (
                            <div key={app.id} className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0">
                                <div className="w-8 h-8 bg-nile-blue text-white rounded-lg flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                    {(app.student_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-[10px] text-black truncate">{app.student_name}</p>
                                        {app.is_verified && <CheckCircle2 size={10} className="text-nile-green flex-shrink-0" strokeWidth={3} />}
                                    </div>
                                    <p className="text-[8px] font-semibold text-black/30 truncate">{app.job_title} · {app.major || '—'}</p>
                                </div>
                                <span className={`text-[7px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[app.status] || 'bg-black/5 text-black/40'}`}>
                                    {app.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Active listings */}
                <div className="xl:col-span-4 space-y-5">
                    <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-card">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-semibold text-black/50">YOUR LISTINGS</h3>
                            <button onClick={() => navigate('/employer/jobs')} className="text-[8px] font-semibold text-nile-blue flex items-center gap-1 hover:text-black transition-colors">
                                MANAGE <ChevronRight size={10} />
                            </button>
                        </div>
                        {jobs.length === 0 ? (
                            <div className="py-10 text-center border-[2px] border-dashed border-black/10 rounded-[20px]">
                                <Briefcase size={24} className="text-black/15 mx-auto mb-3" />
                                <p className="text-[9px] font-semibold text-black/25">No listings yet</p>
                                <button onClick={() => navigate('/employer/jobs')}
                                    className="mt-4 px-4 py-2 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[8px] shadow-green transition-all">
                                    <Plus size={10} className="inline mr-1" /> POST FIRST JOB
                                </button>
                            </div>
                        ) : jobs.slice(0, 5).map(job => (
                            <div key={job.id} onClick={() => navigate('/employer/jobs')}
                                className="flex items-center justify-between p-3 border border-gray-100/5 rounded-xl hover:border-black hover:bg-nile-white transition-all cursor-pointer group mb-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[10px] text-black truncate leading-none group-hover:text-nile-blue transition-colors">{job.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor[job.status] || 'bg-black/5 text-black/40'}`}>{job.status}</span>
                                        <span className="text-[7px] font-semibold text-black/30">{job.applicant_count} APPS</span>
                                    </div>
                                </div>
                                <ArrowRight size={12} className="text-black/20 group-hover:text-black transition-colors flex-shrink-0 ml-2" />
                            </div>
                        ))}
                    </div>

                    {/* Quick nav */}
                    <div className="grid grid-cols-2 gap-3">
                        <QuickAction label="CANDIDATES" icon={<Users size={16} />} onClick={() => navigate('/employer/candidates')} />
                        <QuickAction label="MESSAGES" icon={<TrendingUp size={16} />} onClick={() => navigate('/employer/messages')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) => (
    <div className={`border border-gray-100 rounded-[16px] p-4 shadow-card ${color.includes('bg-black') ? color : `bg-white ${color}`}`}>
        <div className="flex justify-between items-start mb-2 opacity-60">{icon}</div>
        <p className={`text-2xl font-semibold leading-none ${color.includes('bg-black') ? 'text-white' : ''}`}>{value}</p>
        <p className={`text-[7px] font-semibold mt-1 ${color.includes('bg-black') ? 'text-white/50' : 'opacity-50'}`}>{label}</p>
    </div>
);

const MiniStat = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
    <div>
        <p className={`text-xl font-semibold leading-none ${accent ? 'text-nile-green' : 'text-black'}`}>{value}</p>
        <p className="text-[7px] font-semibold text-black/40 mt-0.5">{label}</p>
    </div>
);

const QuickAction = ({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-100 rounded-[20px] shadow-card transition-all">
        <div className="text-nile-blue">{icon}</div>
        <span className="text-[8px] font-semibold tracking-wider">{label}</span>
    </button>
);

export default EmployerDashboard;
