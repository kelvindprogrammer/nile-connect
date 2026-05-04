import React, { useEffect, useState } from 'react';
import { Mail, MapPin, Shield, LogOut, Edit, TrendingUp, Loader2 } from 'lucide-react';
import Avatar from '../../components/Avatar';
import NileConnectLogo from '../../components/NileConnectLogo';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { getDashboardStats, type DashboardStats } from '../../services/staffService';

const StaffProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const name       = user?.name       || 'STAFF MEMBER';
    const email      = user?.email      || 'staff@nileuni.edu.ng';
    const department = user?.department || 'CAREER SERVICES';

    useEffect(() => {
        getDashboardStats()
            .then(setStats)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-24 text-left max-w-4xl mx-auto">

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="bg-white border-[2px] border-black rounded-[28px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">

                {/* Banner */}
                <div className="h-32 md:h-40 bg-black relative overflow-hidden border-b-[2px] border-black">
                    <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-15">
                        <NileConnectLogo size="md" showText animated textColor="white" showTagline={false} />
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm">
                        <Shield size={11} className="text-nile-green" />
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">STAFF ADMIN</span>
                    </div>
                </div>

                {/* Info */}
                <div className="px-5 md:px-8 pb-6 relative">
                    <div className="absolute -top-10 left-5 md:left-8 w-20 h-20 rounded-[20px] border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <Avatar name={name} size="lg" />
                    </div>

                    <div className="pt-12 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-black text-black uppercase leading-none tracking-tighter">{name} .</h1>
                                <span className="bg-nile-green text-white px-2 py-0.5 rounded text-[7px] font-black border border-black">VERIFIED</span>
                            </div>
                            <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">{department}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[8px] font-black text-black/30 uppercase">
                                <span className="flex items-center gap-1"><Mail size={10} />{email}</span>
                                <span className="flex items-center gap-1"><MapPin size={10} />Nile University, Abuja</span>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => navigate('/staff/settings')} className="flex-1 sm:flex-none">
                                <Edit size={13} className="mr-1.5" /> EDIT
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 flex-1 sm:flex-none" onClick={handleLogout}>
                                <LogOut size={13} className="mr-1.5" /> LOGOUT
                            </Button>
                        </div>
                    </div>

                    {/* Live stats */}
                    <div className="mt-6 pt-5 border-t-[2px] border-black/5">
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin text-black/20" />
                                <span className="text-[8px] font-black text-black/20 uppercase">Loading stats...</span>
                            </div>
                        ) : stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { v: stats.pending_jobs + stats.pending_employers, l: 'PENDING',   c: 'text-yellow-500' },
                                    { v: stats.total_employers,                        l: 'COMPANIES', c: 'text-nile-blue' },
                                    { v: stats.active_jobs,                            l: 'JOBS LIVE', c: 'text-nile-green' },
                                    { v: stats.total_students,                         l: 'STUDENTS',  c: 'text-black' },
                                ].map(s => (
                                    <div key={s.l}>
                                        <p className={`text-xl md:text-2xl font-black leading-none ${s.c} counter-reveal`}>{s.v.toLocaleString()}</p>
                                        <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] mt-1">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── BODY ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Contact + Quick Access */}
                <div className="space-y-4">
                    <div className="bg-white border-[2px] border-black rounded-[20px] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-black/40 pb-3 border-b-[2px] border-black/5">CONTACT INFO</h3>
                        {[
                            { icon: <Mail size={13} />,   label: 'EMAIL',  value: email },
                            { icon: <Shield size={13} />, label: 'ROLE',   value: 'CAREER SERVICES STAFF' },
                            { icon: <MapPin size={13} />, label: 'OFFICE', value: 'Career Centre, Rm 402' },
                        ].map(r => (
                            <div key={r.label} className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-nile-white border-[2px] border-black rounded-lg flex items-center justify-center text-nile-blue flex-shrink-0">{r.icon}</div>
                                <div className="min-w-0">
                                    <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em]">{r.label}</p>
                                    <p className="text-[9px] font-black text-black uppercase truncate">{r.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white border-[2px] border-black rounded-[20px] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-black/40 pb-3 border-b-[2px] border-black/5">QUICK ACCESS</h3>
                        {[
                            { label: 'Job Pipeline',    to: '/staff/jobs',     col: 'hover:bg-nile-blue hover:text-white hover:border-nile-blue' },
                            { label: 'Career Services', to: '/staff/services', col: 'hover:bg-nile-green hover:text-white hover:border-nile-green' },
                            { label: 'Events',          to: '/staff/events',   col: 'hover:bg-black hover:text-white hover:border-black' },
                            { label: 'Reports',         to: '/staff/reports',  col: 'hover:bg-nile-blue hover:text-white hover:border-nile-blue' },
                        ].map(a => (
                            <button key={a.label} onClick={() => navigate(a.to)}
                                className={`w-full text-left px-3 py-2.5 border-[1.5px] border-black/10 rounded-xl font-black text-[9px] uppercase tracking-widest text-black/50 transition-all ${a.col}`}>
                                {a.label} →
                            </button>
                        ))}
                    </div>
                </div>

                {/* Platform overview */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white border-[2px] border-black rounded-[20px] p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40">PLATFORM OVERVIEW</h3>
                            {stats && (
                                <div className="flex items-center gap-1.5 text-[8px] font-black text-nile-green uppercase">
                                    <TrendingUp size={11} /> LIVE DATA
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 gap-4 animate-pulse">
                                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-black/5 rounded-[16px]" />)}
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Students',      v: stats.total_students,     sub: 'REGISTERED ACCOUNTS',       c: 'bg-nile-blue/5 border-nile-blue/20', cv: 'text-nile-blue' },
                                    { label: 'Employers',     v: stats.total_employers,    sub: `${stats.pending_employers} PENDING`,    c: 'bg-yellow-50 border-yellow-200', cv: 'text-yellow-600' },
                                    { label: 'Active Jobs',   v: stats.active_jobs,        sub: `${stats.pending_jobs} PENDING REVIEW`, c: 'bg-nile-green/5 border-nile-green/20', cv: 'text-nile-green' },
                                    { label: 'Applications',  v: stats.total_applications, sub: 'TOTAL SUBMITTED',            c: 'bg-black/5 border-black/10', cv: 'text-black' },
                                ].map(s => (
                                    <div key={s.label} className={`border-[2px] rounded-[16px] p-4 ${s.c}`}>
                                        <p className={`text-2xl font-black leading-none ${s.cv}`}>{s.v.toLocaleString()}</p>
                                        <p className="text-[8px] font-black text-black/60 uppercase tracking-wide mt-1">{s.label}</p>
                                        <p className="text-[7px] font-black text-black/30 uppercase mt-0.5">{s.sub}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[9px] font-black text-black/20 uppercase text-center py-8">Failed to load stats</p>
                        )}
                    </div>

                    {/* Branding */}
                    <div className="bg-black rounded-[20px] p-6 border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-2">POWERED BY</p>
                                <NileConnectLogo size="sm" showText showTagline animated textColor="white" />
                            </div>
                            <div className="text-right">
                                <p className="text-[7px] font-black text-white/30 uppercase tracking-widest">STAFF CONSOLE</p>
                                <p className="text-[9px] font-black text-nile-green mt-0.5">v2.0 · LIVE</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffProfile;
