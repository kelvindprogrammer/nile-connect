import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Upload, Video, ArrowUpRight, BookOpen, Star, ChevronRight,
    Cpu, Sparkles, X, Calendar, Clock, User, CheckCircle2, Mail, Zap, Copy,
} from 'lucide-react';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useAuth } from '../../context/AuthContext';

const allAdvisors = [
    { id: 1, name: 'Dr. Amara Osei', speciality: 'CV & Portfolio Review', time: 'FRI 2PM', rating: 4.9, available: true },
    { id: 2, name: 'Mr. Kelvin Eze', speciality: 'Tech Career Coaching', time: 'SAT 10AM', rating: 4.7, available: true },
    { id: 3, name: 'Dr. Fatima Yusuf', speciality: 'Interview Preparation', time: 'MON 11AM', rating: 4.8, available: false },
    { id: 4, name: 'Prof. Chidi Nwachukwu', speciality: 'Industry Networking', time: 'TUE 3PM', rating: 4.6, available: true },
    { id: 5, name: 'Ms. Aisha Bello', speciality: 'Entrepreneurship & Startups', time: 'WED 1PM', rating: 4.5, available: true },
    { id: 6, name: 'Mr. Tayo Adewale', speciality: 'Finance & Banking Careers', time: 'THU 9AM', rating: 4.9, available: false },
];

const CareerCenter = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const strength = calculateProfileStrength(profile, !!user?.name, !!user?.email);

    const [showAllAdvisors, setShowAllAdvisors] = useState(false);
    const [bookingAdvisor, setBookingAdvisor] = useState<typeof allAdvisors[0] | null>(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingNote, setBookingNote] = useState('');
    const [bookingDone, setBookingDone] = useState<Set<number>>(new Set());
    const [sessionLink, setSessionLink] = useState('');
    const [showSessionModal, setShowSessionModal] = useState(false);

    const visibleAdvisors = showAllAdvisors ? allAdvisors : allAdvisors.slice(0, 2);

    const generateRoomId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const handleStartLiveSession = () => {
        const roomId = generateRoomId();
        const link = `${window.location.origin}/student/session/${roomId}`;
        setSessionLink(link);
        setShowSessionModal(true);
    };

    const handleJoinSession = () => {
        const roomId = sessionLink.split('/session/')[1];
        if (roomId) navigate(`/student/session/${roomId}`);
    };

    const handleBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingAdvisor) return;
        const roomId = generateRoomId();
        setBookingDone(prev => new Set([...prev, bookingAdvisor.id]));
        showToast(`Session booked with ${bookingAdvisor.name}! Starting video room...`, 'success');
        setBookingAdvisor(null);
        setBookingDate('');
        setBookingNote('');
        // Navigate to session
        setTimeout(() => navigate(`/student/session/${roomId}`), 1200);
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-10 space-y-6 md:space-y-8 font-sans bg-nile-white min-h-full pb-24">

                {/* Header */}
                <div className="border-b-[2px] border-black pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h2 className="text-3xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Careers .</h2>
                        <p className="text-[10px] md:text-lg font-bold text-nile-blue/70 uppercase mt-2 tracking-widest">Accelerate your professional readiness .</p>
                    </div>
                    <button
                        onClick={handleStartLiveSession}
                        className="flex items-center gap-2 px-5 py-3 bg-nile-blue text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] transition-all flex-shrink-0 animate-pulse"
                    >
                        <Zap size={13} strokeWidth={3} /> START LIVE SESSION
                    </button>
                </div>

                {/* Career Readiness Banner */}
                <div className="bg-nile-green text-white p-6 md:p-8 rounded-[28px] border-[2px] border-black shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                    <div className="space-y-3 flex-1">
                        <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">OVERALL READINESS</p>
                        <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Profile Strength</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-3 bg-white/20 rounded-full border border-white/30 overflow-hidden max-w-xs">
                                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${strength}%` }} />
                            </div>
                            <span className="font-black text-white text-lg">{strength}%</span>
                        </div>
                        <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">
                            {strength < 60 ? 'COMPLETE YOUR PROFILE TO UNLOCK MORE OPPORTUNITIES.' : strength < 85 ? 'GREAT PROGRESS! ADD LINKS TO REACH 100%.' : 'EXCELLENT! YOUR PROFILE IS STRONG.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setBookingAdvisor(allAdvisors[0])}
                        className="bg-white text-nile-green font-black py-3 px-6 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] whitespace-nowrap flex-shrink-0"
                    >
                        BOOK ADVISOR
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">

                    {/* AI Architect Card */}
                    <div className="bg-white p-6 md:p-8 rounded-[28px] border-[2px] border-black shadow-[4px_4px_0px_0px_#000] space-y-5 text-left">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl md:text-2xl font-black text-black uppercase tracking-tighter">AI Architect .</h3>
                            <div className="w-10 h-10 bg-nile-green text-white rounded-xl border-[2px] border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
                                <Cpu size={18} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/student/career/ai')}
                            className="aspect-video border-[2px] border-dashed border-black rounded-[20px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-nile-green/5 transition-all group"
                        >
                            <Sparkles size={36} strokeWidth={2} className="text-nile-blue/30 group-hover:text-nile-green group-hover:scale-110 transition-all" />
                            <div className="text-center">
                                <p className="font-black uppercase text-black text-sm">Scan &amp; Evolve</p>
                                <p className="text-[9px] font-black text-nile-blue/30 uppercase tracking-[0.2em] mt-1">AI-Powered CV Analysis</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/student/career/ai')}
                            className="w-full bg-nile-green text-white font-black py-3.5 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                        >
                            <Cpu size={14} /> LAUNCH NEURAL ANALYSIS
                        </button>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">

                        {/* Mock Interview */}
                        <div className="bg-white p-6 md:p-8 rounded-[28px] border-[2px] border-black shadow-[4px_4px_0px_0px_#000] text-left">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-tighter">Mock Interview .</h3>
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl border-[2px] border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
                                    <Video size={16} strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="font-bold text-nile-blue/70 uppercase text-[10px] mb-5 leading-relaxed tracking-wider">
                                PRACTICE WITH AN AI INTERVIEWER — GET REAL-TIME FEEDBACK AND SCORES ON YOUR ANSWERS.
                            </p>
                            <div className="grid grid-cols-3 gap-2 mb-5">
                                {['Behavioral', 'Technical', 'HR Round'].map(t => (
                                    <div key={t} className="text-center p-2.5 bg-nile-white border-[1.5px] border-black/10 rounded-xl">
                                        <p className="text-[8px] font-black uppercase text-black/50">{t}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => navigate('/student/career/mock-interview')}
                                className="w-full bg-nile-blue text-white font-black py-3.5 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                            >
                                <span>START SESSION</span>
                                <ArrowUpRight size={16} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Advisors */}
                        <div className="bg-white p-6 md:p-8 rounded-[28px] border-[2px] border-black shadow-[4px_4px_0px_0px_#000] text-left">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-tighter">Advisors .</h3>
                                <button
                                    onClick={() => setShowAllAdvisors(v => !v)}
                                    className="text-[9px] font-black text-nile-blue underline underline-offset-4 hover:text-nile-green transition-colors uppercase tracking-widest"
                                >
                                    {showAllAdvisors ? 'SHOW LESS' : 'SEE ALL'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                {visibleAdvisors.map(a => (
                                    <AdvisorCard
                                        key={a.id}
                                        advisor={a}
                                        booked={bookingDone.has(a.id)}
                                        onBook={() => setBookingAdvisor(a)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Book Advisor Modal */}
            {bookingAdvisor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setBookingAdvisor(null)}>
                    <div className="bg-white border-[3px] border-black rounded-[28px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 md:p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Book Session</h3>
                            <button onClick={() => setBookingAdvisor(null)} className="p-1.5 border-2 border-black/10 rounded-lg hover:bg-black/5">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-nile-white rounded-[16px] border-2 border-black">
                            <div className="w-12 h-12 rounded-full bg-nile-blue text-white flex items-center justify-center font-black text-sm border-2 border-black flex-shrink-0">
                                {bookingAdvisor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase">{bookingAdvisor.name}</p>
                                <p className="text-[9px] font-black text-nile-blue/60 uppercase tracking-widest">{bookingAdvisor.speciality}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Star size={10} fill="#facc15" className="text-yellow-400" />
                                    <span className="text-[8px] font-black">{bookingAdvisor.rating}</span>
                                    <span className="text-[8px] text-nile-blue/40 font-black ml-2">NEXT SLOT: {bookingAdvisor.time}</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleBook} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-black/50">PREFERRED DATE</label>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    onChange={e => setBookingDate(e.target.value)}
                                    required
                                    className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-black/50">WHAT DO YOU NEED HELP WITH?</label>
                                <textarea
                                    value={bookingNote}
                                    onChange={e => setBookingNote(e.target.value)}
                                    placeholder="e.g. My CV needs improvement and I have an interview at Google next month..."
                                    className="w-full h-24 border-[2px] border-black rounded-xl py-3 px-4 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" fullWidth type="button" onClick={() => setBookingAdvisor(null)}>CANCEL</Button>
                                <Button fullWidth type="submit">
                                    <Calendar size={14} className="mr-2" /> BOOK NOW
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Session Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowSessionModal(false)}>
                    <div className="bg-white border-[3px] border-black rounded-[28px] shadow-[8px_8px_0px_0px_rgba(108,187,86,1)] max-w-md w-full p-6 space-y-5 anime-fade-in"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-nile-blue rounded-xl border-2 border-black flex items-center justify-center">
                                    <Video size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base uppercase tracking-tight">Live Session</h3>
                                    <p className="text-[7px] font-black text-black/40 uppercase tracking-widest">REAL-TIME VIDEO CALL</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSessionModal(false)} className="p-1.5 rounded-lg border-2 border-black/10 hover:bg-black/5">
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-4 bg-nile-blue/5 border-[2px] border-nile-blue/20 rounded-[16px] space-y-2">
                            <p className="text-[8px] font-black text-black/50 uppercase tracking-widest">YOUR SESSION LINK</p>
                            <p className="text-[9px] font-bold text-nile-blue break-all leading-relaxed">{sessionLink}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black text-black/60 leading-relaxed">
                                Share this link with your career advisor. When they join, you'll be connected in a live video call — right here in NileConnect.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(sessionLink); showToast('Link copied!', 'success'); }}
                                    className="flex items-center gap-1.5 px-3 py-2 border-[2px] border-black rounded-xl font-black text-[8px] uppercase hover:bg-black hover:text-white transition-all"
                                >
                                    <Copy size={12} /> COPY LINK
                                </button>
                                <button
                                    onClick={handleJoinSession}
                                    className="flex-1 py-2 bg-nile-blue text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap size={12} /> JOIN NOW
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

const AdvisorCard = ({
    advisor, booked, onBook,
}: {
    advisor: typeof allAdvisors[0]; booked: boolean; onBook: () => void;
}) => (
    <div className="flex items-center justify-between p-4 border-[2px] border-black rounded-[18px] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#6CBB56] bg-white">
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full border-[2px] border-black bg-nile-blue text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                {advisor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
                <p className="font-black text-black text-[11px] uppercase leading-none mb-1 truncate">{advisor.name}</p>
                <p className="text-[8px] font-black text-nile-blue/60 uppercase tracking-widest truncate">{advisor.speciality}</p>
            </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <div className="hidden sm:flex items-center gap-1">
                <Star size={10} strokeWidth={3} className="text-yellow-400" fill="#facc15" />
                <span className="text-[8px] font-black">{advisor.rating}</span>
            </div>
            {booked ? (
                <span className="flex items-center gap-1 text-[8px] font-black text-nile-green uppercase px-2 py-1 bg-nile-green/10 rounded-full border border-nile-green/20">
                    <CheckCircle2 size={10} strokeWidth={3} /> BOOKED
                </span>
            ) : (
                <button
                    onClick={onBook}
                    disabled={!advisor.available}
                    className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase border border-black transition-all
                        ${advisor.available
                            ? 'bg-nile-green text-white hover:bg-nile-blue cursor-pointer'
                            : 'bg-black/5 text-black/30 cursor-not-allowed'}`}
                >
                    {advisor.available ? advisor.time : 'FULL'}
                </button>
            )}
        </div>
    </div>
);

export default CareerCenter;
