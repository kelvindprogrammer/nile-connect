import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Briefcase, Brain, Mic, Users, Mail, CalendarIcon,
    ArrowUpRight, ChevronRight, Sparkles, Target,
    Camera, Star, Loader2,
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
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
};

const getDayInsight = (strength: number) => {
    if (strength < 40) return 'Complete your profile to unlock job matches.';
    if (strength < 70) return `${100 - strength}% away from a full profile — keep going.`;
    if (strength < 90) return 'Add LinkedIn & portfolio to reach 100%.';
    return 'Elite profile. Fully set up for career success.';
};

const quotes = [
    'Success is the sum of small efforts repeated daily.',
    'Your career is a marathon, not a sprint.',
    'Every expert was once a beginner.',
    'The best investment is in yourself.',
    'Opportunities multiply as they are seized.',
];

// ── Compact Strength Ring ─────────────────────────────────────────────────────

const Ring = ({ pct, size = 64 }: { pct: number; size?: number }) => {
    const sw = 5, r = (size - sw) / 2, c = 2 * Math.PI * r;
    const [off, setOff] = useState(c);
    useEffect(() => { const t = setTimeout(() => setOff(c - (pct / 100) * c), 350); return () => clearTimeout(t); }, [pct, c]);
    const color = pct >= 80 ? '#6CBB56' : pct >= 50 ? '#1E499D' : '#ef4444';
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#efefef" strokeWidth={sw} />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
                    strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-black text-black leading-none">{pct}%</span>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { picture, uploadPicture } = useProfilePicture();
    const { showToast } = useToast();

    const userName = user?.name || 'STUDENT';
    const firstName = userName.split(' ')[0];
    const userType = user?.type === 'alumni' ? 'ALUMNI' : 'STUDENT';
    const userDept = profile.major || user?.major || user?.department || 'NILE UNIVERSITY';
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting = getGreeting();
    const quote = quotes[new Date().getDay() % quotes.length];
    const insight = getDayInsight(strength);

    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [pendingPost, setPendingPost] = useState<{ content: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [jobIdx, setJobIdx] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);

    const jobs = [
        { company: 'Google Nigeria', role: 'Software Engineer Intern', type: 'REMOTE', match: 94 },
        { company: 'Shell Nigeria', role: 'Data Analyst', type: 'HYBRID', match: 88 },
        { company: 'Access Bank', role: 'Business Analyst', type: 'ONSITE', match: 81 },
    ];

    useEffect(() => { const t = setTimeout(() => setIsLoading(false), 250); return () => clearTimeout(t); }, []);
    useEffect(() => { const iv = setInterval(() => setJobIdx(i => (i+1) % jobs.length), 4000); return () => clearInterval(iv); }, []);

    const handlePicSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setUploadingPic(true);
        try { await uploadPicture(f); showToast('Photo updated!', 'success'); }
        catch (err: any) { showToast(err.message || 'Upload failed', 'error'); }
        finally { setUploadingPic(false); if (fileRef.current) fileRef.current.value = ''; }
    };

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault(); if (!postContent.trim()) return;
        setPendingPost({ content: postContent }); setPostContent(''); setPostModalOpen(false);
    };

    const sColor = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-nile-blue' : 'text-red-500';
    const sBadgeBg = strength >= 80 ? 'bg-nile-green/10 border-nile-green/30 text-nile-green' : strength >= 50 ? 'bg-nile-blue/10 border-nile-blue/30 text-nile-blue' : 'bg-red-50 border-red-200 text-red-500';

    if (isLoading) return (
        <DashboardLayout>
            <div className="p-4 space-y-4 animate-pulse">
                <div className="h-28 bg-black/5 rounded-[20px]" />
                <div className="h-12 bg-black/5 rounded-[16px]" />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="p-3 md:p-5 space-y-3 anime-fade-in font-sans max-w-[1200px] mx-auto pb-24 md:pb-6">

                {/* ── HERO — tight compact card ─────────────────────────── */}
                <section className="bg-white border-[2px] border-black rounded-[20px] shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] overflow-hidden">

                    {/* Micro top bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-nile-white/50">
                        <div className="flex items-center gap-2">
                            <div className="pulse-green" />
                            <span className="text-[7px] font-black text-nile-blue uppercase tracking-[0.2em]">LIVE SESSION</span>
                            <span className="text-[7px] font-black text-black/25 uppercase ml-1">
                                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                            </span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[7px] font-black uppercase ${sBadgeBg}`}>
                            <div className={`w-1 h-1 rounded-full ${strength >= 80 ? 'bg-nile-green' : strength >= 50 ? 'bg-nile-blue' : 'bg-red-400'}`} />
                            PROFILE {strength}%
                        </div>
                    </div>

                    {/* Main content row */}
                    <div className="flex items-center gap-5 px-5 py-4">

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[16px] border-[2px] border-black overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                {picture
                                    ? <img src={picture} alt={userName} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-nile-blue flex items-center justify-center"><span className="font-black text-white text-lg">{userName.split(' ').map(n=>n[0]).join('').slice(0,2)}</span></div>}
                            </div>
                            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-nile-green border-2 border-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-sm">
                                {uploadingPic ? <Loader2 size={11} className="text-white animate-spin" /> : <Camera size={11} className="text-white" />}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicSelect} />
                        </div>

                        {/* Name + info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-black/35 uppercase tracking-widest">Good {greeting},</p>
                            <h1 className="text-2xl md:text-3xl font-black text-black leading-none uppercase tracking-tighter">
                                {firstName}<span className="text-nile-green">.</span>
                            </h1>
                            <p className="text-[8px] font-black text-nile-blue/50 uppercase tracking-widest mt-0.5">
                                {userType} · {userDept}
                            </p>
                            <p className="text-[10px] font-bold text-black/50 leading-snug mt-1.5 hidden sm:block max-w-sm">{insight}</p>
                        </div>

                        {/* Right: ring + stats */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Ring */}
                            <div className="flex flex-col items-center gap-1">
                                <Ring pct={strength} size={68} />
                                <button onClick={() => navigate('/student/profile/edit')} className={`text-[7px] font-black uppercase tracking-widest ${sColor} hover:underline`}>
                                    {strength < 100 ? 'COMPLETE →' : '✓ DONE'}
                                </button>
                            </div>
                            {/* Stats 2×2 */}
                            <div className="hidden sm:grid grid-cols-2 gap-1.5">
                                {[
                                    { v:'0',    l:'APPS',   c:'text-black' },
                                    { v:'3',    l:'NET',    c:'text-nile-blue' },
                                    { v:'2',    l:'EVENTS', c:'text-yellow-500' },
                                    { v:'150+', l:'JOBS',   c:'text-nile-green' },
                                ].map(s => (
                                    <div key={s.l} className="bg-nile-white border border-black/10 rounded-xl px-3 py-1.5 text-center min-w-[50px]">
                                        <p className={`text-sm font-black leading-none ${s.c}`}>{s.v}</p>
                                        <p className="text-[6px] font-black text-black/30 uppercase tracking-widest mt-0.5">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center gap-2 px-5 pb-4">
                        <button onClick={() => navigate('/student/jobs')} className="flex items-center gap-1.5 px-4 py-2 bg-nile-green text-white text-[9px] font-black uppercase tracking-wider rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                            <Briefcase size={12} strokeWidth={3} /> FIND JOBS
                        </button>
                        <button onClick={() => navigate('/student/career/ai')} className="flex items-center gap-1.5 px-4 py-2 bg-nile-blue text-white text-[9px] font-black uppercase tracking-wider rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                            <Brain size={12} strokeWidth={3} /> AI CAREER
                        </button>
                        <button onClick={() => navigate('/student/profile/edit')} className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-wider rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all">
                            PROFILE
                        </button>
                        <p className="hidden lg:block text-[9px] font-bold text-black/25 italic ml-2 truncate">"{quote}"</p>
                    </div>
                </section>

                {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: <Briefcase size={17} strokeWidth={2.5} className="text-white" />, label:'Job Board',       desc:'150+ active roles', to:'/student/jobs',                   bg:'bg-nile-blue' },
                        { icon: <Brain     size={17} strokeWidth={2.5} className="text-white" />, label:'AI Career',       desc:'CV analysis & advice', to:'/student/career/ai',           bg:'bg-black' },
                        { icon: <Mic       size={17} strokeWidth={2.5} className="text-white" />, label:'Mock Interview',  desc:'Practice with AI', to:'/student/career/mock-interview',  bg:'bg-nile-green' },
                        { icon: <Users     size={17} strokeWidth={2.5} className="text-black" />, label:'Network',         desc:'Connect & grow',    to:'/student/network',               bg:'bg-yellow-400' },
                    ].map(a => (
                        <button key={a.label} onClick={() => navigate(a.to)}
                            className="flex items-center gap-3 p-4 bg-white border-[2px] border-black rounded-[16px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all text-left group"
                        >
                            <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-105 transition-transform`}>{a.icon}</div>
                            <div className="min-w-0">
                                <p className="font-black text-xs uppercase leading-none text-black">{a.label}</p>
                                <p className="text-[8px] font-bold text-black/35 uppercase tracking-wider mt-1">{a.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── MAIN GRID ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

                    {/* Feed column */}
                    <div className="xl:col-span-8 space-y-3">
                        <div className="border-[2px] border-dashed border-black rounded-[18px] bg-nile-white/50 p-1">
                            <PostBar onPostClick={() => setPostModalOpen(true)} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <ArrowUpRight size={12} className="text-nile-green" /> COMMUNITY PULSE
                                </h3>
                                <button onClick={() => navigate('/student/feed')} className="text-[8px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors flex items-center gap-0.5">
                                    VIEW ALL <ChevronRight size={9} strokeWidth={3} />
                                </button>
                            </div>
                            <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="xl:col-span-4 space-y-3">

                        {/* Job Spotlight */}
                        <div className="bg-nile-blue text-white border-[2px] border-black rounded-[18px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <Star size={11} className="text-yellow-300" fill="#fde047" />
                                    <p className="text-[7px] font-black uppercase tracking-widest opacity-60">JOB SPOTLIGHT</p>
                                </div>
                                <div className="flex gap-1">{jobs.map((_,i) => <div key={i} className={`h-1 rounded-full transition-all ${i===jobIdx?'w-3 bg-nile-green':'w-1 bg-white/20'}`}/>)}</div>
                            </div>
                            <div key={jobIdx} className="space-y-1.5 animate-in fade-in duration-500">
                                <p className="text-[7px] font-black text-white/50 uppercase">{jobs[jobIdx].company}</p>
                                <h4 className="text-sm font-black uppercase leading-tight">{jobs[jobIdx].role}</h4>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[7px] font-black px-2 py-0.5 bg-white/10 border border-white/20 rounded-full uppercase">{jobs[jobIdx].type}</span>
                                    <span className="flex items-center gap-1 text-[7px] font-black text-nile-green"><Target size={8}/> {jobs[jobIdx].match}% MATCH</span>
                                </div>
                            </div>
                            <button onClick={() => navigate('/student/jobs')} className="mt-3 w-full py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1">
                                APPLY NOW <ArrowUpRight size={10} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Network */}
                        <div className="bg-white border-[2px] border-black rounded-[18px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[9px] font-black uppercase tracking-widest">Network</h3>
                                <button onClick={() => navigate('/student/network')} className="text-[7px] font-black text-nile-blue uppercase hover:text-nile-green transition-colors">SEE ALL →</button>
                            </div>
                            <div className="flex items-center mb-3">
                                {['Mary Johnson','James Brown','Sophia Chen','Ahmad Garba'].map((n,i) => (
                                    <div key={n} className="w-7 h-7 rounded-full border-[2px] border-white overflow-hidden flex-shrink-0 hover:scale-110 transition-transform cursor-pointer" style={{marginLeft:i>0?'-7px':0,zIndex:4-i}} onClick={() => navigate('/student/network')}>
                                        <Avatar name={n} size="sm" />
                                    </div>
                                ))}
                                <div className="w-7 h-7 rounded-full border-[2px] border-black bg-nile-white flex items-center justify-center text-[6px] font-black text-black/40 cursor-pointer hover:bg-nile-blue hover:text-white transition-all" style={{marginLeft:'-7px',zIndex:0}} onClick={() => navigate('/student/network')}>+8</div>
                            </div>
                            <div className="space-y-1.5">
                                <MentorRow name="Mary Johnson" role="Career Advisor" onMail={() => navigate('/student/messages')} />
                                <MentorRow name="James Brown" role="Industry Mentor" onMail={() => navigate('/student/messages')} />
                            </div>
                            <button onClick={() => navigate('/student/network')} className="mt-3 w-full py-1.5 border-[2px] border-dashed border-black/15 rounded-xl text-[8px] font-black uppercase tracking-widest text-black/35 hover:border-nile-blue hover:text-nile-blue transition-all flex items-center justify-center gap-1">
                                <Users size={10} strokeWidth={3} /> EXPAND NETWORK
                            </button>
                        </div>

                        {/* Upcoming */}
                        <div className="bg-white border-[2px] border-black rounded-[18px] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-2.5">
                                <h3 className="text-[9px] font-black uppercase tracking-widest">Upcoming</h3>
                                <span className="text-[6px] font-black bg-nile-blue text-white px-2 py-0.5 rounded-full border border-black">
                                    {new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'}).toUpperCase()}
                                </span>
                            </div>
                            <EventRow time="9:45" title="Electronics Lesson" tag="CLASS" active />
                            <EventRow time="11:00" title="Resume Workshop" tag="CAREER" />
                            <EventRow time="14:00" title="Career Fair" tag="EVENT" />
                            <button onClick={() => navigate('/student/events')} className="mt-2.5 w-full py-1.5 bg-nile-white border-[2px] border-black rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-1">
                                <CalendarIcon size={10} strokeWidth={3} /> FULL CALENDAR
                            </button>
                        </div>

                        {/* AI tip */}
                        <div className="bg-gradient-to-br from-nile-green/8 to-nile-blue/8 border-[2px] border-black/8 rounded-[18px] p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles size={11} className="text-nile-green" />
                                <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue">AI TIP</p>
                            </div>
                            <p className="text-[9px] font-bold text-black/65 leading-relaxed">
                                Add your LinkedIn to increase recruiter visibility by <strong className="text-nile-blue">3×</strong>.
                            </p>
                            <button onClick={() => navigate('/student/profile/edit')} className="mt-1.5 text-[7px] font-black text-nile-green uppercase tracking-widest hover:underline flex items-center gap-0.5">
                                UPDATE <ChevronRight size={9} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isPostModalOpen} onClose={() => setPostModalOpen(false)} title="NEW POST">
                <form className="space-y-4" onSubmit={handlePublish}>
                    <textarea
                        className="w-full h-28 border-[2px] border-black rounded-xl p-3 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                        placeholder="Share an update, achievement, or question..."
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
    <div className="flex items-center justify-between p-2.5 bg-nile-white/60 border border-black/5 rounded-xl hover:bg-white hover:border-black transition-all group cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
            <Avatar name={name} size="sm" />
            <div className="min-w-0">
                <p className="font-black text-[9px] uppercase truncate leading-none">{name}</p>
                <p className="text-[7px] font-black text-nile-blue/45 uppercase truncate mt-0.5">{role}</p>
            </div>
        </div>
        <button onClick={onMail} className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-nile-blue hover:text-white transition-all flex-shrink-0 opacity-0 group-hover:opacity-100">
            <Mail size={10} strokeWidth={3} />
        </button>
    </div>
);

const EventRow = ({ time, title, tag, active = false }: { time: string; title: string; tag: string; active?: boolean }) => (
    <div className="flex items-center gap-2.5 py-2 border-b border-black/5 last:border-0">
        <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${active ? 'bg-nile-green animate-pulse' : 'bg-black/15'}`} />
        <div className="flex-1 min-w-0">
            <p className={`text-[9px] font-black uppercase truncate leading-none ${active ? 'text-nile-blue' : 'text-black'}`}>{title}</p>
            <p className="text-[7px] font-black text-black/25 uppercase tracking-wider mt-0.5">{time}</p>
        </div>
        <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full border uppercase flex-shrink-0 ${active ? 'bg-nile-blue text-white border-black' : 'bg-nile-white text-black/35 border-black/10'}`}>{tag}</span>
    </div>
);

export default StudentDashboard;
