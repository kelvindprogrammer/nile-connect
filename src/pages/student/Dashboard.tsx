import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Briefcase, Brain, Mic, Users, Mail, CalendarIcon,
    ChevronRight, Sparkles, Camera, Loader2, TrendingUp,
    BookOpen, ArrowUpRight,
} from 'lucide-react';
import Feed from '../../components/Feed';
import PostBar from '../../components/PostBar';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { useToast } from '../../context/ToastContext';

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5)  return 'Late Night';
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

// Animated SVG ring for profile strength
const Ring = ({ pct, size = 72 }: { pct: number; size?: number }) => {
    const sw = 4.5;
    const r  = (size - sw) / 2;
    const c  = 2 * Math.PI * r;
    const [off, setOff] = useState(c);
    useEffect(() => {
        const t = setTimeout(() => setOff(c - (pct / 100) * c), 400);
        return () => clearTimeout(t);
    }, [pct, c]);
    const color = pct >= 80 ? '#6CBB56' : pct >= 50 ? '#1E499D' : '#ef4444';
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={sw} />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
                    strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[13px] font-black leading-none">{pct}<span className="text-[8px]">%</span></span>
                <span className="text-[6px] font-black tracking-widest" style={{ color }}>
                    {pct >= 80 ? 'ELITE' : pct >= 50 ? 'GOOD' : 'BUILD'}
                </span>
            </div>
        </div>
    );
};

interface Event { id: string; title: string; category: string; date: string; time: string; }

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { picture, uploadPicture } = useProfilePicture();
    const { showToast } = useToast();

    const firstName = (user?.name || 'STUDENT').split(' ')[0];
    const userDept  = profile.major || user?.major || 'NILE UNIVERSITY';
    const strength  = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting  = getGreeting();

    const [appCount,   setAppCount]   = useState<number | null>(null);
    const [jobCount,   setJobCount]   = useState<number | null>(null);
    const [events,     setEvents]     = useState<Event[]>([]);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [postModal,    setPostModal]    = useState(false);
    const [postContent,  setPostContent]  = useState('');
    const [pendingPost,  setPendingPost]  = useState<{ content: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        Promise.allSettled([
            apiClient.get<any>('/api/student/applications'),
            apiClient.get<any>('/api/jobs'),
            apiClient.get<any>('/api/events'),
        ]).then(([appsR, jobsR, eventsR]) => {
            if (appsR.status === 'fulfilled') {
                const apps = appsR.value.data?.data?.applications ?? [];
                setAppCount(Array.isArray(apps) ? apps.length : 0);
            }
            if (jobsR.status === 'fulfilled') {
                setJobCount((jobsR.value.data?.data?.jobs ?? []).length);
            }
            if (eventsR.status === 'fulfilled') {
                setEvents((eventsR.value.data?.data?.events ?? []).slice(0, 3));
            }
        });
    }, []);

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
    };

    const sColor = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-nile-blue' : 'text-red-500';

    return (
        <DashboardLayout>
            <div className="p-3 md:p-5 pb-28 md:pb-6 space-y-4 anime-fade-in font-sans max-w-[1280px] mx-auto">

                {/* ── HERO ──────────────────────────────────────────────── */}
                <div className="bg-white border-[2px] border-black rounded-[22px] shadow-[5px_5px_0px_0px_rgba(108,187,86,0.7)] overflow-hidden">

                    {/* Status bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-nile-white/50">
                        <div className="flex items-center gap-2">
                            <span className="pulse-green w-2 h-2 flex-shrink-0" />
                            <span className="text-[7px] font-black text-nile-blue uppercase tracking-[0.25em]">LIVE</span>
                            <span className="text-[7px] font-black text-black/20 uppercase hidden sm:block">
                                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                            </span>
                        </div>
                        <div className={`text-[7px] font-black px-2.5 py-1 rounded-full uppercase ${strength >= 80 ? 'bg-nile-green/10 text-nile-green' : strength >= 50 ? 'bg-nile-blue/10 text-nile-blue' : 'bg-red-50 text-red-500'}`}>
                            PROFILE {strength}%
                        </div>
                    </div>

                    {/* Main row */}
                    <div className="flex items-center gap-4 md:gap-5 px-4 md:px-6 py-4">

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-[68px] h-[68px] md:w-[84px] md:h-[84px] rounded-[18px] border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-nile-blue">
                                {picture
                                    ? <img src={picture} alt={firstName} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center">
                                        <span className="font-black text-white text-2xl">{(user?.name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                                      </div>}
                            </div>
                            <button onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-nile-green border-[2px] border-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow">
                                {uploadingPic ? <Loader2 size={10} className="text-white animate-spin" /> : <Camera size={10} className="text-white" />}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicSelect} />
                        </div>

                        {/* Greeting */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black text-black/30 uppercase tracking-[0.2em]">{greeting},</p>
                            <h1 className="text-3xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter mt-0.5">
                                {firstName}<span className="text-nile-green">.</span>
                            </h1>
                            <p className="text-[8px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">{userDept}</p>
                        </div>

                        {/* Ring + stats */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex flex-col items-center gap-1">
                                <Ring pct={strength} />
                                <button onClick={() => navigate('/student/profile/edit')}
                                    className={`text-[6px] font-black uppercase tracking-widest hover:underline ${sColor}`}>
                                    {strength < 100 ? 'COMPLETE →' : '✓ DONE'}
                                </button>
                            </div>

                            <div className="hidden sm:grid grid-cols-2 gap-1.5">
                                {[
                                    { v: appCount ?? '—', l: 'APPS',   c: 'text-black',       to: '/student/applications' },
                                    { v: jobCount ?? '—', l: 'JOBS',   c: 'text-nile-green',  to: '/student/jobs' },
                                    { v: events.length || '—', l: 'EVENTS', c: 'text-yellow-500', to: '/student/events' },
                                    { v: '—',             l: 'NETWORK', c: 'text-nile-blue',  to: '/student/network' },
                                ].map(s => (
                                    <button key={s.l} onClick={() => navigate(s.to)}
                                        className="bg-nile-white border border-black/10 rounded-xl px-3 py-2 text-center min-w-[52px] hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-px active:translate-y-px">
                                        <p className={`text-sm font-black leading-none ${s.c}`}>{s.v}</p>
                                        <p className="text-[6px] font-black text-black/30 uppercase tracking-widest mt-0.5">{s.l}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 px-4 md:px-6 pb-4">
                        {[
                            { to: '/student/jobs',               label: 'JOBS',       icon: <Briefcase size={11} strokeWidth={3} />, cls: 'bg-nile-blue text-white border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' },
                            { to: '/student/career/ai',          label: 'AI CAREER',  icon: <Brain size={11} strokeWidth={3} />,     cls: 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' },
                            { to: '/student/career/mock-interview', label: 'PRACTICE', icon: <Mic size={11} strokeWidth={3} />,      cls: 'bg-nile-green text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' },
                            { to: '/student/network',            label: 'NETWORK',    icon: <Users size={11} strokeWidth={3} />,     cls: 'bg-white text-black border-black hover:bg-black hover:text-white' },
                        ].map(a => (
                            <button key={a.to} onClick={() => navigate(a.to)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-[2px] font-black text-[8px] uppercase tracking-wider transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none ${a.cls}`}>
                                {a.icon} {a.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── QUICK ACCESS TILES ────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: <Briefcase size={18} className="text-white" />,  label: 'Job Board',    sub: `${jobCount ?? '…'} active`,   to: '/student/jobs',                  bg: 'bg-nile-blue',  sh: 'shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]' },
                        { icon: <Brain size={18} className="text-white" />,       label: 'AI Counselor', sub: 'Smart advice',                 to: '/student/career/ai',             bg: 'bg-black',      sh: 'shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]' },
                        { icon: <Mic size={18} className="text-white" />,         label: 'Mock Interview',sub: 'AI practice',                 to: '/student/career/mock-interview', bg: 'bg-nile-green', sh: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
                        { icon: <BookOpen size={18} className="text-black" />,    label: 'Learning Path',sub: 'Skill up',                     to: '/student/career/learning',       bg: 'bg-yellow-400', sh: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
                    ].map(a => (
                        <button key={a.label} onClick={() => navigate(a.to)}
                            className={`flex items-center gap-3 p-4 bg-white border-[2px] border-black rounded-[18px] text-left group hover:-translate-y-[2px] transition-all ${a.sh}`}>
                            <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-110 transition-transform`}>
                                {a.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-xs uppercase text-black truncate leading-none">{a.label}</p>
                                <p className="text-[8px] font-bold text-black/30 uppercase tracking-wider mt-1">{a.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── MAIN 2-COL ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

                    {/* Feed */}
                    <div className="xl:col-span-8 space-y-3">
                        <div className="border-[2px] border-dashed border-black/10 rounded-[18px] bg-white/60 p-1">
                            <PostBar onPostClick={() => setPostModal(true)} />
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">COMMUNITY FEED</h3>
                            <button onClick={() => navigate('/student/feed')}
                                className="text-[8px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors flex items-center gap-0.5">
                                ALL <ChevronRight size={9} strokeWidth={3} />
                            </button>
                        </div>
                        <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />
                    </div>

                    {/* Sidebar */}
                    <div className="xl:col-span-4 space-y-3">

                        {/* Profile Strength */}
                        <div className="bg-white border-[2px] border-black rounded-[20px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <TrendingUp size={12} className="text-nile-blue" /> Readiness
                                </h3>
                                <button onClick={() => navigate('/student/profile/edit')} className={`text-[7px] font-black uppercase ${sColor} hover:underline`}>IMPROVE →</button>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { label: 'Profile',      pct: strength,                              c: '#1E499D' },
                                    { label: 'Applications', pct: Math.min((appCount ?? 0) * 20, 100),   c: '#6CBB56' },
                                    { label: 'Skills',       pct: profile.skills?.length > 0 ? 80 : 20, c: '#f59e0b' },
                                ].map(m => (
                                    <div key={m.label}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[8px] font-black text-black/40 uppercase">{m.label}</span>
                                            <span className="text-[8px] font-black" style={{ color: m.c }}>{m.pct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${m.pct}%`, background: m.c }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white border-[2px] border-black rounded-[20px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <CalendarIcon size={12} className="text-nile-blue" /> Events
                                </h3>
                                <button onClick={() => navigate('/student/events')} className="text-[7px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors">SEE ALL →</button>
                            </div>
                            {events.length === 0 ? (
                                <p className="text-[8px] font-black text-black/20 uppercase py-4 text-center">No upcoming events</p>
                            ) : events.map((ev, i) => (
                                <div key={ev.id} className="flex items-center gap-2.5 py-2.5 border-b border-black/5 last:border-0">
                                    <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-0.5 ${i === 0 ? 'bg-nile-green animate-pulse' : 'bg-black/15'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase truncate">{ev.title}</p>
                                        <p className="text-[7px] font-black text-black/25 uppercase mt-0.5">
                                            {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            {ev.time ? ` · ${ev.time}` : ''}
                                        </p>
                                    </div>
                                    <span className="text-[6px] font-black px-1.5 py-0.5 bg-nile-white border border-black/10 rounded-full uppercase flex-shrink-0">
                                        {ev.category?.slice(0, 5) || 'EVENT'}
                                    </span>
                                </div>
                            ))}
                            <button onClick={() => navigate('/student/events')}
                                className="mt-2 w-full py-2 bg-nile-white border-[2px] border-black rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                                FULL CALENDAR
                            </button>
                        </div>

                        {/* Quick links */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { label: 'Messages',    to: '/student/messages',     icon: <Mail size={15} />,        cls: 'hover:bg-nile-blue hover:text-white hover:border-nile-blue' },
                                { label: 'Applications',to: '/student/applications', icon: <TrendingUp size={15} />,  cls: 'hover:bg-nile-green hover:text-white hover:border-nile-green' },
                                { label: 'Network',     to: '/student/network',      icon: <Users size={15} />,       cls: 'hover:bg-black hover:text-white hover:border-black' },
                                { label: 'AI Session',  to: '/student/career',       icon: <Sparkles size={15} />,   cls: 'hover:bg-nile-blue hover:text-white hover:border-nile-blue' },
                            ].map(l => (
                                <button key={l.label} onClick={() => navigate(l.to)}
                                    className={`bg-white border-[2px] border-black rounded-[14px] p-3 flex flex-col gap-2 group transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.08)] hover:shadow-none hover:translate-x-px hover:translate-y-px ${l.cls}`}>
                                    <div className="group-hover:scale-110 transition-transform">{l.icon}</div>
                                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">{l.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* AI tip */}
                        <div className="bg-gradient-to-br from-nile-blue/5 to-nile-green/5 border-[2px] border-black/8 rounded-[20px] p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={11} className="text-nile-green" />
                                <span className="text-[7px] font-black uppercase tracking-widest text-nile-blue">AI TIP</span>
                            </div>
                            <p className="text-[9px] font-bold text-black/60 leading-relaxed">
                                Profiles with LinkedIn get <strong className="text-nile-blue">3×</strong> more recruiter views. Add yours now.
                            </p>
                            <button onClick={() => navigate('/student/career/ai')}
                                className="mt-2 text-[7px] font-black text-nile-green uppercase tracking-widest hover:underline flex items-center gap-0.5">
                                ASK AI <ArrowUpRight size={9} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={postModal} onClose={() => setPostModal(false)} title="NEW POST">
                <form onSubmit={handlePublish} className="space-y-4">
                    <textarea
                        className="w-full h-28 border-[2px] border-black rounded-xl p-3 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                        placeholder="Share an update, achievement, or question..."
                        required value={postContent} onChange={e => setPostContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setPostModal(false)}>DISCARD</Button>
                        <Button size="sm" type="submit">PUBLISH</Button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
};

export default StudentDashboard;
