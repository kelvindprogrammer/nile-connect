import React, { useState, useEffect } from 'react';
import { Briefcase, CheckCircle2, XCircle, Eye, Pencil, Search, Filter, Warehouse, MapPin, DollarSign, Activity } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

const pendingJobs = [
    { id: 1, title: "SOFTWARE ENGINEER INTERN", company: "TECHCORP", type: "INTERNSHIP", location: "REMOTE", salary: "₦200,000", submitted: "2H AGO" },
    { id: 2, title: "UX DESIGNER", company: "DESIGNSTUDIO", type: "FULL-TIME", location: "ABUJA", salary: "₦450,000", submitted: "5H AGO" },
    { id: 3, title: "DATA ANALYST", company: "DATACO", type: "CONTRACT", location: "LAGOS", salary: "₦300,000", submitted: "1D AGO" },
];

const StaffJobs = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('PENDING');
    const [jobs, setJobs] = useState(pendingJobs);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleAction = (id: number, title: string, action: 'approved' | 'rejected') => {
        setJobs(prev => prev.filter(j => j.id !== id));
        showToast(`Job listing "${title}" has been ${action}.`, action === 'approved' ? 'success' : 'error');
    };

    if (isLoading) {
        return (
            <div className="p-10 space-y-10 animate-pulse bg-nile-white h-full">
                <div className="h-20 bg-black/5 rounded-3xl"></div>
                <div className="h-16 bg-black/5 rounded-2xl w-1/3"></div>
                <div className="space-y-6">
                    {[1,2,3].map(i => <div key={i} className="h-40 bg-black/5 rounded-[40px] border-3 border-black/5"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-10 space-y-12 anime-fade-in font-sans pb-20 text-left">
            {/* 1. Header & Navigation */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 border-b-[3px] border-black pb-10">
                <div className="space-y-2">
                    <h2 className="text-6xl font-black text-black leading-none uppercase tracking-tighter">Job Vetting .</h2>
                    <p className="text-lg font-bold text-nile-blue/50 uppercase tracking-widest flex items-center">
                        Review and authorize platform listings <Activity size={20} className="ml-3 text-nile-blue" />
                    </p>
                </div>
                
                <div className="flex bg-white p-2 border-[3px] border-black rounded-[24px] shadow-sm">
                    {(['PENDING', 'ACTIVE', 'ARCHIVED'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-8 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all
                                ${activeTab === t ? 'bg-black text-white shadow-[4px_4px_0px_0px_#1E499D]' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Filter Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="relative group flex-1 w-full">
                     <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                     <input 
                        type="text" 
                        placeholder="SEARCH ACROSS ALL LISTINGS..." 
                        className="w-full pl-16 pr-6 py-5 rounded-[24px] border-[3px] border-black font-black text-xs tracking-widest uppercase outline-none focus:bg-white focus:shadow-[6px_6px_0px_0px_#000] transition-all bg-nile-white/40 placeholder:text-black/20"
                     />
                </div>
                <Button variant="outline" className="h-[60px] px-8">
                    <Filter size={18} className="mr-3" /> GLOBAL FILTERS
                </Button>
            </div>

            {/* 3. Job Review List */}
            <div className="space-y-6">
                {jobs.map((job) => (
                    <Card key={job.id} variant="flat" className="bg-white border-[3px] border-black rounded-[40px] p-8 flex flex-col xl:flex-row items-center justify-between transition-all hover:translate-y-[-4px] shadow-[8px_8px_0px_0px_rgba(30,73,157,1)]">
                         <div className="flex items-center space-x-8">
                            <div className="w-20 h-20 bg-nile-white rounded-[24px] flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] rotate-[-2deg] flex-shrink-0">
                                <Warehouse size={32} strokeWidth={2.5} className="text-nile-blue" />
                            </div>
                            <div className="text-left space-y-2">
                                <div className="flex items-center space-x-3">
                                    <h3 className="text-3xl font-black text-black uppercase tracking-tighter leading-none">{job.title}</h3>
                                    <span className="text-[9px] font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">{job.type}</span>
                                </div>
                                <p className="text-sm font-bold text-nile-blue uppercase tracking-widest">{job.company}</p>
                                <div className="flex items-center space-x-6 text-[10px] font-black text-black/30 uppercase tracking-widest pt-1">
                                    <span className="flex items-center"><MapPin size={14} className="mr-2 text-nile-green" /> {job.location}</span>
                                    <span className="flex items-center"><DollarSign size={14} className="mr-2 text-nile-blue" /> {job.salary}</span>
                                    <span className="flex items-center">SUBMITTED: {job.submitted}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-10 xl:mt-0">
                            <button 
                                onClick={() => handleAction(job.id, job.title, 'approved')}
                                className="px-6 py-4 bg-nile-green text-white border-[3px] border-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center"
                            >
                                <CheckCircle2 size={16} className="mr-2" strokeWidth={3} /> AUTHORIZE
                            </button>
                            <button 
                                onClick={() => handleAction(job.id, job.title, 'rejected')}
                                className="px-6 py-4 bg-white text-red-500 border-[3px] border-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center"
                            >
                                <XCircle size={16} className="mr-2" strokeWidth={3} /> DECLINE
                            </button>
                            <div className="flex items-center space-x-2">
                                <button className="p-4 border-2 border-black/10 rounded-2xl hover:bg-black hover:text-white transition-colors">
                                    <Eye size={20} />
                                </button>
                                <button className="p-4 border-2 border-black/10 rounded-2xl hover:bg-black hover:text-white transition-colors">
                                    <Pencil size={20} />
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}

                {jobs.length === 0 && (
                     <div className="py-32 text-center border-4 border-dashed border-black/10 rounded-[48px]">
                        <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-6 text-black/20">
                            <Briefcase size={32} />
                        </div>
                        <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2">No Active Submissions</h3>
                        <p className="text-[10px] font-black text-nile-blue/30 uppercase tracking-[0.3em]">ALL EMPLOYER JOB POSTS HAVE BEEN PROCESSED</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffJobs;
