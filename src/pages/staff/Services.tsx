import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, PieChart, Layers, Terminal, CheckCircle2, ChevronRight, Download, BarChart2 } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import InputField from '../../components/InputField';
import { useToast } from '../../context/ToastContext';

interface Review {
    id: number;
    name: string;
    major: string;
    doc: string;
    date: string;
    status: 'PENDING' | 'REVIEWED';
}

const mockReviews: Review[] = [
    { id: 1, name: 'GRACE STANLEY', major: 'COMPUTER SCIENCE', doc: 'Professional Resume V2', date: 'TODAY', status: 'PENDING' },
    { id: 2, name: 'MICHAEL BROWN', major: 'BUSINESS ADMIN', doc: 'Consulting CV', date: 'YESTERDAY', status: 'PENDING' },
    { id: 3, name: 'AISHAT YUSUF', major: 'CYBERSECURITY', doc: 'Technical Portfolio', date: '2D AGO', status: 'REVIEWED' },
];

const StaffServices = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('CV REVIEW');
    const [reviews, setReviews] = useState<Review[]>(mockReviews);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleReviewAction = (id: number, name: string) => {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'REVIEWED' } : r));
        showToast(`Feedback for ${name} has been saved and dispatched.`, 'success');
    };

    const tabs = [
        { id: 'CV REVIEW', icon: <FileText size={14} />, count: reviews.filter(r => r.status === 'PENDING').length },
        { id: 'PLACEMENTS', icon: <PieChart size={14} />, count: 5 },
        { id: 'ASSESSMENTS', icon: <Terminal size={14} />, count: 8 },
        { id: 'REPORTING', icon: <BarChart2 size={14} />, count: null },
    ];

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse text-left h-full">
                <div className="h-16 bg-black/5 rounded-2xl w-1/3"></div>
                <div className="h-14 bg-black/5 rounded-xl w-1/2"></div>
                <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-black/5 rounded-[24px]"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 anime-fade-in font-sans pb-20 text-left h-full">
            
            {/* 1. Services Navigation */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b-[2px] border-black pb-8">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-black leading-none uppercase tracking-tighter">Services Hub .</h2>
                    <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">CAREER ACCELERATION & LOGISTICS</p>
                </div>
                
                <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-5 py-2.5 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all flex items-center space-x-2
                                ${activeTab === t.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_#1E499D]' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {t.icon}
                            <span>{t.id}</span>
                            {t.count && (
                                <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[7px] font-black ${activeTab === t.id ? 'bg-nile-green text-black' : 'bg-black/10 text-black/40'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Content Logic */}
            {activeTab === 'CV REVIEW' && (
                <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                        <div className="relative group flex-1 w-full">
                             <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                             <input 
                                type="text" 
                                placeholder="FILTER PENDING..." 
                                className="w-full pl-12 pr-6 py-4 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-nile-white/40"
                             />
                        </div>
                        <Button variant="primary" size="sm">
                            <Plus size={16} className="mr-2" /> NEW BATCH
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {reviews.map(item => (
                            <div key={item.id} className="bg-white border-[2px] border-black rounded-[24px] p-5 flex flex-col md:flex-row items-center justify-between transition-all hover:translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-[2px] border-black shadow-[2px_2px_0px_0px_#000] rotate-[-2deg] transition-colors ${item.status === 'REVIEWED' ? 'bg-nile-green/20' : 'bg-nile-blue text-white'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center space-x-3 mb-0.5">
                                            <h4 className="text-sm font-black text-black uppercase">{item.name}</h4>
                                            <span className={`text-[7px] font-black px-2 py-0.5 rounded border border-black/10 ${item.status === 'REVIEWED' ? 'bg-nile-green/10 text-nile-green' : 'bg-nile-blue/10 text-nile-blue'}`}>{item.status}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">
                                            {item.major} • {item.doc} • SUBMITTED: {item.date}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 md:mt-0 flex space-x-2">
                                    <Button 
                                        variant={item.status === 'REVIEWED' ? 'outline' : 'primary'} 
                                        size="sm"
                                        onClick={() => handleReviewAction(item.id, item.name)}
                                    >
                                        {item.status === 'REVIEWED' ? 'RE-REVIEW' : 'START REVIEW'}
                                    </Button>
                                    <Button variant="ghost" size="sm"><Download size={14} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'REPORTING' && (
                <div className="max-w-4xl mx-auto anime-slide-up">
                    <Card title="DATA GENERATION BOARD" className="text-left">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-black tracking-[0.2em] uppercase ml-1">REPORT MATRIX</label>
                                    <select className="w-full bg-nile-white/40 border-[2px] border-black rounded-lg py-3 px-4 font-black text-[10px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                                        <option>STUDENT ENGAGEMENT</option>
                                        <option>PLACEMENT CONVERSION</option>
                                        <option>ROI ANALYTICS</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-black tracking-[0.2em] uppercase ml-1">TEMPORAL RANGE</label>
                                    <select className="w-full bg-nile-white/40 border-[2px] border-black rounded-lg py-3 px-4 font-black text-[10px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                                        <option>CURRENT QUARTER (Q2)</option>
                                        <option>ALL PLATFORM HISTORY</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-nile-blue/5 border-[2px] border-dashed border-black/10 rounded-[32px] p-6 flex flex-col justify-center items-center text-center space-y-4">
                                <div className="bg-white p-3 rounded-xl border border-black shadow-sm">
                                    <Download size={24} className="text-nile-blue" />
                                </div>
                                <p className="text-[10px] font-bold text-nile-blue/50 uppercase leading-relaxed">System ready for download. <br/> Check internal logs.</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t-[2px] border-black/5 flex gap-3">
                            <Button fullWidth size="md" onClick={() => showToast('Dispatching report to cloud...', 'success')}>GENERATE REPORT</Button>
                            <Button variant="outline" fullWidth size="md">SYNC LOGS</Button>
                        </div>
                    </Card>
                </div>
            )}

            {(activeTab === 'PLACEMENTS' || activeTab === 'ASSESSMENTS') && (
                <div className="py-24 text-center border-2 border-dashed border-black/10 rounded-[40px] anime-fade-in">
                     <div className="w-14 h-14 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 text-black/20">
                         <Layers size={24} />
                     </div>
                     <h3 className="text-lg font-black text-black uppercase tracking-tight mb-1">Subsystem Offline</h3>
                     <p className="text-[9px] font-black text-nile-blue/30 uppercase tracking-[0.2em]">CONNECTING TO EXTERNAL EVALUATION API...</p>
                </div>
            )}
            
        </div>
    );
};

export default StaffServices;
