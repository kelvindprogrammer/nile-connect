import React, { useState, useEffect } from 'react';
import { FileText, Mail, Phone, MessageSquare, ChevronRight, UserCheck, UserX, Clock, Filter, Search } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';

interface Applicant {
    id: number;
    name: string;
    major: string;
    appliedDate: string;
    status: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
    score: number;
}

const mockApplicants: Applicant[] = [
    { id: 1, name: 'Grace Stanley', major: 'Computer Science', appliedDate: '2d ago', status: 'SCREENING', score: 98 },
    { id: 2, name: 'Michael Brown', major: 'Mechanical Engineering', appliedDate: '2d ago', status: 'APPLIED', score: 85 },
    { id: 3, name: 'Aishat Yusuf', major: 'Business Admin', appliedDate: '3d ago', status: 'INTERVIEW', score: 92 },
    { id: 4, name: 'Ibrahim Musa', major: 'Information Tech', appliedDate: '4d ago', status: 'APPLIED', score: 88 },
];

const EmployerApplications = () => {
    const { showToast } = useToast();
    const [activeJobId, setActiveJobId] = useState(1);
    const [applicants, setApplicants] = useState<Applicant[]>(mockApplicants);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, [activeJobId]);

    const handleStatusChange = (id: number, newStatus: Applicant['status']) => {
        setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        showToast(`Candidate status updated to ${newStatus}`, 'success');
    };

    const stats = [
        { label: 'APPLIED', count: applicants.filter(a => a.status === 'APPLIED').length + 14 },
        { label: 'SCREENING', count: applicants.filter(a => a.status === 'SCREENING').length + 5 },
        { label: 'INTERVIEW', count: applicants.filter(a => a.status === 'INTERVIEW').length + 2 },
        { label: 'OFFER', count: 1 },
    ];

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse text-left h-full">
                <div className="h-20 bg-black/5 rounded-2xl w-1/3"></div>
                <div className="grid grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 bg-black/5 rounded-2xl"></div>)}
                </div>
                <div className="space-y-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-20 bg-black/5 rounded-3xl"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 anime-fade-in font-sans pb-20 text-left h-full">
            {/* 1. Header & Job Navigator */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b-[2px] border-black pb-8">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-black leading-none uppercase tracking-tighter">Applications Board .</h2>
                    <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">REVIEW CANDIDATE PIPELINES & TALENT</p>
                </div>
                
                <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm">
                    {[{ id: 1, label: 'SOFTWARE ENGR' }, { id: 2, label: 'DATA ANALYST' }].map(job => (
                        <button
                            key={job.id}
                            onClick={() => setActiveJobId(job.id)}
                            className={`px-6 py-2.5 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all
                                ${activeJobId === job.id ? 'bg-black text-white' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {job.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Professional Pipeline Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s) => (
                    <Card key={s.label} variant="flat" className="p-6 border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] text-center flex flex-col justify-center items-center group hover:bg-black hover:text-white transition-all cursor-default">
                        <p className="text-3xl font-black leading-none group-hover:scale-110 transition-transform">{s.count}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest mt-2">{s.label}</p>
                    </Card>
                ))}
            </div>

            {/* 3. Applicant Management */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                
                {/* Left: Applicant List */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
                            <Filter size={14} className="mr-2 text-nile-blue" /> CANDIDATE LIST
                        </h3>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                            <input type="text" placeholder="FILTER..." className="pl-9 pr-4 py-2 border-[2px] border-black rounded-lg bg-nile-white text-[9px] font-black uppercase tracking-widest outline-none focus:bg-white" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {applicants.map((a) => (
                            <div key={a.id} className="bg-white border-[2px] border-black rounded-[24px] p-5 flex flex-col md:flex-row items-center justify-between transition-all hover:translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-center space-x-4">
                                    <Avatar name={a.name} size="sm" />
                                    <div>
                                        <div className="flex items-center space-x-3 mb-1">
                                            <h4 className="text-sm font-black text-black uppercase">{a.name}</h4>
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded border border-black/10 bg-nile-blue/5 text-nile-blue uppercase">{a.status}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">
                                            {a.major} • {a.appliedDate} • AI SCORE: <span className="text-nile-green">{a.score}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 md:mt-0 flex space-x-3">
                                    {a.status === 'APPLIED' && (
                                        <Button size="xs" onClick={() => handleStatusChange(a.id, 'SCREENING')}>SHORTLIST</Button>
                                    )}
                                    {a.status === 'SCREENING' && (
                                        <Button size="xs" variant="secondary" onClick={() => handleStatusChange(a.id, 'INTERVIEW')}>SCHEDULE</Button>
                                    )}
                                    {a.status === 'INTERVIEW' && (
                                        <Button size="xs" variant="primary" onClick={() => handleStatusChange(a.id, 'OFFER')}>EXTEND OFFER</Button>
                                    )}
                                    <Button size="xs" variant="outline">RESUME</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Administrative Support */}
                <div className="xl:col-span-4 space-y-8">
                     <Card title="RECRUITER SUPPORT" className="text-left">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center border-2 border-black">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase text-black leading-none">Sarah Jenkins</h4>
                                <p className="text-[8px] font-bold text-nile-blue/40 uppercase mt-1 tracking-widest">Placement Director</p>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-nile-blue/60 leading-relaxed uppercase mb-6">
                            "Having issues with a candidate profile or technical assessment integration? We are here to help."
                        </p>
                        <div className="space-y-3">
                            <Button fullWidth onClick={() => showToast('Connecting to staff chat...', 'success')}>
                                <MessageSquare size={14} className="mr-2" /> MESSAGE STAFF
                            </Button>
                            <Button fullWidth variant="outline">
                                <Phone size={14} className="mr-2" /> CALL CAREER SVC
                            </Button>
                        </div>
                     </Card>

                     <Card title="QUICK METRICS">
                        <div className="space-y-6">
                            {[
                                { label: 'GENDER BALANCE', val: 55 },
                                { label: 'DEPT DIVERSITY', val: 78 },
                                { label: 'AVG. TEST SCORE', val: 92 },
                            ].map((m) => (
                                <div key={m.label} className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                                        <span>{m.label}</span>
                                        <span className="text-nile-blue">{m.val}%</span>
                                    </div>
                                    <div className="h-2 bg-nile-white border-[1px] border-black/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-nile-green" style={{ width: `${m.val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                     </Card>
                </div>
            </div>
        </div>
    );
};

export default EmployerApplications;
