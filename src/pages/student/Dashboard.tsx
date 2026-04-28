import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Briefcase, Brain, Mic, Users, Mail, CalendarIcon,
    ArrowUpRight, ChevronRight, Sparkles, Target,
    TrendingUp, MessageCircle, Bell, Star, Zap, Clock,
} from 'lucide-react';
import Feed from '../../components/Feed';
import PostBar from '../../components/PostBar';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const getDayInsight = (name: string, strength: number) => {
    if (strength < 40) return `${name}, your profile needs attention — complete it to unlock more opportunities.`;
    if (strength < 70) return `You're ${100 - strength}% away from a fully optimised profile. Let's close that gap.`;
    if (strength < 90) return `Strong profile, ${name}! Add your LinkedIn to reach 100%.`;
    return `Elite profile, ${name}. Your career journey is fully powered.`;
};

const motivationalQuotes = [
    'Success is the sum of small efforts, repeated day in and day out.',
    'Your career is a marathon, not a sprint. Keep building.',
    'Every expert was once a beginner. Keep showing up.',
    'The best investment you can make is in yourself.',
    'Opportunities multiply as they are seized.',
];

// ── Circular Progress Ring ────────────────────────────────────────────────────

const StrengthRing = ({ percent, size = 110 }: { percent: number; size?: number }) => {
    const strokeWidth = 7;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const timer = setTimeout(() => {
            setOffset(circumference - (percent / 100) * circumference);
        }, 300);
        return () => clearTimeout(timer);
    }, [percent, circumference]);

    const color = percent >= 80 ? '#6CBB56' : percent >= 50 ? '#1E499D' : '#f87171';

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="rotate-[-90deg]">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white leading-none">{percent}%</span>
                <span className="text-[7px] font-black text-white/50 uppercase tracking-widest mt-0.5">STRENGTH</span>
            </div>
        </div>
    );
};

// ── Animated Counter ──────────────────────────────────────────────────────────

const Counter = ({ end, suffix = '' }: { end: number; suffix?: string }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const obs = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !started.current) {
                started.current = true;
                let c = 0;
                const step = end / 30;
                const timer = setInterval(() => {
                    c += step;
                    if (c >= end) { setCount(end); clearInterval(timer); }
                    else setCount(Math.floor(c));
                }, 30);
            }
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [end]);

    return <span ref={ref}>{count}{suffix}</span>;
};

// ── Quick Action Card ─────────────────────────────────────────────────────────

const QuickAction = ({
    icon, label, desc, to, accent, onClick,
}: { icon: React.ReactNode; label: string; desc: string; to?: string; accent: string; onClick?: () => void }) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={onClick ?? (() => to && navigate(to))}
            className="group flex flex-col items-start gap-3 p-4 md:p-5 bg-white border-[2px] border-black rounded-[18px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all text-left w-full"
        >
            <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${accent} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <p className="font-black text-sm uppercase leading-none text-black group-hover:text-nile-blue transition-colors">{label}</p>
                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest mt-1 leading-relaxed">{desc}</p>
            </div>
        </button>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();

    const userName = user?.name || 'STUDENT';
    const firstName = userName.split(' ')[0];
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting = getGreeting();
    const quote = motivationalQuotes[new Date().getDay() % motivationalQuotes.length];
    const insight = getDayInsight(firstName, strength);

    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [pendingPost, setPendingPost] = useState<{ content: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [featuredJobIdx, setFeaturedJobIdx] = useState(0);

    const featuredJobs = [
        { company: 'Google Nigeria', role: 'Software Engineer Intern', type: 'REMOTE', match: 94 },
        { company: 'Shell Nigeria', role: 'Data Analyst', type: 'HYBRID', match: 88 },
        { company: 'Access Bank', role: 'Business Analyst', type: 'ONSITE', match: 81 },
    ];

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setFeaturedJobIdx(i => (i + 1) % featuredJobs.length), 4000);
        return () => clearInterval(interval);
    }, []);

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent.trim()) return;
        setPendingPost({ content: postContent });
        setPostContent('');
        setPostModalOpen(false);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 md:p-6 space-y-5 animate-pulse">
                    <div className="h-52 bg-nile-blue/20 rounded-[28px]" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-black/5 rounded-[16px]" />)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-black/5 rounded-[16px]" />)}
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        <div className="xl:col-span-8 h-96 bg-black/5 rounded-[24px]" />
                        <div className="xl:col-span-4 h-96 bg-black/5 rounded-[24px]" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const strengthColor = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-white' : 'text-red-300';
    const networkCount = 3;
    const appsCount = 0;

    return (
        <DashboardLayout>
            <div className="p-3 md:p-6 space-y-5 anime-fade-in font-sans max-w-[1200px] mx-auto pb-24 md:pb-8">

                {/* ── HERO ──────────────────────────────────────────────────── */}
                <section
                    className="relative rounded-[28px] overflow-hidden border-[2px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    style={{ background: 'linear-gradient(135deg, #0d1f47 0%, #1E499D 55%, #163880 100%)' }}
                >
                    {/* Ambient blobs */}
                    <div className="absolute top-0 right-1/3 w-64 h-64 bg-nile-green/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                    {/* NC logo watermark */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none hidden lg:block">
                        <NileConnectLogo size="2xl" showText={false} animated />
                    </div>

                    <div className="relative z-10 p-5 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">

                        {/* Left: Greeting */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="pulse-green" />
                                <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em]">LIVE SESSION</span>
                                <span className="ml-2 text-[8px] font-black text-white/30 uppercase tracking-widest">
                                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </span>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">{greeting},</p>
                                <h1 className="text-4xl md:text-6xl font-black text-white leading-none uppercase tracking-tighter">
                                    {firstName}<span className="text-nile-green">.</span>
                                </h1>
                            </div>

                            <p className="text-[10px] md:text-xs font-bold text-white/60 uppercase leading-relaxed max-w-sm">
                                {insight}
                            </p>

                            <blockquote className="border-l-2 border-nile-green/40 pl-3 text-[9px] font-bold text-white/40 italic leading-relaxed max-w-xs hidden md:block">
                                "{quote}"
                            </blockquote>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                    onClick={() => navigate('/student/jobs')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-nile-green text-white text-[9px] font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                                >
                                    <Briefcase size={12} strokeWidth={3} /> FIND JOBS
                                </button>
                                <button
                                    onClick={() => navigate('/student/career/ai')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl border-2 border-white/20 hover:bg-white/20 transition-all"
                                >
                                    <Brain size={12} strokeWidth={3} /> AI CAREER
                                </button>
                                <button
                                    onClick={() => navigate('/student/profile')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl border-2 border-white/20 hover:bg-white/20 transition-all"
                                >
                                    PROFILE
                                </button>
                            </div>
                        </div>

                        {/* Right: Stats panel */}
                        <div className="flex flex-row md:flex-col items-center gap-4 flex-shrink-0 w-full md:w-auto">
                            {/* Profile strength ring */}
                            <div className="flex flex-col items-center gap-3 bg-white/10 backdrop-blur border border-white/10 rounded-[22px] p-5">
                                <StrengthRing percent={strength} size={100} />
                                <div className="text-center space-y-1">
                                    <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">PROFILE</p>
                                    <button
                                        onClick={() => navigate('/student/profile/edit')}
                                        className="text-[8px] font-black text-nile-green uppercase tracking-widest hover:underline"
                                    >
                                        {strength < 100 ? 'COMPLETE →' : '✓ COMPLETE'}
                                    </button>
                                </div>
                            </div>

                            {/* Mini stat chips */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'APPS', val: appsCount, color: 'text-nile-green' },
                                    { label: 'NETWORK', val: networkCount, color: 'text-white' },
                                    { label: 'EVENTS', val: 2, color: 'text-yellow-300' },
                                    { label: 'JOBS', val: '150+', color: 'text-nile-green' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
                                        <p className={`text-sm font-black leading-none ${s.color}`}>{s.val}</p>
                                        <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickAction
                        icon={<Briefcase size={18} strokeWidth={2.5} className="text-white" />}
                        label="Job Board"
                        desc="150+ active roles"
                        to="/student/jobs"
                        accent="bg-nile-blue"
                    />
                    <QuickAction
                        icon={<Brain size={18} strokeWidth={2.5} className="text-white" />}
                        label="AI Career"
                        desc="CV analysis & advice"
                        to="/student/career/ai"
                        accent="bg-black"
                    />
                    <QuickAction
                        icon={<Mic size={18} strokeWidth={2.5} className="text-white" />}
                        label="Mock Interview"
                        desc="Practise with AI coach"
                        to="/student/career/mock-interview"
                        accent="bg-nile-green"
                    />
                    <QuickAction
                        icon={<Users size={18} strokeWidth={2.5} className="text-black" />}
                        label="Network"
                        desc="Connect & grow"
                        to="/student/network"
                        accent="bg-yellow-400"
                    />
                </div>

                {/* ── MAIN GRID ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pb-4">

                    {/* ── LEFT: Feed ──────────────────────────────────────── */}
                    <div className="xl:col-span-8 space-y-5">

                        {/* Post bar */}
                        <div className="border-[2px] border-dashed border-black rounded-[20px] bg-nile-white/60 p-1">
                            <PostBar onPostClick={() => setPostModalOpen(true)} />
                        </div>

                        {/* Feed section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-black">
                                    <ArrowUpRight size={14} className="text-nile-green" />
                                    COMMUNITY PULSE
                                </h3>
                                <button
                                    onClick={() => navigate('/student/feed')}
                                    className="text-[8px] font-black text-nile-blue uppercase tracking-widest hover:text-nile-green transition-colors flex items-center gap-1"
                                >
                                    VIEW ALL <ChevronRight size={10} strokeWidth={3} />
                                </button>
                            </div>
                            <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />
                        </div>
                    </div>

                    {/* ── RIGHT: Sidebar ───────────────────────────────────── */}
                    <div className="xl:col-span-4 space-y-4">

                        {/* Job Spotlight - rotating */}
                        <div className="bg-nile-blue text-white border-[2px] border-black rounded-[22px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Star size={13} className="text-yellow-300" fill="#fde047" />
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">JOB SPOTLIGHT</p>
                                </div>
                                <div className="flex gap-1">
                                    {featuredJobs.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 rounded-full transition-all ${i === featuredJobIdx ? 'w-4 bg-nile-green' : 'w-1 bg-white/20'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div key={featuredJobIdx} className="space-y-3 animate-in fade-in duration-500">
                                <div>
                                    <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">{featuredJobs[featuredJobIdx].company}</p>
                                    <h4 className="text-base font-black uppercase leading-tight mt-0.5">{featuredJobs[featuredJobIdx].role}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[7px] font-black px-2 py-0.5 bg-white/10 border border-white/20 rounded-full uppercase">
                                        {featuredJobs[featuredJobIdx].type}
                                    </span>
                                    <span className="flex items-center gap-1 text-[8px] font-black text-nile-green">
                                        <Target size={9} /> {featuredJobs[featuredJobIdx].match}% MATCH
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/student/jobs')}
                                className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                APPLY NOW <ArrowUpRight size={11} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Network Summary */}
                        <div className="bg-white border-[2px] border-black rounded-[22px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest">Network</h3>
                                <button
                                    onClick={() => navigate('/student/network')}
                                    className="text-[8px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors"
                                >
                                    SEE ALL →
                                </button>
                            </div>

                            {/* Avatar stack */}
                            <div className="flex items-center mb-4">
                                {['Mary Johnson', 'James Brown', 'Sophia Chen', 'Ahmad Garba'].map((n, i) => (
                                    <div
                                        key={n}
                                        className="w-9 h-9 rounded-full border-[2px] border-white overflow-hidden flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                                        style={{ marginLeft: i > 0 ? '-10px' : 0, zIndex: 4 - i }}
                                        title={n}
                                        onClick={() => navigate('/student/network')}
                                    >
                                        <Avatar name={n} size="sm" />
                                    </div>
                                ))}
                                <div className="w-9 h-9 rounded-full border-[2px] border-black bg-nile-white flex items-center justify-center flex-shrink-0 text-[8px] font-black text-black/50 cursor-pointer hover:bg-nile-blue hover:text-white transition-all" style={{ marginLeft: '-10px', zIndex: 0 }} onClick={() => navigate('/student/network')}>
                                    +8
                                </div>
                            </div>

                            <div className="space-y-2">
                                <MentorRow name="Mary Johnson" role="Career Advisor" onMail={() => navigate('/student/messages')} />
                                <MentorRow name="James Brown" role="Industry Mentor" onMail={() => navigate('/student/messages')} />
                            </div>
                            <button
                                onClick={() => navigate('/student/network')}
                                className="mt-4 w-full py-2.5 border-[2px] border-dashed border-black/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-black/40 hover:border-nile-blue hover:text-nile-blue transition-all flex items-center justify-center gap-2"
                            >
                                <Users size={11} strokeWidth={3} /> EXPAND NETWORK
                            </button>
                        </div>

                        {/* Upcoming */}
                        <div className="bg-white border-[2px] border-black rounded-[22px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest">Upcoming</h3>
                                <span className="text-[7px] font-black bg-nile-blue text-white px-2.5 py-1 rounded-full border border-black">
                                    {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase()}
                                </span>
                            </div>
                            <div className="space-y-0">
                                <EventRow time="9:45" title="Electronics Lesson" tag="CLASS" active />
                                <EventRow time="11:00" title="Resume Workshop" tag="CAREER" />
                                <EventRow time="14:00" title="Career Fair" tag="EVENT" />
                            </div>
                            <button
                                onClick={() => navigate('/student/events')}
                                className="mt-4 w-full py-2.5 bg-nile-white border-[2px] border-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <CalendarIcon size={11} strokeWidth={3} /> FULL CALENDAR
                            </button>
                        </div>

                        {/* AI Tip */}
                        <div className="bg-gradient-to-br from-nile-green/10 to-nile-blue/10 border-[2px] border-black rounded-[22px] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={14} className="text-nile-green" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-nile-blue">AI CAREER TIP</p>
                            </div>
                            <p className="text-[10px] font-bold text-black/70 leading-relaxed">
                                Add your LinkedIn URL to your profile to increase recruiter visibility by <strong className="text-nile-blue">3x</strong> and unlock job matching.
                            </p>
                            <button
                                onClick={() => navigate('/student/profile/edit')}
                                className="mt-3 text-[8px] font-black text-nile-green uppercase tracking-widest hover:underline flex items-center gap-1"
                            >
                                UPDATE NOW <ChevronRight size={10} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Modal */}
            <Modal isOpen={isPostModalOpen} onClose={() => setPostModalOpen(false)} title="NEW POST">
                <form className="space-y-5" onSubmit={handlePublish}>
                    <textarea
                        className="w-full h-32 border-[2px] border-black rounded-xl p-4 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                        placeholder="Share an update, achievement, or question with the Nile community..."
                        required
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPostModalOpen(false)} type="button">DISCARD</Button>
                        <Button variant="primary" size="sm" type="submit">PUBLISH</Button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const MentorRow = ({ name, role, onMail }: { name: string; role: string; onMail: () => void }) => (
    <div className="flex items-center justify-between p-3 bg-nile-white/60 border border-black/5 rounded-xl hover:bg-white hover:border-black transition-all group">
        <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={name} size="sm" />
            <div className="min-w-0">
                <p className="font-black text-[10px] uppercase truncate leading-none">{name}</p>
                <p className="text-[8px] font-black text-nile-blue/50 uppercase truncate mt-0.5">{role}</p>
            </div>
        </div>
        <button
            onClick={onMail}
            className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-nile-blue hover:text-white transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
            <Mail size={11} strokeWidth={3} />
        </button>
    </div>
);

const EventRow = ({ time, title, tag, active = false }: { time: string; title: string; tag: string; active?: boolean }) => (
    <div className={`flex items-center gap-3 py-3 border-b border-black/5 last:border-0 group cursor-pointer ${active ? 'text-nile-blue' : 'text-black/70'}`}>
        <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-0.5 ${active ? 'bg-nile-green animate-pulse' : 'bg-black/20'}`} />
        <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase truncate leading-none ${active ? 'text-nile-blue' : 'text-black'}`}>{title}</p>
            <p className="text-[7px] font-black text-black/30 uppercase tracking-widest mt-0.5">{time}</p>
        </div>
        <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full border uppercase flex-shrink-0 ${active ? 'bg-nile-blue text-white border-black' : 'bg-nile-white text-black/40 border-black/10'}`}>
            {tag}
        </span>
    </div>
);

export default StudentDashboard;
