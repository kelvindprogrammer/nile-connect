import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, GraduationCap, Briefcase, Star, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';

const CandidateDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock candidate data
    const candidate = {
        id: 1,
        name: 'GRACE STANLEY',
        major: 'COMPUTER SCIENCE',
        level: 'L400 (FINAL YEAR)',
        email: 'grace.stanley@nileuni.edu.ng',
        phone: '+234 812 345 6789',
        location: 'Abuja, Nigeria',
        gpa: '3.94 / 4.0',
        match: 98,
        bio: 'Highly motivated Computer Science student with a strong foundation in Frontend Development and UI/UX Principles. Seeking a challenging role to apply my React and TypeScript skills in a production environment.',
        skills: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'PostgreSQL', 'Figma', 'GraphQL'],
        experience: [
            { role: 'Frontend Intern', company: 'Tech Innovations Inc.', period: 'Jun - Sep 2024', desc: 'Accelerated UI performance by 40% using specialized caching strategies.' },
            { role: 'Developer Lead', company: 'Google DSC Nile', period: '2023 - Present', desc: 'Spearheading campus-wide technical workshops for 200+ students.' }
        ],
        education: 'B.Sc. Computer Science, Nile University (Expected 2025)'
    };

    return (
        <div className="p-8 space-y-8 anime-fade-in font-sans pb-20 text-left h-full">
            
            {/* Nav */}
            <button 
                onClick={() => navigate('/candidates')}
                className="flex items-center space-x-2 text-black/40 font-black uppercase tracking-widest text-[9px] hover:text-black transition-colors"
            >
                <ArrowLeft size={14} strokeWidth={3} />
                <span>BACK TO TALENT POOL</span>
            </button>

            {/* Header Card */}
            <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 !p-8 border-nile-green/30">
                <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 rounded-[32px] border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] overflow-hidden">
                        <Avatar name={candidate.name} size="lg" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-3 mb-1">
                            <h1 className="text-3xl font-black text-black uppercase leading-none tracking-tighter">{candidate.name} .</h1>
                            <span className="bg-nile-blue text-white px-2 py-0.5 rounded text-[8px] font-black border border-black shadow-[2px_2px_0px_0px_#6CBB56]">TOP 1%</span>
                        </div>
                        <p className="text-xs font-bold text-nile-blue/50 uppercase tracking-widest">{candidate.major} • {candidate.level}</p>
                        <div className="flex items-center gap-4 pt-2 text-[9px] font-black text-black/30 uppercase tracking-widest">
                            <span className="flex items-center"><MapPin size={12} className="mr-1.5 text-nile-green" /> {candidate.location}</span>
                            <span className="flex items-center"><GraduationCap size={12} className="mr-1.5 text-nile-blue" /> CGPA {candidate.gpa}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" size="md">
                        <Star size={18} />
                    </Button>
                    <Button variant="primary" size="md" className="flex-1 md:flex-none">
                        SCHEDULE INTERVIEW <ExternalLink size={16} className="ml-2" />
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Main Body */}
                <div className="xl:col-span-2 space-y-8">
                    <Card title="CANDIDATE PROFILE">
                        <p className="font-bold text-nile-blue/80 leading-relaxed text-[11px] mb-8 uppercase">
                            {candidate.bio}
                        </p>

                        <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4 flex items-center">
                            <Briefcase size={14} className="mr-2 text-nile-blue" /> PROFESSIONAL ENGAGEMENT
                        </h4>
                        <div className="space-y-4 mb-8">
                            {candidate.experience.map((exp, i) => (
                                <div key={i} className="p-4 bg-nile-white/40 border-[2px] border-black rounded-2xl relative overflow-hidden group hover:translate-x-1 transition-transform">
                                    <div className="flex justify-between mb-1">
                                        <p className="text-xs font-black text-black uppercase">{exp.role}</p>
                                        <p className="text-[8px] font-black text-nile-blue/50 uppercase">{exp.period}</p>
                                    </div>
                                    <p className="text-[9px] font-black text-nile-blue/50 uppercase mb-2 leading-none">{exp.company}</p>
                                    <p className="text-[10px] font-bold text-black/70 leading-relaxed">{exp.desc}</p>
                                </div>
                            ))}
                        </div>

                        <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4">MATCHED SKILLS</h4>
                        <div className="flex flex-wrap gap-2">
                            {candidate.skills.map(skill => (
                                <span key={skill} className="px-3 py-1.5 bg-white border-[2px] border-black rounded-lg text-[9px] font-black text-nile-blue uppercase hover:bg-black hover:text-white transition-colors cursor-default">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <Card title="CONTACT VETTING">
                        <div className="space-y-4">
                            <ContactItem icon={<Mail size={16} />} label="NILE EMAIL" value={candidate.email} />
                            <ContactItem icon={<Phone size={16} />} label="PHONE" value={candidate.phone} />
                            <ContactItem icon={<ShieldCheck size={16} />} label="VERIFICATION" value="ID: NC-4920-GS" />
                        </div>
                        <div className="mt-8 pt-6 border-t-[2px] border-black/5">
                            <Button variant="outline" fullWidth size="sm">
                                <Download size={14} className="mr-2" /> RECRUITMENT PACK (PDF)
                            </Button>
                        </div>
                    </Card>

                    <Card title="RECRUITER NOTES">
                        <textarea 
                            placeholder="ADD INTERNAL NOTES..." 
                            className="w-full h-32 bg-nile-white/40 border-[2px] border-black rounded-xl p-4 font-bold text-[10px] uppercase outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#000000] transition-all"
                        />
                        <Button variant="primary" fullWidth size="xs" className="mt-4">SAVE NOTES</Button>
                    </Card>
                </div>

            </div>
        </div>
    );
};

const ContactItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-nile-white rounded-xl border-[2px] border-black flex items-center justify-center text-nile-blue shadow-sm">
            {icon}
        </div>
        <div>
            <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em]">{label}</p>
            <p className="text-[9px] font-black text-black uppercase truncate max-w-[140px]">{value}</p>
        </div>
    </div>
);

export default CandidateDetail;
