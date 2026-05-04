import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Briefcase, Brain, Mic, Users, Mail, CalendarIcon,
    ArrowUpRight, ChevronRight, Sparkles, Target,
    Camera, Loader2, TrendingUp, Zap, Award, BookOpen,
    Play, Star, Clock, MapPin,
} from 'lucide-react';
import Feed from '../../components/Feed';
import PostBar from '../../components/PostBar';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { useToast } from '../../context/ToastContext';

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5)  return 'Late Night';
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
};

const getDayInsight = (strength: number): { text: string; action: string; path: string } => {
    if (strength < 40) return { text: 'Complete your profile to unlock top job matches.', action: 'COMPLETE NOW', path: '/student/profile/edit' };
    if (strength < 70) return { text: `${100 - strength}% away from a standout profile.`, action: 'BOOST PROFILE', path: '/student/profile/edit' };
    if (strength < 90) return { text: 'Add LinkedIn & portfolio to reach 100%.', action: 'ADD LINKS', path: '/student/profile/edit' };
    return { text: 'Elite profile. Recruiters can find you easily.', action: 'VIEW PROFILE', path: '/student/profile' };
};

const StrengthRing = ({ pct, size = 68 }: { pct: number; size?: number }) => {
    const sw = 5, r = (size - sw) / 2, c = 2 * Math.PI * r;
    const [off, setOff] = useState(c);
    useEffect(() => { const t = setTimeout(() => setOff(c - (pct / 100) * c), 400); return () => clearTimeout(t); }, [pct, c]);
    const color = pct >= 80 ? '#6CBB56' : pct >= 50 ? '#1E499D' : '#ef4444';
    const label = pct >= 80 ? 'ELITE' : pct >= 50 ? 'GOOD' : 'BUILD';
    return (
        <div className="relative flex-shrink-0 group cursor-pointer" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw} />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
                    strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[13px] font-black text-black leading-none">{pct}<span className="text-[8px]">%</span></span>
                <span className="text-[6px] font-black tracking-widest" style={{ color }}>{label}</span>
            </div>
        </div>
    );
};

interface Job { id: string; title: string; company_name: string; type: string; location: string; }
interface Event { id: string; title: string; category: string; date: string; time: string; location: string; }

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { picture, uploadPicture } = useProfilePicture();
    const { showToast } = useToast();

    const userName    = user?.name || 'STUDENT';
    const firstName   = userName.split(' ')[0];
    const userType    = user?.type === 'alumni' ? 'ALUMNI' : 'STUDENT';
    const userDept    = profile.major || user?.major || 'NILE UNIVERSITY';
    const strength    = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting    = getGreeting();
    const insight     = getDayInsight(strength);

    const [isLoading,    setIsLoading]    = useState(true);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [appCount,     setAppCount]     = useState<number | null>(null);
    const [jobCount,     setJobCount]     = useState<number | null>(null);
    const [eventCount,   setEventCount]   = useState<number | null>(null);
    const [spotJobs,     setSpotJobs]     = useState<Job[]>([]);
    const [events,       setEvents]       = useState<Event[]>([]);
    const [spotIdx,      setSpotIdx]      = useState(0);
    const [postModal,    setPostModal]    = useState(false);
    const [postContent,  setPostContent]  = useState('');
    const [pendingPost,  setPendingPost]  = useState<{ content: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [appsRes, jobsRes, eventsRes] = await Promise.allSettled([
                    apiClient.get<any>('/api/student/applications'),
                    apiClient.get<any>('/api/jobs'),
                    apiClient.get<any>('/api/events'),
                ]);
                if (appsRes.status === 'fulfilled') {
                    const apps = appsRes.value.data?.data?.applications ?? [];
                    setAppCount(Array.isArray(apps) ? apps.length : 0);
                } else { setAppCount(0); }
                if (jobsRes.status === 'fulfilled') {
                    const jobs = (jobsRes.value.data?.data?.jobs ?? []) as Job[];
                    setJobCount(jobs.length);
                    setSpotJobs(jobs.slice(0, 4));
                } else { setJobCount(0); }
                if (eventsRes.status === 'fulfilled') {
                    const evs = (eventsRes.value.data?.data?.events ?? []) as Event[];
                    setEventCount(evs.length);
                    setEvents(evs.slice(0, 3));
                } else { setEventCount(0); }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (spotJobs.length < 2) return;
        const iv = setInterval(() => setSpotIdx(i => (i + 1) % spotJobs.length), 4000);
        return () => clearInterval(iv);
    }, [spotJobs.length]);

    const handlePicSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setUploadingPic(true);
        try { await uploadPicture(f); showToast('Photo updated!', 'success'); }
        catch { showToast('Upload failed', 'error'); }
        finally { setUploadingPic(false); if (fileRef.current) fileRef.current.value = ''; }
    };

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent.trim()) return;
        setPendingPost({ content: postContent });
        setPostContent('');
        setPostModal(false);
        showToast('Post published!', 'success');
    };

    if (isLoading) return (
        <DashboardLayout>
            <div className="p-4 space-y-4 animate-pulse">
                <div className="h-36 bg-black/5 rounded-[24px]" />
                <div className="grid grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-16 bg-black/5 rounded-[16px]" />)}
                </div>
                <div className="h-20 bg-black/5 rounded-[16px]" />
            </div>
        </DashboardLayout>
    );

    const sColor = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-nile-blue' : 'text-red-500';

    return (
        <DashboardLayout>
            <div className="p-3 md:p-5 space-y-4 anime-fade-in font-sans max-w-[1300px] mx-auto pb-28 md:pb-6">

                {/* ── HERO CARD ──────────────────────────────────────────────────── */}
                <section className="relative bg-white border-[2px] border-black rounded-[24px] overflow-hidden shadow-[6px_6px_0px_0px_rgba(108,187,86,0.8)]">

                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-nile-blue/4" />
                        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-nile-green/6" />
                        <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-nile-green rounded-full opacity-40" />
                    </div>

                    {/* Top micro bar */}
                    <div className="relative flex items-center justify-between px-4 py-2 border-b border-black/5 bg-nile-white/60">
                        <div className="flex items-center gap-2.5">
                            <span className="pulse-green w-2 h-2 flex-shrink-0" />
                            <span className="text-[7px] font-black text-nile-blue uppercase tracking-[0.2em]">LIVE SESSION</span>
                            <span className="text-[7px] font-black text-black/20 uppercase hidden sm:block">
                                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                            </span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[7px] font-black uppercase
                            ${strength >= 80 ? 'bg-nile-green/10 text-nile-green' : strength >= 50 ? 'bg-nile-blue/10 text-nile-blue' : 'bg-red-50 text-red-500'}`}>
                            <div className={`w-1 h-1 rounded-full ${strength >= 80 ? 'bg-nile-green' : strength >= 50 ? 'bg-nile-blue' : 'bg-red-400'}`} />
                            PROFILE {strength}%
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="relative flex items-center gap-4 md:gap-6 px-4 md:px-6 py-5">

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-[70px] h-[70px] md:w-[88px] md:h-[88px] rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-nile-blue">
                                {picture
                                    ? <img src={picture} alt={userName} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center">
                                        <span className="font-black text-white text-2xl">{userName.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                                      </div>
                                }
                            </div>
                            <button onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-nile-green border-2 border-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm group">
                                {uploadingPic ? <Loader2 size={10} className="text-white animate-spin" /> : <Camera size={10} className="text-white group-hover:rotate-12 transition-transform" />}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicSelect} />
                        </div>

                        {/* Name + greeting */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black text-black/30 uppercase tracking-[0.2em]">Good {greeting},</p>
                            <h1 className="text-3xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter mt-0.5">
                                {firstName}<span className="text-nile-green">.</span>
                            </h1>
                            <p className="text-[8px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">
                                {userType} · {userDept}
                            </p>
                            <p className="text-[9px] font-bold text-black/45 leading-relaxed mt-2 hidden sm:block max-w-xs">{insight.text}</p>
                        </div>

                        {/* Right: Ring + quick stats */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex flex-col items-center gap-1">
                                <StrengthRing pct={strength} size={72} />
                                <button onClick={() => navigate(insight.path)}
                                    className={`text-[6px] font-black uppercase tracking-widest hover:underline transition-colors ${sColor}`}>
                                    {insight.action} →
                                </button>
                            </div>

                            {/* 2×2 stats grid - desktop only */}
                            <div className="hidden sm:grid grid-cols-2 gap-1.5">
                                {[
                                    { v: appCount !== null ? String(appCount) : '—', l: 'APPS',   c: 'text-black',       bg: 'bg-nile-white',         onClick: () => navigate('/student/applications') },
                                    { v: '—',                                         l: 'CONN',   c: 'text-nile-blue',   bg: 'bg-nile-white',         onClick: () => navigate('/student/network') },
                                    { v: eventCount !== null ? String(eventCount) : '—', l: 'EVENTS', c: 'text-yellow-500', bg: 'bg-nile-white',      onClick: () => navigate('/student/events') },
                                    { v: jobCount !== null ? String(jobCount) : '—',  l: 'JOBS',   c: 'text-nile-green',  bg: 'bg-nile-white',         onClick: () => navigate('/student/jobs') },
                                ].map(s => (
                                    <button key={s.l} onClick={s.onClick}
                                        className={`${s.bg} border border-black/10 rounded-xl px-3 py-2 text-center min-w-[54px] hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-px active:translate-y-px`}>
                                        <p className={`text-sm font-black leading-none ${s.c}`}>{s.v}</p>
                                        <p className="text-[6px] font-black text-black/30 uppercase tracking-widest mt-0.5">{s.l}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="relative flex items-center gap-2 px-4 md:px-6 pb-4 flex-wrap">
                        {[
                            { to: '/student/jobs',               label: 'FIND JOBS',      icon: <Briefcase size={11} strokeWidth={3} />,  bg: 'bg-nile-blue text-white border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' },
                            { to: '/student/career/ai',          label: 'AI CAREER',      icon: <Brain size={11} strokeWidth={3} />,       bg: 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' },
                            { to: '/student/career/mock-interview', label: 'PRACTICE',    icon: <Mic size={11} strokeWidth={3} />,         bg: 'bg-nile-green text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' },
                            { to: '/student/network',            label: 'NETWORK',        icon: <Users size={11} strokeWidth={3} />,       bg: 'bg-white text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:bg-black hover:text-white' },
                        ].map(a => (
                            <button key={a.to} onClick={() => navigate(a.to)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-[2px] font-black text-[8px] uppercase tracking-wider transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${a.bg}`}>
                                {a.icon} {a.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* ── QUICK ACTION TILES ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: <Briefcase size={18} className="text-white" />,   label: 'Job Board',       sub: `${jobCount ?? '—'} active roles`,  to: '/student/jobs',                    bg: 'bg-nile-blue',   shadow: 'shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]' },
                        { icon: <Brain size={18} className="text-white" />,        label: 'AI Counselor',    sub: 'Smart career advice',              to: '/student/career/ai',               bg: 'bg-black',       shadow: 'shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]' },
                        { icon: <Play size={18} className="text-white" />,         label: 'Mock Interview',  sub: 'Practice with AI',                 to: '/student/career/mock-interview',   bg: 'bg-nile-green',  shadow: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
                        { icon: <BookOpen size={18} className="text-black" />,     label: 'Learning Path',   sub: 'Skill development',                to: '/student/career/learning',         bg: 'bg-yellow-400',  shadow: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
                    ].map(a => (
                        <button key={a.label} onClick={() => navigate(a.to)}
                            className={`flex items-center gap-3 p-4 bg-white border-[2px] border-black rounded-[18px] ${a.shadow} hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all text-left group card-lift`}>
                            <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-110 transition-transform`}>
                                {a.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-xs uppercase leading-none text-black truncate">{a.label}</p>
                                <p className="text-[8px] font-bold text-black/35 uppercase tracking-wider mt-1">{a.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── MAIN 2-COLUMN GRID ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

                    {/* ── Feed Column ──────────────────────────────────────────── */}
                    <div className="xl:col-span-8 space-y-3">
                        <div className="border-[2px] border-dashed border-black/10 rounded-[18px] bg-white/60 p-1">
                            <PostBar onPostClick={() => setPostModal(true)} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-black/60">
                                    <Zap size={11} className="text-nile-green" /> COMMUNITY PULSE
                                </h3>
                                <button onClick={() => navigate('/student/feed')}
                                    className="text-[8px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors flex items-center gap-0.5">
                                    VIEW ALL <ChevronRight size={9} strokeWidth={3} />
                                </button>
                            </div>
                            <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />
                        </div>
                    </div>

                    {/* ── Sidebar ──────────────────────────────────────────────── */}
                    <div className="xl:col-span-4 space-y-3">

                        {/* Job Spotlight */}
                        <div className="bg-nile-blue text-white border-[2px] border-black rounded-[20px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center justify-between mb-3 relative">
                                <div className="flex items-center gap-1.5">
                                    <Star size={11} className="text-yellow-300" fill="#fde047" />
                                    <p className="text-[7px] font-black uppercase tracking-widest opacity-60">JOB SPOTLIGHT</p>
                                </div>
                                {spotJobs.length > 1 && (
                                    <div className="flex gap-1">
                                        {spotJobs.map((_, i) => (
                                            <div key={i} className={`h-1 rounded-full transition-all ${i === spotIdx ? 'w-4 bg-nile-green' : 'w-1.5 bg-white/20'}`} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {spotJobs.length > 0 ? (
                                <div key={spotIdx} className="space-y-1.5 animate-in fade-in duration-300 relative">
                                    <p className="text-[7px] font-black text-white/50 uppercase">{spotJobs[spotIdx]?.company_name || '—'}</p>
                                    <h4 className="text-sm font-black uppercase leading-tight">{spotJobs[spotIdx]?.title || '—'}</h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {spotJobs[spotIdx]?.type && (
                                            <span className="text-[7px] font-black px-2 py-0.5 bg-white/10 border border-white/20 rounded-full uppercase">
                                                {spotJobs[spotIdx].type}
                                            </span>
                                        )}
                                        {spotJobs[spotIdx]?.location && (
                                            <span className="flex items-center gap-1 text-[7px] font-black text-white/60">
                                                <MapPin size={8} /> {spotJobs[spotIdx].location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[9px] font-black text-white/30 uppercase py-4 text-center">No active jobs yet</p>
                            )}

                            <button onClick={() => navigate('/student/jobs')}
                                className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5">
                                BROWSE ALL JOBS <ArrowUpRight size={10} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Career Score */}
                        <div className="bg-white border-[2px] border-black rounded-[20px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5">
                                    <Award size={13} className="text-nile-blue" />
                                    <h3 className="text-[9px] font-black uppercase tracking-widest">Career Readiness</h3>
                                </div>
                                <button onClick={() => navigate('/student/profile/edit')} className="text-[7px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors">IMPROVE →</button>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { label: 'Profile Completeness', pct: strength,               color: '#1E499D' },
                                    { label: 'Applications Sent',    pct: Math.min((appCount ?? 0) * 20, 100), color: '#6CBB56' },
                                    { label: 'Network Activity',     pct: 35,                       color: '#f59e0b' },
                                ].map(m => (
                                    <div key={m.label}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[8px] font-black text-black/50 uppercase">{m.label}</span>
                                            <span className="text-[8px] font-black" style={{ color: m.color }}>{m.pct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${m.pct}%`, background: m.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white border-[2px] border-black rounded-[20px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <CalendarIcon size={12} className="text-nile-blue" /> Upcoming
                                </h3>
                                <button onClick={() => navigate('/student/events')} className="text-[7px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors">SEE ALL →</button>
                            </div>
                            {events.length === 0 ? (
                                <p className="text-[8px] font-black text-black/20 uppercase py-4 text-center">No upcoming events</p>
                            ) : events.map((ev, i) => (
                                <div key={ev.id} className="flex items-center gap-2.5 py-2.5 border-b border-black/5 last:border-0">
                                    <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-nile-green animate-pulse' : 'bg-black/15'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[9px] font-black uppercase truncate leading-none ${i === 0 ? 'text-nile-blue' : 'text-black'}`}>{ev.title}</p>
                                        <p className="text-[7px] font-black text-black/25 uppercase tracking-wider mt-0.5">
                                            {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {ev.time || 'TBD'}
                                        </p>
                                    </div>
                                    <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full border uppercase flex-shrink-0 ${i === 0 ? 'bg-nile-blue text-white border-black' : 'bg-nile-white text-black/35 border-black/10'}`}>
                                        {ev.category?.slice(0, 6) || 'EVENT'}
                                    </span>
                                </div>
                            ))}
                            <button onClick={() => navigate('/student/events')}
                                className="mt-2.5 w-full py-2 bg-nile-white border-[2px] border-black rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-1">
                                <CalendarIcon size={10} strokeWidth={3} /> FULL CALENDAR
                            </button>
                        </div>

                        {/* AI Tip */}
                        <div className="bg-gradient-to-br from-nile-blue/5 to-nile-green/5 border-[2px] border-black/8 rounded-[20px] p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={12} className="text-nile-green" />
                                <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue">AI CAREER TIP</p>
                            </div>
                            <p className="text-[9px] font-bold text-black/60 leading-relaxed">
                                Recruiters spend <strong className="text-nile-blue">6 seconds</strong> on first scan. Add a clear headline and LinkedIn to your profile to stand out instantly.
                            </p>
                            <button onClick={() => navigate('/student/career/ai')}
                                className="mt-2 text-[7px] font-black text-nile-green uppercase tracking-widest hover:underline flex items-center gap-0.5">
                                ASK AI COUNSELOR <ChevronRight size={9} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Quick Links */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Messages',     to: '/student/messages',     icon: <Mail size={14} />,         bg: 'bg-white' },
                                { label: 'My Apps',      to: '/student/applications', icon: <TrendingUp size={14} />,   bg: 'bg-white' },
                            ].map(l => (
                                <button key={l.label} onClick={() => navigate(l.to)}
                                    className={`${l.bg} border-[2px] border-black rounded-[14px] p-3 flex flex-col items-start gap-2 hover:bg-black hover:text-white transition-all group shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]`}>
                                    <div className="text-black group-hover:text-white transition-colors">{l.icon}</div>
                                    <span className="text-[8px] font-black uppercase tracking-widest">{l.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Modal */}
            <Modal isOpen={postModal} onClose={() => setPostModal(false)} title="NEW POST">
                <form className="space-y-4" onSubmit={handlePublish}>
                    <textarea
                        className="w-full h-28 border-[2px] border-black rounded-xl p-3 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                        placeholder="Share an update, achievement, or question..."
                        required value={postContent} onChange={e => setPostContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPostModal(false)} type="button">DISCARD</Button>
                        <Button size="sm" type="submit">PUBLISH</Button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
};

export default StudentDashboard;
