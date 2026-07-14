import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import {
    Mail, Sparkles, TrendingUp, ArrowUpRight, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import Card from '../../components/Card';

const Bar = ({ value, color }: { value: number; color: string }) => (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
);

interface Event { id: string; title: string; category: string; date: string; time: string; }
interface ApiEnvelope<T> { data: T; }
interface ApplicationsResponse { applications: unknown[]; }
interface JobsResponse { jobs: unknown[]; }
interface EventsResponse { events: Event[]; }

const StudentInsights = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);

    const [appCount, setAppCount] = useState<number | null>(null);
    const [jobCount, setJobCount] = useState<number | null>(null);
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        Promise.allSettled([
            apiClient.get<ApiEnvelope<ApplicationsResponse>>('/api/student/applications'),
            apiClient.get<ApiEnvelope<JobsResponse>>('/api/jobs'),
            apiClient.get<ApiEnvelope<EventsResponse>>('/api/events'),
        ]).then(([appsR, jobsR, eventsR]) => {
            if (appsR.status === 'fulfilled') {
                const apps = appsR.value.data?.data?.applications ?? [];
                setAppCount(Array.isArray(apps) ? apps.length : 0);
            }
            if (jobsR.status === 'fulfilled') {
                setJobCount((jobsR.value.data?.data?.jobs ?? []).length);
            }
            if (eventsR.status === 'fulfilled') {
                setEvents((eventsR.value.data?.data?.events ?? []).slice(0, 5));
            }
        });
    }, []);

    return (
        <div className="p-4 md:p-6 pb-24 md:pb-8 space-y-6 anime-fade-in font-sans max-w-3xl mx-auto">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
                <p className="text-sm text-gray-400 mt-1">Your readiness, activity and upcoming events</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => navigate('/student/applications')} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card text-left hover:shadow-card-hover transition-all">
                    <p className="text-2xl font-semibold text-gray-900">{appCount ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">Applications</p>
                </button>
                <button onClick={() => navigate('/student/jobs')} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card text-left hover:shadow-card-hover transition-all">
                    <p className="text-2xl font-semibold text-nile-green">{jobCount ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">Open jobs</p>
                </button>
                <button onClick={() => navigate('/student/network')} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card text-left hover:shadow-card-hover transition-all">
                    <p className="text-2xl font-semibold text-nile-blue">{events.length || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">Upcoming events</p>
                </button>
            </div>

            <Card title="Readiness">
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                            <span className="text-gray-500">Profile completeness</span>
                            <span className="font-semibold text-nile-blue">{strength}%</span>
                        </div>
                        <Bar value={strength} color="#1E499D" />
                        {strength < 100 && (
                            <button onClick={() => navigate('/student/profile/edit')} className="text-xs font-medium text-nile-blue hover:underline mt-2">
                                Complete your profile →
                            </button>
                        )}
                    </div>
                    <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                            <span className="text-gray-500">Application activity</span>
                            <span className="font-semibold text-nile-green">{Math.min((appCount ?? 0) * 20, 100)}%</span>
                        </div>
                        <Bar value={Math.min((appCount ?? 0) * 20, 100)} color="#6CBB56" />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                            <span className="text-gray-500">Skills listed</span>
                            <span className="font-semibold text-yellow-500">{profile.skills?.length > 0 ? 80 : 20}%</span>
                        </div>
                        <Bar value={profile.skills?.length > 0 ? 80 : 20} color="#f59e0b" />
                    </div>
                </div>
            </Card>

            <Card title="Upcoming events">
                {events.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">No upcoming events</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {events.map((ev, i) => (
                            <div key={ev.id} className="flex items-center gap-3 py-3">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${i === 0 ? 'bg-nile-green animate-pulse' : 'bg-gray-200'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        {ev.time ? ` · ${ev.time}` : ''}
                                    </p>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-1 bg-gray-50 border border-gray-100 rounded-full flex-shrink-0">
                                    {ev.category?.slice(0, 8) || 'Event'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => navigate('/student/events')}
                    className="mt-3 w-full py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-900 hover:text-white transition-all">
                    Full calendar
                </button>
            </Card>

            <Card title="Quick links">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Messages',     to: '/student/messages',     icon: <Mail size={16} /> },
                        { label: 'Applications', to: '/student/applications', icon: <TrendingUp size={16} /> },
                        { label: 'Network',      to: '/student/network',      icon: <Users size={16} /> },
                        { label: 'AI Career',    to: '/student/career',       icon: <Sparkles size={16} /> },
                    ].map(l => (
                        <button key={l.label} onClick={() => navigate(l.to)}
                            className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-2 hover:bg-white hover:shadow-card transition-all">
                            <div className="text-nile-blue">{l.icon}</div>
                            <span className="text-xs font-medium text-gray-700">{l.label}</span>
                        </button>
                    ))}
                </div>
            </Card>

            <div className="bg-gradient-to-br from-nile-blue/5 to-nile-green/5 border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-nile-green" />
                    <span className="text-xs font-semibold text-nile-blue">AI Tip</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Complete profiles get <strong className="text-nile-blue">3×</strong> more recruiter views. Keep yours up to date.
                </p>
                <button onClick={() => navigate('/student/career/ai')}
                    className="mt-2 text-xs font-medium text-nile-green hover:underline flex items-center gap-1">
                    Ask AI counselor <ArrowUpRight size={12} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};

export default StudentInsights;
