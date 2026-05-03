import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Clock, FileBadge, ArrowUpRight, ShieldCheck, MapPin, DollarSign, Loader2 } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import InputField from '../../components/InputField';
import { useToast } from '../../context/ToastContext';
import { getEmployerJobs, postJob, JobListing } from '../../services/employerService';

type Tab = 'active' | 'post' | 'pending';

const EmployerJobs = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [tab, setTab] = useState<Tab>('active');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [jobs, setJobs] = useState<JobListing[]>([]);

    const [form, setForm] = useState({
        title: '', type: '', location: '', salary: '', description: '', requirements: '', skills: '',
    });

    useEffect(() => {
        if (tab === 'active') {
            setIsLoadingJobs(true);
            getEmployerJobs()
                .then(setJobs)
                .catch(() => setJobs([]))
                .finally(() => setIsLoadingJobs(false));
        }
    }, [tab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const created = await postJob({
                title: form.title,
                type: form.type.toLowerCase(),
                location: form.location,
                salary: form.salary,
                description: form.description,
                requirements: form.requirements,
                skills: form.skills,
            });
            showToast('Job listing submitted for Staff review.', 'success');
            setJobs(prev => [created, ...prev]);
            setTab('pending');
            setForm({ title: '', type: '', location: '', salary: '', description: '', requirements: '', skills: '' });
        } catch (err: any) {
            showToast(err?.response?.data?.error || 'Submission failed. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeJobs = jobs.filter(j => j.status === 'active');
    const pendingJobs = jobs.filter(j => j.status === 'pending');

    return (
        <div className="p-4 md:p-10 space-y-8 md:space-y-12 anime-fade-in font-sans pb-24 md:pb-20 text-left">
            {/* Header */}
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
                        { id: 'post',   label: 'POST',   icon: <Plus size={14} /> },
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
                            {t.id === 'pending' && pendingJobs.length > 0 && (
                                <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">{pendingJobs.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Tab */}
            {tab === 'active' && (
                isLoadingJobs ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : activeJobs.length === 0 ? (
                    <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[24px]">
                        <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] mb-4">NO ACTIVE JOBS</p>
                        <Button size="sm" onClick={() => setTab('post')}>POST A JOB</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10">
                        {activeJobs.map(job => (
                            <Card key={job.id} variant="flat" className="border-[2px] md:border-[3px] border-black p-6 md:p-8 hover:translate-y-[-4px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none flex flex-col justify-between min-h-[180px] md:min-h-[220px]">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-3 md:space-y-4 min-w-0">
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight leading-none truncate">{job.title}</h3>
                                            <p className="text-[8px] md:text-[10px] font-black text-nile-blue/40 uppercase tracking-widest flex items-center">
                                                <MapPin size={10} className="mr-1 flex-shrink-0" />
                                                <span className="truncate">{job.location} • {job.type?.toUpperCase()}</span>
                                            </p>
                                        </div>
                                        <div className="bg-nile-blue text-white px-2.5 md:px-4 py-1 rounded-full border-[1.5px] border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] font-black text-[7px] md:text-[10px] uppercase tracking-widest inline-block">
                                            {job.applicant_count} APPLICANT{job.applicant_count !== 1 ? 'S' : ''}
                                        </div>
                                    </div>
                                    <button className="p-2 md:p-3 bg-nile-white border-2 border-black rounded-lg md:rounded-xl hover:bg-black hover:text-white transition-all text-nile-blue flex-shrink-0 ml-4">
                                        <ArrowUpRight size={18} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="pt-4 md:pt-6 border-t-[1.5px] md:border-t-2 border-dashed border-black/5 mt-4 md:mt-6 flex justify-between items-center">
                                    <button onClick={() => navigate('/applications')} className="text-[8px] md:text-[10px] font-black text-nile-blue underline underline-offset-4 hover:text-nile-green transition-colors uppercase tracking-widest">REVIEW CANDIDATES</button>
                                    <button className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-widest">ARCHIVE</button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            )}

            {/* Post Tab */}
            {tab === 'post' && (
                <div className="max-w-4xl mx-auto anime-slide-up w-full">
                    <Card variant="default" className="p-6 md:p-16">
                        <div className="flex items-center space-x-4 md:space-x-6 mb-8 md:mb-12 pb-6 md:pb-8 border-b-[2px] md:border-b-[3px] border-black/5">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-nile-green text-white rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(30,73,157,1)] flex-shrink-0">
                                <Plus size={28} strokeWidth={3} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-4xl font-black text-black uppercase tracking-tighter truncate">Post Job .</h2>
                                <p className="text-[7px] md:text-[10px] font-black text-nile-blue uppercase tracking-[0.2em] md:tracking-[0.3em] truncate">NEW PROFESSIONAL LISTING</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                <InputField label="JOB TITLE" placeholder="E.G. TECHNICAL MANAGER" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                <InputField label="LISTING TYPE" placeholder="E.G. FULL-TIME" required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                <InputField label="LOCATION" placeholder="ABUJA / REMOTE" icon={<MapPin size={16} />} required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                                <InputField label="SALARY" placeholder="₦400,000 - ₦600,000" icon={<DollarSign size={16} />} value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
                            </div>

                            <InputField label="REQUIRED SKILLS (COMMA SEPARATED)" placeholder="React, TypeScript, PostgreSQL" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />

                            <div className="space-y-3">
                                <label className="text-[8px] md:text-[10px] font-black text-black tracking-[0.15em] md:tracking-[0.2em] uppercase ml-1">JOB DESCRIPTION</label>
                                <textarea
                                    className="w-full h-32 md:h-48 border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-xs md:text-sm outline-none focus:shadow-[4px_4px_0px_0px_#6CBB56] transition-all bg-nile-white/40"
                                    placeholder="Responsibilities & role overview..."
                                    required
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                ></textarea>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[8px] md:text-[10px] font-black text-black tracking-[0.15em] md:tracking-[0.2em] uppercase ml-1">REQUIREMENTS</label>
                                <textarea
                                    className="w-full h-24 md:h-36 border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl p-4 md:p-6 font-bold text-xs md:text-sm outline-none focus:shadow-[4px_4px_0px_0px_#6CBB56] transition-all bg-nile-white/40"
                                    placeholder="Minimum qualifications & experience..."
                                    required
                                    value={form.requirements}
                                    onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                                ></textarea>
                            </div>

                            <Button type="submit" fullWidth size="md" isLoading={isSubmitting}>
                                SUBMIT FOR REVIEW
                            </Button>
                        </form>
                    </Card>
                </div>
            )}

            {/* Pending Tab */}
            {tab === 'pending' && (
                <div className="max-w-2xl mx-auto space-y-6 w-full">
                    {pendingJobs.length > 0 ? (
                        <div className="space-y-4">
                            {pendingJobs.map(job => (
                                <div key={job.id} className="bg-white border-[2px] border-black rounded-[20px] p-5 md:p-6 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="min-w-0">
                                        <h4 className="font-black text-sm md:text-base uppercase text-black truncate">{job.title}</h4>
                                        <p className="text-[8px] md:text-[9px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">{job.location} • PENDING REVIEW</p>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                                        <span className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">REVIEWING</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 md:p-16 text-center space-y-6 md:space-y-8 bg-nile-blue/5 border-dashed border-[3px] md:border-4 border-black/20 rounded-[24px] md:rounded-[40px]">
                            <div className="w-16 h-16 md:w-24 md:h-24 bg-white border-[2px] md:border-[3px] border-black rounded-[20px] md:rounded-[32px] flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <FileBadge size={40} className="text-nile-blue" />
                            </div>
                            <div className="space-y-2 md:space-y-3">
                                <h3 className="text-xl md:text-3xl font-black text-black uppercase tracking-tighter">No Pending Jobs</h3>
                                <p className="text-[10px] md:text-sm font-bold text-nile-blue/60 uppercase tracking-widest leading-relaxed">Post a job listing to get started.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setTab('post')}>POST A JOB</Button>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployerJobs;
