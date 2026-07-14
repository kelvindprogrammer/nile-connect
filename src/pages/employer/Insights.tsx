import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, Users, ClipboardList, Plus, ChevronRight, Clock, CheckCircle2, ArrowRight,
} from 'lucide-react';
import Card from '../../components/Card';
import {
    getEmployerJobs, getEmployerApplications,
    JobListing, EmployerApplication,
} from '../../services/employerService';

const statusColor: Record<string, string> = {
    active:    'bg-nile-green/20 text-nile-green',
    pending:   'bg-yellow-50 text-yellow-600',
    rejected:  'bg-red-50 text-red-400',
    applied:   'bg-nile-blue/10 text-nile-blue',
    screening: 'bg-purple-50 text-purple-600',
    interview: 'bg-orange-50 text-orange-500',
    offer:     'bg-nile-green/20 text-nile-green',
};

const EmployerInsights = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [applications, setApplications] = useState<EmployerApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getEmployerJobs(), getEmployerApplications()])
            .then(([j, a]) => { setJobs(j); setApplications(a); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const activeJobs = jobs.filter(j => j.status === 'active');
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    const newApps = applications.filter(a => a.status === 'applied');

    if (loading) return (
        <div className="p-4 md:p-6 space-y-4 animate-pulse max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
            </div>
            <div className="h-80 bg-gray-100 rounded-2xl" />
        </div>
    );

    return (
        <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-6 anime-fade-in font-sans max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
                <p className="text-sm text-gray-400 mt-1">Your hiring pipeline at a glance</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Active jobs" value={activeJobs.length} icon={<Briefcase size={16} />} onClick={() => navigate('/employer/jobs')} />
                <StatCard label="Pending" value={pendingJobs.length} icon={<Clock size={16} />} onClick={() => navigate('/employer/jobs')} />
                <StatCard label="Applicants" value={applications.length} icon={<Users size={16} />} onClick={() => navigate('/employer/applications')} />
                <StatCard label="New applications" value={newApps.length} icon={<ClipboardList size={16} />} onClick={() => navigate('/employer/applications')} accent />
            </div>

            <Card title="Latest applicants" action={
                <button onClick={() => navigate('/employer/applications')} className="text-xs font-medium text-nile-blue flex items-center gap-1 hover:text-gray-900">
                    View all <ChevronRight size={13} />
                </button>
            }>
                {applications.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <Users size={24} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No applications yet — post a job to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {applications.slice(0, 6).map(app => (
                            <div key={app.id} className="flex items-center gap-3 py-3">
                                <div className="w-8 h-8 bg-nile-blue text-white rounded-lg flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                    {(app.student_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm text-gray-900 truncate">{app.student_name}</p>
                                        {app.is_verified && <CheckCircle2 size={13} className="text-nile-green flex-shrink-0" strokeWidth={2.5} />}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{app.job_title} · {app.major || '—'}</p>
                                </div>
                                <span className={`text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusColor[app.status] || 'bg-gray-50 text-gray-400'}`}>
                                    {app.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card title="Your listings" action={
                <button onClick={() => navigate('/employer/jobs')} className="text-xs font-medium text-nile-blue flex items-center gap-1 hover:text-gray-900">
                    Manage <ChevronRight size={13} />
                </button>
            }>
                {jobs.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <Briefcase size={24} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-3">No listings yet</p>
                        <button onClick={() => navigate('/employer/jobs')}
                            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium text-xs">
                            <Plus size={12} className="inline mr-1" /> Post first job
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {jobs.slice(0, 5).map(job => (
                            <div key={job.id} onClick={() => navigate('/employer/jobs')}
                                className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 truncate leading-none group-hover:text-nile-blue transition-colors">{job.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${statusColor[job.status] || 'bg-gray-50 text-gray-400'}`}>{job.status}</span>
                                        <span className="text-[11px] text-gray-400">{job.applicant_count} applicants</span>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-900 transition-colors flex-shrink-0 ml-2" />
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

const StatCard = ({ label, value, icon, onClick, accent }: { label: string; value: number; icon: React.ReactNode; onClick: () => void; accent?: boolean }) => (
    <button onClick={onClick} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-card text-left hover:shadow-card-hover transition-all">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accent ? 'bg-nile-green/10 text-nile-green' : 'bg-gray-50 text-gray-500'}`}>{icon}</div>
        <p className="text-xl font-semibold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
    </button>
);

export default EmployerInsights;
