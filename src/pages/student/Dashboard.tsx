import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Briefcase, Brain, Mic, Users, Mail, CalendarIcon,
    ArrowUpRight, ChevronRight, Sparkles, Target,
    Camera, Star, CheckCircle2, Loader2,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const getDayInsight = (strength: number) => {
    if (strength < 40) return 'Complete your profile to unlock job matches and recruiter visibility.';
    if (strength < 70) return `${100 - strength}% away from a fully optimised profile — keep going.`;
    if (strength < 90) return 'Add your LinkedIn & portfolio to reach 100% strength.';
    return 'Elite profile. You\'re fully set up for career success.';
};

const motivationalQuotes = [
    'Success is the sum of small efforts repeated daily.',
    'Your career is a marathon, not a sprint.',
    'Every expert was once a beginner. Keep showing up.',
    'The best investment you can make is in yourself.',
    'Opportunities multiply as they are seized.',
];

// ── SVG Strength Ring ─────────────────────────────────────────────────────────

const StrengthRing = ({ percent }: { percent: number }) => {
    const size = 84;
    const sw = 6;
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const [off, setOff] = useState(circ);

    useEffect(() => {
        const t = setTimeout(() => setOff(circ - (percent / 100) * circ), 300);
        return () => clearTimeout(t);
    }, [percent, circ]);

    const stroke = percent >= 80 ? '#6CBB56' : percent >= 50 ? '#1E499D' : '#ef4444';

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={stroke} strokeWidth={sw}
                    strokeDasharray={circ} strokeDashoffset={off}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-black leading-none">{percent}%</span>
                <span className="text-[6px] font-black text-black/40 uppercase tracking-widest mt-0.5">SCORE</span>
            </div>
        </div>
    );
};

// ── Quick Action Button ───────────────────────────────────────────────────────

const QuickAction = ({ icon, label, desc, to, accent }: {
    icon: React.ReactNode; label: string; desc: string; to: string; accent: string;
}) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            className="group flex flex-col items-start gap-2.5 p-4 bg-white border-[2px] border-black rounded-[18px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all text-left w-full"
        >
            <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${accent} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <p className="font-black text-xs uppercase leading-none text-black">{label}</p>
                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest mt-0.5">{desc}</p>
            </div>
        </button>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();
    const { picture, uploadPicture } = useProfilePicture();
    const { showToast } = useToast();

    const userName = user?.name || 'STUDENT';
    const firstName = userName.split(' ')[0];
    const userType = user?.type === 'alumni' ? 'ALUMNI' : 'STUDENT';
    const userDept = user?.department || user?.major || profile.major || 'NILE UNIVERSITY';
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting = getGreeting();
    const quote = motivationalQuotes[new Date().getDay() % motivationalQuotes.length];
    const insight = getDayInsight(strength);

    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [pendingPost, setPendingPost] = useState<{ content: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [featuredJobIdx, setFeaturedJobIdx] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const featuredJobs = [
        { company: 'Google Nigeria', role: 'Software Engineer Intern', type: 'REMOTE', match: 94 },
        { company: 'Shell Nigeria', role: 'Data Analyst', type: 'HYBRID', match: 88 },
        { company: 'Access Bank', role: 'Business Analyst', type: 'ONSITE', match: 81 },
    ];

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const iv = setInterval(() => setFeaturedJobIdx(i => (i + 1) % featuredJobs.length), 4000);
        return () => clearInterval(iv);
    }, []);

    const handlePictureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPic(true);
        try {
            await uploadPicture(file);
            showToast('Profile picture updated!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Upload failed', 'error');
        } finally {
            setUploadingPic(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent.trim()) return;
        setPendingPost({ content: postContent });
        setPostContent('');
        setPostModalOpen(false);
    };

    const strengthBg = strength >= 80 ? 'bg-nile-green/10 border-nile-green/20' : strength >= 50 ? 'bg-nile-blue/10 border-nile-blue/20' : 'bg-red-50 border-red-200';
    const strengthText = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-nile-blue' : 'text-red-500';

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 md:p-6 space-y-5 animate-pulse">
                    <div className="h-40 bg-black/5 rounded-[24px]" />
                    <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-black/5 rounded-[16px]"/>)}</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-3 md:p-6 space-y-4 anime-fade-in font-sans max-w-[1200px] mx-auto pb-24 md:pb-8">

                {/* ── HERO — clean white card ───────────────────────────── */}
                <section className="bg-white border-[2px] border-black rounded-[24px] shadow-[5px_5px_0px_0px_rgba(108,187,86,1)] overflow-hidden">

                    {/* Top strip */}
                    <div className="flex items-center justify-between px-5 md:px-7 pt-4 pb-3 border-b border-black/5">
                        <div className="flex items-center gap-2">
                            <div className="pulse-green" />
                            <span className="text-[8px] font-black text-nile-blue uppercase tracking-[0.25em]">LIVE SESSION</span>
                            <span className="text-[8px] font-black text-black/30 uppercase tracking-widest ml-1">
                                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
                            </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${strengthBg}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${strength >= 80 ? 'bg-nile-green' : strength >= 50 ? 'bg-nile-blue' : 'bg-red-400'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${strengthText}`}>
                                PROFILE {strength}%
                            </span>
                        </div>
                    </div>

                    {/* Main hero content */}
                    <div className="px-5 md:px-7 py-5 flex flex-col sm:flex-row items-start gap-5">

                        {/* ── Profile picture (left) ── */}
                        <div className="relative flex-shrink-0 self-start group">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[20px] border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {picture ? (
                                    <img src={picture} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-nile-blue">
                                        <span className="font-black text-white text-xl">{userName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Upload button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-nile-green border-2 border-white rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-all"
                                title="Change profile picture"
                            >
                                {uploadingPic ? <Loader2 size={12} className="text-white animate-spin" /> : <Camera size={12} className="text-white" />}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePictureSelect}
                            />
                        </div>

                        {/* ── Name + greeting + insight (center) ── */}
                        <div className="flex-1 min-w-0 space-y-3">
                            <div>
                                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.3em]">{greeting},</p>
                                <h1 className="text-3xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">
                                    {firstName}<span className="text-nile-green">.</span>
                                </h1>
                                <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">
                                    {userType} · {userDept}
                                </p>
                            </div>

                            <p className="text-[10px] font-bold text-black/60 leading-relaxed max-w-sm">
                                {insight}
                            </p>

                            <p className="text-[9px] font-bold text-black/30 italic leading-relaxed max-w-xs hidden md:block border-l-2 border-nile-green/30 pl-3">
                                "{quote}"
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                    onClick={() => navigate('/student/jobs')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-nile-green text-white text-[9px] font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                                >
                                    <Briefcase size={11} strokeWidth={3} /> FIND JOBS
                                </button>
                                <button
                                    onClick={() => navigate('/student/career/ai')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-nile-blue text-white text-[9px] font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                                >
                                    <Brain size={11} strokeWidth={3} /> AI CAREER
                                </button>
                                <button
                                    onClick={() => navigate('/student/profile/edit')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all"
                                >
                                    PROFILE
                                </button>
                            </div>
                        </div>

                        {/* ── Right: Strength + stats ── */}
                        <div className="flex flex-row sm:flex-col items-center gap-3 flex-shrink-0">
                            {/* Strength ring */}
                            <div className="flex flex-col items-center gap-1.5 p-4 bg-nile-white border-[2px] border-black rounded-[18px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <StrengthRing percent={strength} />
                                <p className="text-[7px] font-black text-black/40 uppercase tracking-widest">PROFILE</p>
                                <button
                                    onClick={() => navigate('/student/profile/edit')}
                                    className={`text-[7px] font-black uppercase tracking-widest ${strengthText} hover:underline`}
                                >
                                    {strength < 100 ? 'COMPLETE →' : '✓ DONE'}
                                </button>
                            </div>

                            {/* Mini stats */}
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { v: '0',    l: 'APPS',    c: 'text-black' },
                                    { v: '3',    l: 'NET',     c: 'text-nile-blue' },
                                    { v: '2',    l: 'EVENTS',  c: 'text-yellow-500' },
                                    { v: '150+', l: 'JOBS',    c: 'text-nile-green' },
                                ].map(s => (
                                    <div key={s.l} className="bg-nile-white border border-black/10 rounded-xl px-3 py-1.5 text-center hover:border-black transition-all cursor-pointer" onClick={() => navigate('/student')}>
                                        <p className={`text-sm font-black leading-none ${s.c}`}>{s.v}</p>
                                        <p className="text-[6px] font-black text-black/30 uppercase tracking-widest mt-0.5">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── QUICK ACTIONS ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickAction icon={<Briefcase size={17} strokeWidth={2.5} className="text-white" />} label="Job Board" desc="150+ active roles" to="/student/jobs" accent="bg-nile-blue" />
                    <QuickAction icon={<Brain size={17} strokeWidth={2.5} className="text-white" />} label="AI Career" desc="CV analysis & advice" to="/student/career/ai" accent="bg-black" />
                    <QuickAction icon={<Mic size={17} strokeWidth={2.5} className="text-white" />} label="Mock Interview" desc="Practice with AI coach" to="/student/career/mock-interview" accent="bg-nile-green" />
                    <QuickAction icon={<Users size={17} strokeWidth={2.5} className="text-black" />} label="Network" desc="Connect & grow" to="/student/network" accent="bg-yellow-400" />
                </div>

                {/* ── MAIN GRID ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pb-4">

                    {/* Left: Feed */}
                    <div className="xl:col-span-8 space-y-4">
                        <div className="border-[2px] border-dashed border-black rounded-[20px] bg-nile-white/60 p-1">
                            <PostBar onPostClick={() => setPostModalOpen(true)} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ArrowUpRight size={14} className="text-nile-green" /> COMMUNITY PULSE
                                </h3>
                                <button onClick={() => navigate('/student/feed')} className="text-[8px] font-black text-nile-blue uppercase tracking-widest hover:text-nile-green transition-colors flex items-center gap-1">
                                    VIEW ALL <ChevronRight size={10} strokeWidth={3} />
                                </button>
                            </div>
                            <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="xl:col-span-4 space-y-4">

                        {/* Job Spotlight */}
                        <div className="bg-nile-blue text-white border-[2px] border-black rounded-[22px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Star size={12} className="text-yellow-300" fill="#fde047" />
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">JOB SPOTLIGHT</p>
                                </div>
                                <div className="flex gap-1">
                                    {featuredJobs.map((_, i) => (
                                        <div key={i} className={`h-1 rounded-full transition-all ${i === featuredJobIdx ? 'w-4 bg-nile-green' : 'w-1 bg-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            <div key={featuredJobIdx} className="space-y-2 animate-in fade-in duration-500">
                                <p className="text-[8px] font-black text-white/50 uppercase">{featuredJobs[featuredJobIdx].company}</p>
                                <h4 className="text-sm font-black uppercase leading-tight">{featuredJobs[featuredJobIdx].role}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[7px] font-black px-2 py-0.5 bg-white/10 border border-white/20 rounded-full uppercase">{featuredJobs[featuredJobIdx].type}</span>
                                    <span className="flex items-center gap-1 text-[8px] font-black text-nile-green"><Target size={9} /> {featuredJobs[featuredJobIdx].match}% MATCH</span>
                                </div>
                            </div>
                            <button onClick={() => navigate('/student/jobs')} className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5">
                                APPLY NOW <ArrowUpRight size={11} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Network */}
                        <div className="bg-white border-[2px] border-black rounded-[22px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest">Network</h3>
                                <button onClick={() => navigate('/student/network')} className="text-[8px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors">SEE ALL →</button>
                            </div>
                            <div className="flex items-center mb-4">
                                {['Mary Johnson', 'James Brown', 'Sophia Chen', 'Ahmad Garba'].map((n, i) => (
                                    <div key={n} className="w-8 h-8 rounded-full border-[2px] border-white overflow-hidden flex-shrink-0 hover:scale-110 transition-transform cursor-pointer" style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 4 - i }} onClick={() => navigate('/student/network')}>
                                        <Avatar name={n} size="sm" />
                                    </div>
                                ))}
                                <div className="w-8 h-8 rounded-full border-[2px] border-black bg-nile-white flex items-center justify-center flex-shrink-0 text-[7px] font-black text-black/50 cursor-pointer hover:bg-nile-blue hover:text-white transition-all" style={{ marginLeft: '-8px', zIndex: 0 }} onClick={() => navigate('/student/network')}>+8</div>
                            </div>
                            <div className="space-y-2">
                                <MentorRow name="Mary Johnson" role="Career Advisor" onMail={() => navigate('/student/messages')} />
                                <MentorRow name="James Brown" role="Industry Mentor" onMail={() => navigate('/student/messages')} />
                            </div>
                            <button onClick={() => navigate('/student/network')} className="mt-4 w-full py-2 border-[2px] border-dashed border-black/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-black/40 hover:border-nile-blue hover:text-nile-blue transition-all flex items-center justify-center gap-1.5">
                                <Users size={11} strokeWidth={3} /> EXPAND NETWORK
                            </button>
                        </div>

                        {/* Upcoming */}
                        <div className="bg-white border-[2px] border-black rounded-[22px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest">Upcoming</h3>
                                <span className="text-[7px] font-black bg-nile-blue text-white px-2 py-0.5 rounded-full border border-black">
                                    {new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'}).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <EventRow time="9:45" title="Electronics Lesson" tag="CLASS" active />
                                <EventRow time="11:00" title="Resume Workshop" tag="CAREER" />
                                <EventRow time="14:00" title="Career Fair" tag="EVENT" />
                            </div>
                            <button onClick={() => navigate('/student/events')} className="mt-3 w-full py-2 bg-nile-white border-[2px] border-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-1.5">
                                <CalendarIcon size={11} strokeWidth={3} /> FULL CALENDAR
                            </button>
                        </div>

                        {/* AI Tip */}
                        <div className="bg-gradient-to-br from-nile-green/10 to-nile-blue/10 border-[2px] border-black rounded-[22px] p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={13} className="text-nile-green" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-nile-blue">AI CAREER TIP</p>
                            </div>
                            <p className="text-[10px] font-bold text-black/70 leading-relaxed">
                                Add your LinkedIn URL to increase recruiter visibility by <strong className="text-nile-blue">3×</strong> and unlock AI job matching.
                            </p>
                            <button onClick={() => navigate('/student/profile/edit')} className="mt-2 text-[8px] font-black text-nile-green uppercase tracking-widest hover:underline flex items-center gap-1">
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
                        required value={postContent} onChange={e => setPostContent(e.target.value)}
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

// ── Sub-components ─────────────────────────────────────────────────────────────

const MentorRow = ({ name, role, onMail }: { name: string; role: string; onMail: () => void }) => (
    <div className="flex items-center justify-between p-3 bg-nile-white/60 border border-black/5 rounded-xl hover:bg-white hover:border-black transition-all group">
        <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={name} size="sm" />
            <div className="min-w-0">
                <p className="font-black text-[10px] uppercase truncate leading-none">{name}</p>
                <p className="text-[8px] font-black text-nile-blue/50 uppercase truncate mt-0.5">{role}</p>
            </div>
        </div>
        <button onClick={onMail} className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-nile-blue hover:text-white transition-all flex-shrink-0 opacity-0 group-hover:opacity-100">
            <Mail size={11} strokeWidth={3} />
        </button>
    </div>
);

const EventRow = ({ time, title, tag, active = false }: { time: string; title: string; tag: string; active?: boolean }) => (
    <div className={`flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0 cursor-pointer`}>
        <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-0.5 ${active ? 'bg-nile-green animate-pulse' : 'bg-black/20'}`} />
        <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase truncate leading-none ${active ? 'text-nile-blue' : 'text-black'}`}>{title}</p>
            <p className="text-[7px] font-black text-black/30 uppercase tracking-widest mt-0.5">{time}</p>
        </div>
        <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full border uppercase flex-shrink-0 ${active ? 'bg-nile-blue text-white border-black' : 'bg-nile-white text-black/40 border-black/10'}`}>{tag}</span>
    </div>
);

export default StudentDashboard;
