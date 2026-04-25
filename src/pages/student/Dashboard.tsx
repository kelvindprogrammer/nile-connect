import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Mail, FileText, TrendingUp, Users, Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';
import Feed from '../../components/Feed';
import PostBar from '../../components/PostBar';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const userName = user?.name || 'STUDENT';
    const firstName = userName.split(' ')[0];
    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [pendingPost, setPendingPost] = useState<{ content: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
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
                <div className="p-4 md:p-6 space-y-6 animate-pulse">
                    <div className="h-32 bg-black/5 rounded-[24px]"></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8 space-y-6"><div className="h-64 md:h-[500px] bg-black/5 rounded-[24px]"></div></div>
                        <div className="md:col-span-4 space-y-6"><div className="h-64 bg-black/5 rounded-[24px]"></div></div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 md:space-y-8 anime-fade-in font-sans max-w-6xl mx-auto">
                
                {/* 1. Dashboard Hero: Responsive */}
                <section className="bg-white border-[2px] border-black rounded-[24px] shadow-[4px_4px_0px_0px_#1E499D] md:shadow-[6px_6px_0px_0px_#1E499D] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1/4 h-full bg-nile-blue/5 -skew-x-12 translate-x-1/2"></div>
                    
                    <div className="space-y-3 md:space-y-4 max-w-xl z-10 text-left w-full md:w-auto">
                        <div className="flex items-center space-x-2">
                             <div className="pulse-green"></div>
                            <span className="text-[8px] md:text-[9px] font-black text-nile-blue uppercase tracking-widest">LIVE SESSION OVERVIEW</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">
                            Hi, <span className="text-nile-blue">{firstName}</span>
                        </h2>
                        <p className="text-xs md:text-sm font-bold text-nile-blue/70 leading-snug uppercase max-w-sm">
                            Your network grew by <span className="text-nile-green">12%</span>. <span className="underline">3 tasks</span> pending.
                        </p>
                        <div className="flex space-x-3 pt-1">
                             <Button onClick={() => navigate('/student/applications')} size="sm">Tasks</Button>
                             <Button variant="outline" size="sm" onClick={() => navigate('/student/profile')}>Profile</Button>
                        </div>
                    </div>

                    <div className="hidden md:flex w-[260px] h-[160px] bg-white border-[2px] border-black rounded-[16px] p-5 shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] z-10 flex-col justify-between">
                         <div className="flex justify-between items-start">
                             <TrendingUp size={16} className="text-nile-green" />
                             <span className="text-[8px] font-black text-black opacity-30 uppercase">ACTIVITY</span>
                         </div>
                         <div className="space-y-0.5">
                             <h4 className="text-2xl font-black text-black leading-none">92%</h4>
                             <p className="text-[8px] font-black text-nile-blue opacity-60 uppercase">PROFILE STRENGTH</p>
                         </div>
                         <div className="h-1.5 bg-nile-white rounded-full border border-black overflow-hidden">
                             <div className="h-full bg-nile-blue w-[92%]"></div>
                         </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-10">
                    
                    {/* Left: Engagement */}
                    <div className="xl:col-span-8 space-y-8">
                         <div className="p-1 border-2 border-black border-dashed rounded-[20px] bg-nile-white/40">
                             <PostBar onPostClick={() => setPostModalOpen(true)} />
                         </div>
                         
                         <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] flex items-center">
                                    <ArrowUpRight size={14} className="mr-2 text-nile-green" /> CATCH UP ON FEED
                                </h3>
                                <button className="text-[8px] md:text-[9px] font-black text-nile-blue hover:underline uppercase" onClick={() => navigate('/student/feed')}>VIEW ALL</button>
                            </div>
                            <div className="max-w-2xl mx-auto xl:mx-0">
                                <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />
                            </div>
                         </div>
                    </div>

                    {/* Right: Insight */}
                    <div className="xl:col-span-4 space-y-8">
                        <Card title="NETWORK SUMMARY">
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <MentorItem name="Mary Johnson" role="Career Advisor" onMail={() => navigate('/student/messages')} />
                                    <MentorItem name="James Brown" role="Industry Mentor" onMail={() => navigate('/student/messages')} />
                                </div>
                                <Button fullWidth variant="ghost" size="xs" onClick={() => navigate('/student/network')}>EXPAND NETWORK</Button>
                            </div>
                        </Card>

                        <Card title="UPCOMING">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[8px] font-black bg-nile-blue text-white px-3 py-1 rounded-full border-2 border-black">DECEMBER 2024</span>
                            </div>
                            <div className="space-y-4">
                                <TimelineItem time="9:45 - 10:30" title="Electronics lesson" active />
                                <TimelineItem time="11:00 - 11:40" title="Resume Workshop" />
                            </div>
                            <Button fullWidth variant="outline" size="sm" className="mt-4" onClick={() => navigate('/student/events')}>
                                <CalendarIcon size={14} className="mr-2" /> CALENDAR
                            </Button>
                        </Card>
                    </div>
                </div>

                <Modal isOpen={isPostModalOpen} onClose={() => setPostModalOpen(false)} title="NEW POST">
                    <form className="space-y-6" onSubmit={handlePublish}>
                        <textarea
                            className="w-full h-32 border-[2px] border-black rounded-xl p-4 font-bold text-xs outline-none focus:shadow-[4px_4px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                            placeholder="Share an update, achievement, or question..."
                            required
                            value={postContent}
                            onChange={e => setPostContent(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPostModalOpen(false)} type="button">DISCARD</Button>
                            <Button variant="primary" size="sm" type="submit">PUBLISH</Button>
                        </div>
                    </form>
                </Modal>

            </div>
        </DashboardLayout>
    );
};

const MentorItem = ({ name, role, onMail }: { name: string, role: string, onMail: () => void }) => (
    <div className="flex items-center justify-between p-3 bg-nile-white/50 border-[2px] border-black rounded-xl hover:bg-white transition-all text-left">
        <div className="flex items-center space-x-2.5">
             <Avatar name={name} size="sm" />
            <div className="min-w-0">
                <p className="font-black text-[10px] uppercase truncate">{name}</p>
                <p className="text-[8px] font-black text-nile-blue/50 uppercase truncate">{role}</p>
            </div>
        </div>
        <button onClick={onMail} className="p-1.5 border-2 border-black rounded-lg hover:bg-nile-blue hover:text-white bg-white">
            <Mail size={12} strokeWidth={3} />
        </button>
    </div>
);

const TimelineItem = ({ time, title, active = false }: { time: string, title: string, active?: boolean }) => (
    <div className="relative group text-left pl-4 border-l-2 border-black/10 hover:border-black transition-colors">
        <div className={`absolute -left-[6px] top-0 w-2.5 h-2.5 rounded-full border-2 border-black z-10 ${active ? 'bg-nile-green' : 'bg-white'}`}></div>
        <div className="space-y-0.5 pb-4">
            <h4 className={`text-[10px] font-black uppercase tracking-tight ${active ? 'text-nile-blue' : 'text-black opacity-80'}`}>{title}</h4>
            <div className="flex items-center space-x-1.5 opacity-40">
                <p className="text-[8px] font-black uppercase tracking-widest">{time}</p>
            </div>
        </div>
    </div>
);

export default StudentDashboard;
