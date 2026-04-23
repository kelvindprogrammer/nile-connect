import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Clock, FileBadge, ArrowUpRight, ShieldCheck, MapPin, DollarSign } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import InputField from '../../components/InputField';
import { useToast } from '../../context/ToastContext';

type Tab = 'active' | 'post' | 'pending';

const myJobs = [
    { id: 1, title: 'SOFTWARE ENGINEER INTERN', applicants: 145, posted: '2W AGO', location: 'ABUJA' },
    { id: 2, title: 'DATA ANALYST', applicants: 89, posted: '1M AGO', location: 'REMOTE' },
    { id: 3, title: 'PRODUCT MANAGER INTERN', applicants: 42, posted: '3D AGO', location: 'LAGOS' },
];

const EmployerJobs = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [tab, setTab] = useState<Tab>('active');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            showToast('Job listing submitted for Staff review.', 'success');
            setTab('pending');
        }, 1500);
    };

    return (
        <div className="p-4 md:p-10 space-y-8 md:space-y-12 anime-fade-in font-sans pb-24 md:pb-20 text-left">
            {/* 1. Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 md:gap-8 border-b-[2px] md:border-b-[3px] border-black pb-6 md:pb-10">
                <div className="space-y-1 md:space-y-2">
                    <h2 className="text-3xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Job Console .</h2>
                    <p className="text-[10px] md:text-lg font-bold text-nile-blue/50 uppercase tracking-widest flex items-center">
                        Manage your recruitment pipeline <ShieldCheck size={18} className="ml-2 md:ml-3 text-nile-green" />
                    </p>
                </div>
                
                <div className="flex bg-white p-1 md:p-2 border-[2px] md:border-[3px] border-black rounded-[16px] md:rounded-[24px] shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
                    {([
                        { id: 'active', label: 'ACTIVE', icon: <Briefcase size={14} /> },
                        { id: 'post', label: 'POST', icon: <Plus size={14} /> },
                        { id: 'pending', label: 'PENDING', icon: <Clock size={14} /> },
                    ] as const).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-2xl font-black text-[8px] md:text-[10px] tracking-widest uppercase transition-all flex items-center justify-center space-x-2 md:space-x-3 whitespace-nowrap
                                ${tab === t.id ? 'bg-nile-blue text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] md:shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Content Logic */}
            {tab === 'active' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10">
                    {myJobs.map(job => (
                        <Card key={job.id} variant="flat" className="border-[2px] md:border-[3px] border-black p-6 md:p-8 hover:translate-y-[-4px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none flex flex-col justify-between min-h-[180px] md:min-h-[220px]">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3 md:space-y-4 min-w-0">
                                    <div className="space-y-1 min-w-0">
                                         <h3 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight leading-none truncate">{job.title}</h3>
                                         <p className="text-[8px] md:text-[10px] font-black text-nile-blue/40 uppercase tracking-widest flex items-center">
                                             <MapPin size={10} md:size={12} className="mr-1 md:mr-2 flex-shrink-0" /> <span className="truncate">{job.location} • {job.posted}</span>
                                         </p>
                                    </div>
                                    <div className="bg-nile-blue text-white px-2.5 md:px-4 py-1 rounded-full border-[1.5px] border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] font-black text-[7px] md:text-[10px] uppercase tracking-widest inline-block truncate">
                                        {job.applicants} APPLICANTS
                                    </div>
                                </div>
                                <button className="p-2 md:p-3 bg-nile-white border-2 border-black rounded-lg md:rounded-xl hover:bg-black hover:text-white transition-all text-nile-blue flex-shrink-0 ml-4">
                                    <ArrowUpRight size={16} md:size={20} strokeWidth={3} />
                                </button>
                            </div>
                            <div className="pt-4 md:pt-6 border-t-[1.5px] md:border-t-2 border-dashed border-black/5 mt-4 md:mt-6 flex justify-between items-center">
                                 <button onClick={() => navigate('/employer/applications')} className="text-[8px] md:text-[10px] font-black text-nile-blue underline underline-offset-4 hover:text-nile-green transition-colors uppercase tracking-widest">REVIEW CANDIDATES</button>
                                 <button className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-widest">ARCHIVE</button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {tab === 'post' && (
                <div className="max-w-4xl mx-auto anime-slide-up w-full">
                    <Card variant="default" className="p-6 md:p-16">
                         <div className="flex items-center space-x-4 md:space-x-6 mb-8 md:mb-12 pb-6 md:pb-8 border-b-[2px] md:border-b-[3px] border-black/5">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-nile-green text-white rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(30,73,157,1)] flex-shrink-0">
                                <Plus size={24} md:size={32} strokeWidth={3} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-4xl font-black text-black uppercase tracking-tighter truncate">Post Job .</h2>
                                <p className="text-[7px] md:text-[10px] font-black text-nile-blue uppercase tracking-[0.2em] md:tracking-[0.3em] truncate">NEW PROFESSIONAL LISTING</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                <InputField label="JOB TITLE" placeholder="E.G. TECHNICAL MANAGER" required />
                                <InputField label="LISTING TYPE" placeholder="E.G. FULL-TIME" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                <InputField label="LOCATION" placeholder="ABUJA / REMOTE" icon={<MapPin size={16} />} required />
                                <InputField label="SALARY" placeholder="₦400,000 - ₦600,000" icon={<DollarSign size={16} />} />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[8px] md:text-[10px] font-black text-black tracking-[0.15em] md:tracking-[0.2em] uppercase ml-1">SPECIFICATION</label>
                                <textarea 
                                    className="w-full h-32 md:h-48 border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-xs md:text-sm outline-none focus:shadow-[4px_4px_0px_0px_#6CBB56] transition-all bg-nile-white/40"
                                    placeholder="Requirements & responsibilities..."
                                    required
                                ></textarea>
                            </div>

                            <Button type="submit" fullWidth size="sm md:lg" isLoading={isLoading}>
                                SUBMIT FOR REVIEW
                            </Button>
                        </form>
                    </Card>
                </div>
            )}

            {tab === 'pending' && (
                <div className="max-w-2xl mx-auto space-y-6 w-full">
                     <Card className="p-8 md:p-16 text-center space-y-6 md:space-y-8 bg-nile-blue/5 border-dashed border-[3px] md:border-4 border-black/20 rounded-[24px] md:rounded-[40px]">
                          <div className="w-16 h-16 md:w-24 md:h-24 bg-white border-[2px] md:border-[3px] border-black rounded-[20px] md:rounded-[32px] flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                              <FileBadge size={32} md:size={48} className="text-nile-blue" />
                          </div>
                          <div className="space-y-2 md:space-y-3">
                              <h3 className="text-xl md:text-3xl font-black text-black uppercase tracking-tighter">Under Review</h3>
                              <p className="text-[10px] md:text-sm font-bold text-nile-blue/60 uppercase tracking-widest leading-relaxed">Vetting by Nile Career Services <br className="hidden md:block" /> in progress.</p>
                          </div>
                          <div className="pt-4 md:pt-8 flex flex-col items-center space-y-4 font-black">
                               <div className="flex items-center space-x-2 text-nile-green text-[8px] md:text-[10px] uppercase tracking-widest">
                                   <div className="pulse-green"></div>
                                   <span>STATUS: VERIFYING</span>
                               </div>
                               <Button variant="outline" size="sm" onClick={() => setTab('active')}>ALL JOBS</Button>
                          </div>
                     </Card>
                </div>
            )}

        </div>
    );
};

export default EmployerJobs;
