import React, { useState, useEffect } from 'react';
import { BarChart2, Building2, ShieldCheck, UserCheck, UserX, Clock, ArrowUpRight, Filter, Search, Activity, Layers } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';

interface PendingRecruiter {
    id: number;
    name: string;
    company: string;
    submitted: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

const mockRecruiters: PendingRecruiter[] = [
    { id: 1, name: 'Sarah Jenkins', company: 'Google Tech', submitted: '2h ago', status: 'PENDING' },
    { id: 2, name: 'David Kabir', company: 'Shell NG', submitted: '5h ago', status: 'PENDING' },
];

const StaffApplications = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'VERIFICATIONS'>('ANALYTICS');
    const [recruiters, setRecruiters] = useState<PendingRecruiter[]>(mockRecruiters);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleVerify = (id: number, name: string, action: 'VERIFIED' | 'REJECTED') => {
        setRecruiters(prev => prev.filter(r => r.id !== id));
        showToast(`Recruiter ${name} has been ${action.toLowerCase()}.`, action === 'VERIFIED' ? 'success' : 'error');
    };

    const analytics = [
        { role: "SW ENGR", apps: "1.2k", trend: "+12%", color: "text-nile-green" },
        { role: "DATA", apps: "856", trend: "+5%", color: "text-nile-blue" },
        { role: "PROD", apps: "412", trend: "-2%", color: "text-red-500" },
        { role: "UX", apps: "289", trend: "+18%", color: "text-nile-green" }
    ];

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-pulse text-left h-full">
                <div className="h-40 md:h-48 bg-black/5 rounded-[24px] md:rounded-[40px] border-[2px] border-black/5"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 md:h-32 bg-black/5 rounded-2xl"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 anime-fade-in font-sans pb-24 md:pb-20 text-left h-full">
            {/* 1. Header & Strategy Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 md:gap-8 border-b-[2px] md:border-b-[3px] border-black pb-6 md:pb-10">
                <div className="space-y-1 md:space-y-2">
                    <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">Logistics .</h2>
                    <p className="text-[8px] md:text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em] truncate">RECRUITMENT FLOWS & AUTH</p>
                </div>
                
                <div className="flex bg-white p-1 border-[2px] border-black rounded-[16px] md:rounded-2xl shadow-sm w-full md:w-auto">
                    {(['ANALYTICS', 'VERIFICATIONS'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-xl font-black text-[8px] md:text-[10px] tracking-widest uppercase transition-all whitespace-nowrap
                                ${activeTab === t ? 'bg-black text-white shadow-[2px_2px_0px_0px_#1E499D]' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {t} {t === 'VERIFICATIONS' && recruiters.length > 0 && (
                                <span className="ml-1.5 md:ml-2 bg-red-500 text-white px-1.5 md:px-2 py-0.5 rounded-full text-[7px] md:text-[8px]">{recruiters.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Content Sections */}
            {activeTab === 'ANALYTICS' ? (
                <div className="space-y-8 md:space-y-12">
                     {/* System Metrics Hero */}
                     <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {analytics.map((s) => (
                            <Card key={s.role} className="p-4 md:p-8 group hover:translate-y-[-2px] transition-all">
                                <div className="flex justify-between items-start mb-3 md:mb-6">
                                    <div className="p-2 bg-nile-white rounded-lg border-[1.5px] border-black group-hover:bg-black group-hover:text-white transition-colors flex-shrink-0">
                                        <Activity size={14} md:size={18} />
                                    </div>
                                    <span className={`text-[7px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black/10 ${s.trend.startsWith('+') ? 'bg-nile-green/10 text-nile-green' : 'bg-red-50 text-red-500'}`}>
                                        {s.trend}
                                    </span>
                                </div>
                                <h3 className="text-xl md:text-3xl font-black text-black leading-none tracking-tighter truncate">{s.apps}</h3>
                                <p className="text-[7px] md:text-[9px] font-black text-black/30 uppercase mt-2 tracking-widest truncate">{s.role}</p>
                            </Card>
                        ))}
                     </section>

                     {/* Top Partner Organizations */}
                     <section className="space-y-6">
                         <div className="flex items-center justify-between px-2">
                            <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] flex items-center text-black/40">
                                <Layers size={14} className="mr-2" /> ENGAGEMENT INDEX
                            </h3>
                         </div>
                         <div className="space-y-3 md:space-y-4">
                            {[
                                { name: 'Google Tech', apps: 850, active: 12 },
                                { name: 'Shell NG', apps: 420, active: 5 },
                                { name: 'Access Bank', apps: 380, active: 8 },
                            ].map(company => (
                                <div key={company.name} className="bg-white border-[2px] border-black rounded-[20px] md:rounded-[24px] p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all hover:bg-nile-white/40 gap-4">
                                    <div className="flex items-center space-x-4 md:space-x-6 min-w-0">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-xl flex items-center justify-center border-2 border-black font-black flex-shrink-0">
                                            {company.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-lg md:text-xl font-black text-black leading-none mb-1 uppercase tracking-tight truncate">{company.name}</h4>
                                            <p className="text-[8px] md:text-[9px] font-black text-nile-blue/40 uppercase tracking-widest truncate">Verified Partner Hub</p>
                                        </div>
                                    </div>
                                    <div className="flex w-full sm:w-auto justify-between sm:justify-end items-center sm:space-x-12 px-1 sm:px-0">
                                         <div className="text-left sm:text-center">
                                            <p className="text-[7px] md:text-[8px] font-black text-black/30 uppercase mb-0.5 md:mb-1">APPS</p>
                                            <p className="text-lg md:text-xl font-black text-black leading-none">{company.apps}</p>
                                        </div>
                                        <div className="text-left sm:text-center">
                                            <p className="text-[7px] md:text-[8px] font-black text-black/30 uppercase mb-0.5 md:mb-1">JOBS</p>
                                            <p className="text-lg md:text-xl font-black text-black leading-none">{company.active}</p>
                                        </div>
                                        <button className="p-2 md:p-3 bg-nile-green/10 text-nile-green border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all flex-shrink-0">
                                            <ArrowUpRight size={16} md:size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                         </div>
                     </section>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in slide-in-from-bottom-2 w-full">
                     <div className="bg-nile-blue/5 border-[2px] border-dashed border-black/10 rounded-[24px] md:rounded-[32px] p-8 md:p-12 text-center space-y-4 md:space-y-6">
                         <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-[2px] border-black rounded-xl md:rounded-2xl flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                             <ShieldCheck size={28} md:size={32} className="text-nile-blue" />
                         </div>
                         <div className="space-y-1 md:space-y-2">
                             <h3 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight leading-none">Vetting Hub</h3>
                             <p className="text-[8px] md:text-[10px] font-bold text-nile-blue/40 uppercase tracking-widest leading-relaxed">System awaiting authorization.</p>
                         </div>
                     </div>

                     <div className="space-y-3 md:space-y-4">
                        {recruiters.map(r => (
                             <div key={r.id} className="bg-white border-[2px] border-black rounded-[20px] md:rounded-[24px] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between shadow-[4px_4px_0px_0px_rgba(30,73,157,0.1)] group hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all gap-4">
                                <div className="flex items-center space-x-3 md:space-x-4">
                                    <Avatar name={r.name} size="sm" />
                                    <div className="text-left min-w-0">
                                        <h4 className="text-[12px] md:text-sm font-black text-black leading-none mb-1 uppercase truncate">{r.name}</h4>
                                        <p className="text-[8px] md:text-[9px] font-black text-nile-green uppercase tracking-widest truncate">{r.company}</p>
                                    </div>
                                </div>
                                <div className="flex space-x-2 md:space-x-3">
                                    <Button size="xs" fullWidth className="sm:flex-none" onClick={() => handleVerify(r.id, r.name, 'VERIFIED')}>
                                        <UserCheck size={14} className="mr-1 md:mr-2" /> <span className="hidden sm:inline">VERIFY</span><span className="sm:hidden">OK</span>
                                    </Button>
                                    <Button size="xs" variant="outline" fullWidth className="sm:flex-none" onClick={() => handleVerify(r.id, r.name, 'REJECTED')}>
                                        <UserX size={14} className="mr-1 md:mr-2" /> <span className="hidden sm:inline">DENY</span><span className="sm:hidden">NO</span>
                                    </Button>
                                </div>
                             </div>
                        ))}
                        {recruiters.length === 0 && (
                            <div className="py-12 md:py-20 text-center opacity-30 font-black uppercase text-[8px] md:text-[10px] tracking-[0.2em]">
                                SYSTEM STATUS: CLEAR.
                            </div>
                        )}
                     </div>
                </div>
            )}
        </div>
    );
};

export default StaffApplications;
