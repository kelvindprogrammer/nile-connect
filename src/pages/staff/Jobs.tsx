import React, { useState, useEffect } from 'react';
import { Briefcase, CheckCircle2, XCircle, Search, MapPin, DollarSign, Activity, Loader2, Warehouse } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { getStaffJobs, updateJobStatus, StaffJob } from '../../services/staffService';

type Tab = 'PENDING' | 'ACTIVE' | 'ARCHIVED';

const StaffJobs = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('PENDING');
    const [allJobs, setAllJobs] = useState<StaffJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getStaffJobs()
            .then(setAllJobs)
            .catch(() => setAllJobs([]))
            .finally(() => setIsLoading(false));
    }, []);

    const handleAction = async (job: StaffJob, action: 'active' | 'rejected') => {
        try {
            await updateJobStatus(job.id, action);
            setAllJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: action } : j));
            showToast(
                `"${job.title}" ${action === 'active' ? 'authorized' : 'declined'}.`,
                action === 'active' ? 'success' : 'error'
            );
        } catch {
            showToast('Action failed. Please try again.', 'error');
        }
    };

    const filtered = allJobs
        .filter(j => {
            const tabStatus = activeTab === 'PENDING' ? 'pending' : activeTab === 'ACTIVE' ? 'active' : 'archived';
            return j.status === tabStatus;
        })
        .filter(j =>
            j.title.toLowerCase().includes(search.toLowerCase()) ||
            (j.company || '').toLowerCase().includes(search.toLowerCase())
        );

    const countFor = (tab: Tab) => {
        const s = tab === 'PENDING' ? 'pending' : tab === 'ACTIVE' ? 'active' : 'archived';
        return allJobs.filter(j => j.status === s).length;
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-10 space-y-6 animate-pulse bg-nile-white h-full">
                <div className="h-16 bg-black/5 rounded-[24px]"></div>
                <div className="h-12 bg-black/5 rounded-xl w-1/3"></div>
                <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-black/5 rounded-[28px]"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-10 space-y-8 md:space-y-12 anime-fade-in font-sans pb-20 text-left">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 md:gap-8 border-b-[2px] md:border-b-[3px] border-black pb-6 md:pb-10">
                <div className="space-y-1 md:space-y-2">
                    <h2 className="text-3xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Job Vetting .</h2>
                    <p className="text-[10px] md:text-lg font-bold text-nile-blue/50 uppercase tracking-widest flex items-center">
                        Review and authorize platform listings <Activity size={18} className="ml-2 md:ml-3 text-nile-blue" />
                    </p>
                </div>

                <div className="flex bg-white p-1 md:p-2 border-[2px] md:border-[3px] border-black rounded-[16px] md:rounded-[24px] shadow-sm w-full md:w-auto">
                    {(['PENDING', 'ACTIVE', 'ARCHIVED'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-1.5
                                ${activeTab === t ? 'bg-black text-white shadow-[2px_2px_0px_0px_#1E499D]' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {t}
                            {countFor(t) > 0 && (
                                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black ${activeTab === t ? 'bg-white text-black' : 'bg-black/10 text-black'}`}>
                                    {countFor(t)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search size={16} className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="SEARCH LISTINGS..."
                    className="w-full pl-10 md:pl-16 pr-4 md:pr-6 py-3 md:py-5 rounded-[16px] md:rounded-[24px] border-[2px] md:border-[3px] border-black font-black text-[9px] md:text-xs tracking-widest uppercase outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#000] transition-all bg-nile-white/40 placeholder:text-black/20"
                />
            </div>

            {/* Job List */}
            <div className="space-y-4 md:space-y-6">
                {filtered.length === 0 ? (
                    <div className="py-20 md:py-32 text-center border-[3px] md:border-4 border-dashed border-black/10 rounded-[32px] md:rounded-[48px]">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-black/20">
                            <Briefcase size={28} />
                        </div>
                        <h3 className="text-base md:text-xl font-black text-black uppercase tracking-tight mb-2">
                            {search ? 'No matches found' : `No ${activeTab.toLowerCase()} listings`}
                        </h3>
                        <p className="text-[9px] md:text-[10px] font-black text-nile-blue/30 uppercase tracking-[0.3em]">
                            {activeTab === 'PENDING' ? 'ALL SUBMISSIONS HAVE BEEN PROCESSED' : 'NOTHING TO SHOW HERE'}
                        </p>
                    </div>
                ) : (
                    filtered.map((job) => (
                        <div key={job.id} className="bg-white border-[2px] md:border-[3px] border-black rounded-[24px] md:rounded-[40px] p-5 md:p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between transition-all hover:translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(30,73,157,0.2)] md:shadow-[8px_8px_0px_0px_rgba(30,73,157,1)] gap-4 xl:gap-8">
                            <div className="flex items-center space-x-4 md:space-x-8 min-w-0">
                                <div className="w-12 h-12 md:w-20 md:h-20 bg-nile-white rounded-[16px] md:rounded-[24px] flex items-center justify-center border-[2px] md:border-[3px] border-black shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000000] flex-shrink-0">
                                    <Warehouse size={20} strokeWidth={2.5} className="text-nile-blue md:w-8 md:h-8" />
                                </div>
                                <div className="text-left space-y-1 md:space-y-2 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base md:text-2xl font-black text-black uppercase tracking-tighter leading-none truncate">{job.title}</h3>
                                        <span className="text-[7px] md:text-[9px] font-black bg-black text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest flex-shrink-0">{job.type?.toUpperCase() || 'ROLE'}</span>
                                    </div>
                                    <p className="text-xs md:text-sm font-bold text-nile-blue uppercase tracking-widest truncate">{job.company || 'UNKNOWN COMPANY'}</p>
                                    <div className="flex flex-wrap items-center gap-3 md:gap-6 text-[8px] md:text-[10px] font-black text-black/30 uppercase tracking-widest pt-0.5">
                                        {job.location && <span className="flex items-center"><MapPin size={11} className="mr-1 text-nile-green" />{job.location}</span>}
                                        <span>SUBMITTED: {new Date(job.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'PENDING' && (
                                <div className="flex items-center space-x-3 w-full xl:w-auto">
                                    <button
                                        onClick={() => handleAction(job, 'active')}
                                        className="flex-1 xl:flex-none px-4 md:px-6 py-3 md:py-4 bg-nile-green text-white border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center"
                                    >
                                        <CheckCircle2 size={14} className="mr-2" strokeWidth={3} /> AUTHORIZE
                                    </button>
                                    <button
                                        onClick={() => handleAction(job, 'rejected')}
                                        className="flex-1 xl:flex-none px-4 md:px-6 py-3 md:py-4 bg-white text-red-500 border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center"
                                    >
                                        <XCircle size={14} className="mr-2" strokeWidth={3} /> DECLINE
                                    </button>
                                </div>
                            )}

                            {activeTab === 'ACTIVE' && (
                                <span className="flex items-center gap-2 text-[9px] font-black text-nile-green uppercase tracking-widest flex-shrink-0">
                                    <div className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse"></div> LIVE
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StaffJobs;
