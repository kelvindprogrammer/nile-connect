import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Star, Users, MapPin, GraduationCap, ArrowUpRight, Zap, Target, ExternalLink } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

const candidates = [
    { id: 1, name: 'GRACE STANLEY', major: 'COMPUTER SCIENCE', level: '400L', skills: ['REACT', 'NODE.JS', 'TYPESCRIPT'], match: 98, stats: { gpa: '3.9', projects: 12 }, location: 'ABUJA' },
    { id: 2, name: 'MICHAEL BROWN', major: 'DATA SCIENCE', level: 'ALUMNI', skills: ['PYTHON', 'PYTORCH', 'SQL'], match: 92, stats: { gpa: '3.7', projects: 8 }, location: 'LAGOS' },
    { id: 3, name: 'AISHAT YUSUF', major: 'CYBERSECURITY', level: '300L', skills: ['SIEM', 'NETWORK SECURITY'], match: 85, stats: { gpa: '3.8', projects: 5 }, location: 'REMOTE' },
];

const EmployerCandidates = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'recommended' | 'saved' | 'all'>('recommended');
    const [searchTerm, setSearchTerm] = useState('');

    const handleAction = (name: string, action: string) => {
        showToast(`${action} action triggered for ${name}`, 'success');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-10 anime-fade-in font-sans pb-20 text-left h-full">
            {/* 1. Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b-[2px] border-black pb-6 md:pb-8">
                <div className="space-y-1">
                    <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">Talent Pool .</h2>
                    <p className="text-[8px] md:text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em] flex items-center">
                        NILE GRADUATE RECRUITMENT <Target size={14} className="ml-2 text-nile-green" />
                    </p>
                </div>
                
                <div className="flex bg-white p-1 border-[2px] border-black rounded-xl shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
                    {(['recommended', 'saved', 'all'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg font-black text-[8px] md:text-[9px] tracking-widest uppercase transition-all whitespace-nowrap
                                ${tab === t ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1 relative group w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                    <input 
                        type="text" 
                        placeholder="FILTER BY SKILLS, MAJOR..." 
                        className="w-full pl-11 pr-4 py-3 md:py-3.5 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1E499D] transition-all bg-nile-white/40 placeholder:text-black/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                     <Filter size={14} className="mr-2" /> FILTERS
                </Button>
            </div>

            {/* 3. Talent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map(candidate => (
                    <div key={candidate.id} className="group relative bg-white border-[2px] border-black rounded-[20px] md:rounded-[24px] p-5 md:p-6 transition-all hover:translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
                        
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center space-x-3 min-w-0">
                                <Avatar name={candidate.name} size="md" />
                                <div className="min-w-0">
                                    <h3 className="text-base md:text-lg font-black text-black uppercase tracking-tight leading-none mb-1 truncate">{candidate.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[7px] md:text-[8px] font-black text-nile-blue/50 uppercase truncate">{candidate.major}</span>
                                        <span className="text-[7px] md:text-[8px] font-black text-nile-green uppercase">{candidate.level}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-nile-green text-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border border-black shadow-[2px_2px_0px_0px_#000] text-[6px] md:text-[8px] font-black flex-shrink-0">
                                {candidate.match}% MATCH
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-black/10">
                                <div className="text-left">
                                    <p className="text-[6px] md:text-[7px] font-black text-black/30 uppercase tracking-widest">GPA</p>
                                    <p className="text-xs md:text-sm font-black text-black">{candidate.stats.gpa}<span className="text-[8px] md:text-[9px] text-black/30"> / 4.0</span></p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[6px] md:text-[7px] font-black text-black/30 uppercase tracking-widest">PROJECTS</p>
                                    <p className="text-xs md:text-sm font-black text-black">{candidate.stats.projects}+</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <p className="text-[6px] md:text-[7px] font-black text-black/20 uppercase tracking-widest">SKILLS</p>
                                <div className="flex flex-wrap gap-1">
                                    {candidate.skills.slice(0, 3).map(s => (
                                        <span key={s} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-nile-white border border-black/10 rounded-md text-[6px] md:text-[7px] font-black text-black uppercase truncate">{s}</span>
                                    ))}
                                    {candidate.skills.length > 3 && <span className="text-[6px] md:text-[7px] font-black text-black/20 self-center">+{candidate.skills.length - 3}</span>}
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 md:space-x-4 text-[7px] md:text-[8px] font-black text-black/30 uppercase pt-4 border-t border-black/5">
                                <span className="flex items-center"><MapPin size={10} className="mr-1 text-nile-green" /> {candidate.location}</span>
                                <span className="flex items-center"><Zap size={10} className="mr-1 text-nile-blue" /> TOP 5%</span>
                            </div>
                        </div>

                        {/* Professional Actions */}
                        <div className="mt-8 flex flex-col gap-2">
                             <Button size="sm" fullWidth onClick={() => handleAction(candidate.name, 'Contact')}>
                                 INTERVIEW <ArrowUpRight size={14} className="ml-1" />
                             </Button>
                             <Button variant="outline" size="sm" fullWidth onClick={() => navigate(`/employer/candidates/${candidate.id}`)}>
                                 DETAILS <ExternalLink size={12} className="ml-1" />
                             </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load more */}
            <div className="pt-6 md:pt-10">
                <button className="w-full py-8 md:py-12 border-[2px] border-dashed border-black/5 rounded-[24px] md:rounded-[32px] text-[8px] md:text-[10px] font-black text-nile-blue/20 hover:border-black/20 hover:text-black/40 transition-all uppercase tracking-[0.2em]">
                    Syncing Additional Profiles ...
                </button>
            </div>
        </div>
    );
};

export default EmployerCandidates;
