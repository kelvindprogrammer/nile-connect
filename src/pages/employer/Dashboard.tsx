import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, UserRound, ArrowRight, TrendingUp, Users, Target, CheckCircle2 } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import Feed from '../../components/Feed';
import Modal from '../../components/Modal';
import InputField from '../../components/InputField';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const activeJobs = [
    { id: 1, title: 'SOFTWARE ENGINEER INTERN', applicants: 145, status: 'Active' },
    { id: 2, title: 'DATA ANALYST', applicants: 89, status: 'Interviewing' },
    { id: 3, title: 'PRODUCT MANAGER', applicants: 42, status: 'Closed' },
];

const recommendedCandidates = [
    { id: 1, name: 'GRACE STANLEY', major: 'COMPUTER SCIENCE', match: 98, level: '400L' },
    { id: 2, name: 'MICHAEL BROWN', major: 'BUSINESS ADMIN', match: 92, level: 'ALUMNI' },
    { id: 3, name: 'AISHAT YUSUF', major: 'CYBERSECURITY', match: 88, level: '300L' },
];

const EmployerDashboardPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const companyName = user?.company || 'YOUR COMPANY';
    const recruiterName = user?.name || 'RECRUITER';
    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('NEW UPDATE');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleOpenModal = (title: string) => {
        setModalTitle(title);
        setPostModalOpen(true);
    };

    const handlePostSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        showToast('Successfully posted to the Nile community!', 'success');
        setPostModalOpen(false);
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-pulse bg-nile-white h-full">
                <div className="h-40 md:h-48 bg-black/5 rounded-[24px] md:rounded-[40px] border-[2px] border-black/5"></div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                    <div className="md:col-span-8 space-y-6">
                        <div className="h-20 bg-black/5 rounded-2xl"></div>
                        <div className="h-64 md:h-[500px] bg-black/5 rounded-[32px]"></div>
                    </div>
                    <div className="md:col-span-4 space-y-6">
                        <div className="h-64 bg-black/5 rounded-[32px]"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 anime-fade-in font-sans bg-nile-white min-h-full pb-20 md:pb-8">
            
            {/* 1. Recruiter Hub Hero */}
            <section className="bg-white border-[2px] md:border-[3px] border-black rounded-[24px] md:rounded-[40px] shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] md:shadow-[8px_8px_0px_0px_rgba(108,187,86,1)] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-nile-green/5 -skew-x-12 translate-x-1/2"></div>
                
                <div className="space-y-4 md:space-y-6 max-w-2xl z-10 text-left w-full md:w-auto">
                    <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-nile-green text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full">RECRUITER COMMAND</span>
                        <span className="flex items-center space-x-1 text-[8px] md:text-[10px] font-black text-nile-blue uppercase tracking-widest">
                            <div className="pulse-blue"></div>
                            <span>{companyName}</span>
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-6xl font-black text-black leading-none md:leading-[0.9] uppercase tracking-tighter">
                        Find your next <br className="hidden md:block" />
                        <span className="text-nile-green">Star Talent</span>
                    </h2>
                    <p className="text-sm md:text-lg font-bold text-nile-blue/70 leading-snug uppercase max-w-md">
                        Your hiring pipeline is <span className="text-nile-green underline">OPTIMIZED</span>. You have 48 new applicants waiting.
                    </p>
                    <div className="flex space-x-3 pt-1">
                         <Button onClick={() => handleOpenModal('POST NEW JOB')} size="sm" variant="primary">
                             <Plus size={16} className="mr-1" strokeWidth={3} /> Post Job
                         </Button>
                         <Button variant="outline" size="sm" onClick={() => navigate('/employer/candidates')}>Talent</Button>
                    </div>
                </div>

                <div className="hidden md:flex w-[340px] h-[240px] bg-white border-[3px] border-black rounded-[32px] p-8 shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] z-10 flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div className="w-12 h-12 bg-nile-blue/10 rounded-xl flex items-center justify-center text-nile-blue">
                             <Users size={24} />
                         </div>
                         <span className="text-[10px] font-black text-black opacity-30 uppercase tracking-widest">STATS</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <h4 className="text-2xl font-black text-black leading-none">12</h4>
                            <p className="text-[8px] font-black text-nile-blue opacity-60 uppercase tracking-widest">OPEN ROLES</p>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-2xl font-black text-nile-green leading-none">450+</h4>
                            <p className="text-[8px] font-black text-nile-blue opacity-60 uppercase tracking-widest">TOTAL APPS</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-2 text-[9px] font-black text-nile-green uppercase tracking-widest">
                         <TrendingUp size={12} />
                         <span>+14% SUCCESS RATE</span>
                     </div>
                </div>
            </section>

            {/* 2. Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
                
                {/* Left: Engagement Column */}
                <div className="xl:col-span-8 space-y-8 md:space-y-10">
                     <div className="bg-white border-[2px] md:border-[3px] border-black rounded-[24px] p-5 md:p-6 shadow-brutalist-sm flex flex-col sm:flex-row items-center sm:space-x-6 gap-4">
                        <Avatar name={recruiterName} size="lg" />
                        <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                            <h3 className="text-[10px] md:text-xs font-black uppercase text-black/40">Recruitment strategy for today?</h3>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 md:gap-3">
                                <button onClick={() => handleOpenModal('SHARE UPDATE')} className="text-[8px] md:text-[9px] font-black uppercase px-4 md:px-6 py-2 md:py-3 bg-nile-white border-[2px] border-black rounded-lg md:rounded-xl hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(30,73,157,1)] hover:shadow-none">ANNOUNCE</button>
                                <button onClick={() => handleOpenModal('CAREER TIPS')} className="text-[8px] md:text-[9px] font-black uppercase px-4 md:px-6 py-2 md:py-3 bg-nile-white border-[2px] border-black rounded-lg md:rounded-xl hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] hover:shadow-none">TIPS</button>
                                <button onClick={() => handleOpenModal('HIRING NEWS')} className="text-[8px] md:text-[9px] font-black uppercase px-4 md:px-6 py-2 md:py-3 bg-nile-white border-[2px] border-black rounded-lg md:rounded-xl hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none">SPOTLIGHT</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] flex items-center">
                                <Target size={18} className="mr-2 text-nile-blue" /> GLOBAL REACH FEED
                            </h3>
                        </div>
                        <Feed />
                    </div>
                </div>

                {/* Right: Insight Column */}
                <div className="xl:col-span-4 space-y-8 md:space-y-10">
                    <Card title="ACTIVE LISTINGS">
                        <div className="space-y-3 md:space-y-4">
                            {activeJobs.map((job) => (
                                <div key={job.id} onClick={() => navigate('/employer/jobs')} className="p-4 md:p-5 bg-nile-white/50 border-[2px] border-black rounded-xl md:rounded-2xl group hover:bg-white hover:shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] transition-all cursor-pointer">
                                    <div className="flex justify-between items-start text-left">
                                        <div className="space-y-1.5 md:space-y-2 min-w-0">
                                            <p className="font-black text-[11px] md:text-[12px] uppercase leading-none text-black group-hover:text-nile-green transition-colors truncate">{job.title}</p>
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded border border-black/10 ${job.status === 'Closed' ? 'bg-red-100 text-red-500' : 'bg-nile-green/10 text-nile-green'}`}>{job.status.toUpperCase()}</span>
                                                <span className="text-[8px] md:text-[9px] font-black text-nile-blue/40 uppercase tracking-widest truncate">{job.applicants} APPS</span>
                                            </div>
                                        </div>
                                        <div className="p-1 px-2 md:px-3 border-[2px] border-black rounded-lg text-[10px] font-black group-hover:bg-black group-hover:text-white transition-all">
                                            <ArrowRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button fullWidth variant="ghost" size="sm" className="mt-6 md:mt-8" onClick={() => navigate('/employer/jobs')}>MANAGE ALL</Button>
                    </Card>

                    <Card title="AI MATCH TALENT">
                         <div className="space-y-4 md:space-y-6">
                            {recommendedCandidates.map((c) => (
                                <div key={c.id} onClick={() => navigate('/employer/candidates')} className="flex items-center justify-between p-3 md:p-4 bg-white border-[2px] border-black/5 rounded-xl md:rounded-2xl hover:border-black transition-all group cursor-pointer">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <Avatar name={c.name} size="sm" />
                                        <div className="text-left min-w-0">
                                            <p className="font-black text-[10px] md:text-[11px] uppercase truncate text-black">{c.name}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[8px] font-black text-nile-green uppercase">{c.match}% MATCH</span>
                                                <span className="text-[8px] font-black text-black/30 uppercase">{c.level}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-1.5 border-[2px] border-black/5 group-hover:border-black rounded-lg transition-all group-hover:bg-nile-green group-hover:text-white flex-shrink-0">
                                        <CheckCircle2 size={12} strokeWidth={3} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button fullWidth variant="outline" size="sm" className="mt-6 md:mt-8" onClick={() => navigate('/employer/candidates')}>TALENT POOL</Button>
                    </Card>
                </div>
            </div>

            <Modal isOpen={isPostModalOpen} onClose={() => setPostModalOpen(false)} title={modalTitle}>
                <form onSubmit={handlePostSubmit} className="space-y-6 md:space-y-8">
                    {modalTitle === 'POST NEW JOB' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-left">
                                <InputField label="JOB TITLE" placeholder="E.G. SOFTWARE ENGINEER" required />
                                <InputField label="LOCATION" placeholder="ABUJA / REMOTE" required />
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-black tracking-[0.2em] uppercase ml-1">DESCRIPTION</label>
                                <textarea 
                                    className="w-full h-32 md:h-40 border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-xs md:text-sm outline-none focus:shadow-[4px_4px_0px_0px_#6CBB56] transition-all bg-nile-white/40"
                                    placeholder="Outline requirements..."
                                    required
                                ></textarea>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 text-left">
                            <label className="text-[10px] font-black text-black tracking-[0.2em] uppercase ml-1">CONTENT</label>
                            <textarea 
                                className="w-full h-40 md:h-48 border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-xs md:text-sm outline-none focus:shadow-[4px_4px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                                placeholder={`Professional updates...`}
                                required
                            ></textarea>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2 md:pt-4">
                        <Button variant="outline" size="sm" onClick={() => setPostModalOpen(false)} type="button">DISCARD</Button>
                        <Button variant="primary" size="sm" type="submit">PUBLISH</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default EmployerDashboardPage;
