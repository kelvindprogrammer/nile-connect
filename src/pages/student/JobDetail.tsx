import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ArrowLeft, MapPin, DollarSign, Clock, Briefcase, Bookmark, ExternalLink, ShieldCheck } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';

const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock data for the job
    const job = { 
        id: 1, 
        company: 'TECH INNOVATIONS INC.', 
        title: 'FRONTEND ENGINEER', 
        location: 'Lagos, Nigeria', 
        salary: '₦200k – ₦350k/mo', 
        type: 'FULL-TIME', 
        tags: ['React', 'TypeScript', 'Tailwind CSS'], 
        logo: 'TI', 
        saved: true,
        postedAt: '2 days ago',
        description: 'We are looking for a highly skilled Frontend Engineer to join our core product team. You will be responsible for building responsive, accessible, and highly interactive user interfaces using modern web technologies. You will collaborate closely with product managers, UX designers, and backend engineers to deliver exceptional user experiences.',
        requirements: [
            '2+ years of experience with React.js and modern JavaScript (ES6+)',
            'Strong understanding of HTML5, CSS3, and responsive design',
            'Experience with state management libraries (Redux, Zustand, etc)',
            'Familiarity with RESTful APIs and GraphQL',
            'Strong communication skills and ability to work in a fast-paced team'
        ],
        benefits: [
            'Comprehensive health insurance',
            'Remote work flexibility (Hybrid schedule)',
            'Annual learning and development budget',
            'Stock options for top performers'
        ]
    };

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 anime-fade-in font-sans pb-20 text-left h-full">
                
                {/* Back Navigation */}
                <button 
                    onClick={() => navigate('/student/jobs')}
                    className="flex items-center space-x-2 text-black/40 font-black uppercase tracking-widest text-[9px] hover:text-black transition-colors"
                >
                    <ArrowLeft size={14} strokeWidth={3} />
                    <span>BACK TO JOB BOARD</span>
                </button>

                {/* Job Header */}
                <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 !p-8">
                    <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 rounded-[28px] bg-nile-blue text-nile-white flex items-center justify-center text-3xl font-black border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] flex-shrink-0">
                            {job.logo}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center space-x-3 mb-1">
                                <h1 className="text-3xl font-black text-black uppercase leading-none tracking-tighter">{job.title}</h1>
                                <span className="bg-nile-green/20 text-nile-green px-2 py-0.5 rounded text-[8px] font-black border border-nile-green/30">VERIFIED</span>
                            </div>
                            <p className="text-xs font-bold text-nile-blue/50 uppercase tracking-widest">{job.company}</p>
                            <div className="flex items-center gap-4 pt-2">
                                <span className="text-[9px] font-black uppercase text-black/40 tracking-widest flex items-center">
                                    <Clock size={12} className="mr-1.5" /> POSTED {job.postedAt}
                                </span>
                                <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">{job.type}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button variant="outline" size="md" className="px-5">
                            <Bookmark size={18} fill={job.saved ? 'black' : 'none'} />
                        </Button>
                        <Button variant="primary" size="md" className="flex-1 md:flex-none" onClick={() => navigate('/student/applications')}>
                            APPLY NOW <ExternalLink size={16} className="ml-2" />
                        </Button>
                    </div>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* Main Content */}
                    <div className="xl:col-span-2 space-y-8">
                        <Card title="ROLE DESCRIPTION">
                            <p className="font-bold text-nile-blue/80 leading-relaxed text-[11px] mb-6">
                                {job.description}
                            </p>
                            
                            <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4 flex items-center">
                                <ShieldCheck size={14} className="mr-2 text-nile-green" /> KEY REQUIREMENTS
                            </h4>
                            <ul className="space-y-3 mb-8">
                                {job.requirements.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0 w-2 h-2 bg-black rounded-full" />
                                        <span className="font-bold text-nile-blue/70 text-[10px] uppercase">{req}</span>
                                    </li>
                                ))}
                            </ul>

                            <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4">PERKS & BENEFITS</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {job.benefits.map((ben, idx) => (
                                    <div key={idx} className="bg-nile-white/40 border-[2px] border-black rounded-xl p-3 font-bold text-nile-blue/80 text-[10px] uppercase flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-nile-green rounded-full shadow-sm" />
                                        {ben}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Overview */}
                    <div className="space-y-8">
                        <Card title="DETAILS">
                            <div className="space-y-5">
                                <DetailItem icon={<MapPin size={16} />} label="LOCATION" value={job.location} color="text-nile-blue" />
                                <DetailItem icon={<DollarSign size={16} />} label="SALARY" value={job.salary} color="text-nile-green" />
                                <DetailItem icon={<Briefcase size={16} />} label="EXPERIENCE" value="ENTRY - MID LEVEL" color="text-nile-blue" />
                            </div>
                            
                            <div className="mt-8 pt-6 border-t-[2px] border-black/5">
                                <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-4">CORE STACK</p>
                                <div className="flex flex-wrap gap-2">
                                    {job.tags.map(tag => (
                                        <span key={tag} className="text-[8px] font-black text-black uppercase px-2.5 py-1 bg-nile-white border-[2px] border-black rounded-lg hover:bg-black hover:text-white transition-colors cursor-pointer leading-none">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

const DetailItem = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
    <div className="flex items-start gap-4">
        <div className={`w-9 h-9 bg-nile-white rounded-xl border-[2px] border-black flex items-center justify-center ${color} shadow-sm`}>
            {icon}
        </div>
        <div className="text-left">
            <p className="text-[8px] font-black text-black/30 uppercase tracking-[0.2em]">{label}</p>
            <p className="text-[10px] font-black text-black uppercase tracking-tight">{value}</p>
        </div>
    </div>
);

export default JobDetail;
