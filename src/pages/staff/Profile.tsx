import React, { useEffect, useState } from 'react';
import { Mail, MapPin, Shield, LogOut, Edit, ShieldCheck, Link2, ExternalLink } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, type DashboardStats } from '../../services/staffService';
import { recordProfileView } from '../../services/profileService';

const FOCUS_AREAS = ['Career counseling', 'Employer relations', 'Job approvals', 'Student advocacy'];

const StaffProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalViews, setTotalViews] = useState<number | null>(null);

    const name = user?.name || 'Staff member';
    const email = user?.email || '';
    const department = user?.department || 'Career Services';

    useEffect(() => {
        getDashboardStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        recordProfileView(user.id).then(r => setTotalViews(r.total_views)).catch(() => {});
    }, [user?.id]);

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-24 text-left max-w-4xl mx-auto">

            {/* Hero */}
            <div className="bg-white border border-gray-100 rounded-[24px] shadow-card overflow-hidden">
                <div className="h-24 md:h-32 bg-gradient-to-r from-nile-blue to-nile-blue-600 relative" />

                <div className="px-5 md:px-8 pb-6 relative">
                    <div className="absolute -top-10 left-5 md:left-8 w-20 h-20 rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
                        <Avatar name={name} size="lg" />
                    </div>

                    <div className="pt-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-none">{name}</h1>
                                <span className="flex items-center gap-1 bg-nile-green text-white text-xs font-medium px-2.5 py-1 rounded-full">
                                    <ShieldCheck size={11} strokeWidth={3} /> Staff
                                </span>
                            </div>
                            <p className="text-sm font-medium text-nile-blue">{department}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => navigate('/staff/settings')} className="flex-1 sm:flex-none">
                                <Edit size={13} className="mr-1.5" /> Edit
                            </Button>
                            <Button
                                variant="outline" size="sm"
                                className="text-red-500 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 flex-1 sm:flex-none"
                                onClick={handleLogout}
                            >
                                <LogOut size={13} className="mr-1.5" /> Log out
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-gray-100">
                        <div className="text-left">
                            <p className="text-xl font-semibold leading-none text-gray-900">{totalViews === null ? '—' : totalViews}</p>
                            <p className="text-xs text-gray-400 mt-1">Profile views</p>
                        </div>
                        {!loading && stats && (
                            <div className="text-left">
                                <p className="text-xl font-semibold leading-none text-nile-blue">{(stats.pending_jobs + stats.pending_employers).toLocaleString()}</p>
                                <p className="text-xs text-gray-400 mt-1">Pending approvals</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="About">
                        <p className="text-sm text-gray-500 leading-relaxed">
                            {name} is part of the {department} team, helping students find internships, SIWES
                            placements, and graduate opportunities, and supporting employer partners through
                            the hiring pipeline.
                        </p>
                    </Card>

                    <Card title="Focus areas">
                        <div className="flex flex-wrap gap-2">
                            {FOCUS_AREAS.map(area => (
                                <span key={area} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                    {area}
                                </span>
                            ))}
                        </div>
                    </Card>

                    <Card title="Platform activity" subtitle="Platform-wide totals, not individually attributed">
                        {loading ? (
                            <div className="grid grid-cols-2 gap-4 animate-pulse">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Students', v: stats.total_students, sub: 'Registered accounts', c: 'bg-nile-blue/5 border-nile-blue/10', cv: 'text-nile-blue' },
                                    { label: 'Employers', v: stats.total_employers, sub: `${stats.pending_employers} pending`, c: 'bg-yellow-50 border-yellow-100', cv: 'text-yellow-600' },
                                    { label: 'Active jobs', v: stats.active_jobs, sub: `${stats.pending_jobs} pending review`, c: 'bg-nile-green/5 border-nile-green/10', cv: 'text-nile-green' },
                                    { label: 'Applications', v: stats.total_applications, sub: 'Total submitted', c: 'bg-gray-50 border-gray-100', cv: 'text-gray-700' },
                                ].map(s => (
                                    <div key={s.label} className={`border rounded-2xl p-4 ${s.c}`}>
                                        <p className={`text-2xl font-semibold leading-none ${s.cv}`}>{s.v.toLocaleString()}</p>
                                        <p className="text-xs font-medium text-gray-600 mt-1">{s.label}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">Failed to load stats</p>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Role & department">
                        <div className="space-y-3">
                            {[
                                { icon: <Mail size={14} />, label: 'Email', value: email },
                                { icon: <Shield size={14} />, label: 'Role', value: 'Career services staff' },
                                { icon: <MapPin size={14} />, label: 'Office', value: 'Career Centre, Rm 402' },
                            ].map(r => (
                                <div key={r.label} className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-nile-white border border-gray-100 rounded-lg flex items-center justify-center text-nile-blue flex-shrink-0">{r.icon}</div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-400">{r.label}</p>
                                        <p className="text-sm font-medium text-gray-900 truncate">{r.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Connect">
                        <div className="space-y-2">
                            <a
                                href={email ? `mailto:${email}` : undefined}
                                className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-nile-blue hover:text-white transition-all group"
                            >
                                <Mail size={14} strokeWidth={3} className="flex-shrink-0" />
                                <span className="text-xs font-medium truncate">{email || 'No email'}</span>
                            </a>
                            <a
                                href="/staff/messages"
                                className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-nile-blue hover:text-white transition-all"
                            >
                                <Link2 size={14} strokeWidth={3} className="flex-shrink-0" />
                                <span className="text-xs font-medium">Message this staff member</span>
                            </a>
                            <a
                                href="https://nileuniversity.edu.ng"
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-nile-blue hover:text-white transition-all"
                            >
                                <ExternalLink size={14} strokeWidth={3} className="flex-shrink-0" />
                                <span className="text-xs font-medium">Nile University</span>
                            </a>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StaffProfile;
