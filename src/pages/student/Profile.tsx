import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Mail, Download, ExternalLink, Edit2, MapPin, GraduationCap, Briefcase, Plus, Link2, LogOut } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';

const skills = ['React', 'TypeScript', 'Node.js', 'Python', 'UI/UX Design', 'PostgreSQL', 'GraphQL', 'Figma'];

const experience = [
    { role: 'Frontend Engineer Intern', company: 'Tech Innovations Inc.', period: 'Jun 2024 – Sep 2024', type: 'INTERNSHIP' },
    { role: 'Teaching Assistant – CS101', company: 'Nile University', period: 'Sep 2023 – Present', type: 'PART-TIME' },
];

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    
    const userName = user?.name || 'USER';
    const userRole = user?.type === 'alumni' ? "Alumni • Class of 2024" : "Computer Science • Nile University";

    return (
        <DashboardLayout>
            <div className="p-8 space-y-10 anime-fade-in font-sans pb-20 text-left h-full">
                
                {/* Header Banner */}
                <div className="bg-white border-[2px] border-black rounded-[32px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    {/* Cover */}
                    <div className="h-40 bg-nile-blue border-b-[2px] border-black relative">
                        <div className="absolute inset-0 opacity-10">
                            <svg width="100%" height="100%">
                                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/>
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                            </svg>
                        </div>
                    </div>

                    <div className="px-8 pb-8 relative">
                        {/* Avatar */}
                        <div className="absolute -top-12 left-8 w-24 h-24 rounded-[20px] border-[2px] border-black bg-white shadow-[4px_4px_0px_0px_#1E499D] flex items-center justify-center overflow-hidden">
                             <Avatar name={userName} size="lg" />
                        </div>

                        <div className="pt-16 flex justify-between items-end flex-wrap gap-4">
                            <div className="space-y-1 flex-grow">
                                <h3 className="text-3xl font-black text-black uppercase leading-none tracking-tighter">{userName} .</h3>
                                <p className="font-black text-nile-blue/50 uppercase tracking-widest text-[9px]">{userRole}</p>
                                <div className="flex items-center space-x-2 text-[9px] font-black text-black/30 uppercase pt-1">
                                    <MapPin size={12} strokeWidth={3} />
                                    <span>Abuja, Nigeria</span>
                                </div>
                            </div>
                            <div className="flex space-x-3 mt-4 md:mt-0">
                                <Button variant="outline" size="sm">
                                    <Download size={14} className="mr-2" /> RESUME
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => navigate('/student/profile/edit')}>
                                    <Edit2 size={14} className="mr-2" /> EDIT PROFILE
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex space-x-10 mt-8 pt-6 border-t-[2px] border-black/5">
                            <StatBadge value="12" label="APPS" />
                            <StatBadge value="3" label="HITS" />
                            <StatBadge value="1" label="OFFER" />
                            <StatBadge value="88%" label="STRENGTH" highlight />
                        </div>
                    </div>
                </div>

                {/* Body Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left + Main (2 cols) */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* About */}
                        <SectionCard title="About Me .">
                            <p className="font-bold text-nile-blue/80 leading-relaxed uppercase text-[11px]">
                                Aspiring Software Engineer with a passion for high-performance systems and clean code . Interested in distributed computing , AI , and building products that create meaningful impact throughout the tech ecosystem .
                            </p>
                        </SectionCard>

                        {/* Experience */}
                        <SectionCard title="Experience .">
                            <div className="space-y-4">
                                {experience.map((exp, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 border-[2px] border-black rounded-[20px] transition-all hover:translate-y-[-2px] shadow-sm bg-white">
                                        <div className="w-10 h-10 bg-nile-green/10 text-nile-green border border-nile-green/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Briefcase size={18} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-black text-black uppercase text-sm leading-none">{exp.role}</p>
                                                    <p className="text-[9px] font-bold text-nile-blue/70 uppercase mt-1">{exp.company}</p>
                                                </div>
                                                <span className="text-[7px] font-black bg-nile-green text-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{exp.type}</span>
                                            </div>
                                            <p className="text-[8px] font-black text-nile-blue/40 uppercase mt-2 tracking-widest">{exp.period}</p>
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-3 border-[2px] border-black border-dashed rounded-[20px] text-[10px] font-black text-black/30 hover:bg-black/5 hover:text-black transition-all uppercase flex items-center justify-center space-x-2">
                                    <Plus size={14} strokeWidth={4} />
                                    <span>ADD EXPERIENCE</span>
                                </button>
                            </div>
                        </SectionCard>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        {/* Education */}
                        <SectionCard title="Education .">
                            <div className="flex items-start space-x-4">
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center flex-shrink-0 border-[2px] border-black shadow-sm">
                                    <GraduationCap size={20} strokeWidth={2.5} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-black uppercase text-sm leading-none">Nile University</p>
                                    <p className="text-[9px] font-bold text-nile-blue/70 uppercase mt-1">B.Sc. Computer Science</p>
                                    <p className="text-[8px] font-black text-nile-blue/30 uppercase mt-2 tracking-widest">2021 – 2025 • CGPA 4.2/5.0</p>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Skills */}
                        <SectionCard title="Skills .">
                            <div className="flex flex-wrap gap-2">
                                {skills.map(s => (
                                    <span key={s} className="text-[8px] font-black uppercase px-3 py-1.5 bg-nile-white border-[2px] border-black rounded-lg hover:bg-black hover:text-white transition-all cursor-default">
                                        {s}
                                    </span>
                                ))}
                                <button className="text-[8px] font-black uppercase px-3 py-1.5 bg-white border-[2px] border-black border-dashed rounded-lg text-black/20 hover:text-black hover:bg-black/5 transition-colors flex items-center space-x-1">
                                    <Plus size={10} strokeWidth={3} />
                                    <span>ADD</span>
                                </button>
                            </div>
                        </SectionCard>

                        {/* Contact Links */}
                        <SectionCard title="Connect .">
                            <div className="space-y-3">
                                <ContactRow icon={<Mail size={14} strokeWidth={3} />} label="grace@nileuni.edu.ng" />
                                <ContactRow icon={<Link2 size={14} strokeWidth={3} />} label="linkedin/gracestanley" />
                                <ContactRow icon={<ExternalLink size={14} strokeWidth={3} />} label="github/gracestanley" />
                            </div>
                        </SectionCard>

                        {/* Log Out - Mobile Specific Visibility Focus */}
                        <div className="pt-4">
                            <Button 
                                variant="outline" 
                                fullWidth 
                                className="border-red-500/20 text-red-500 hover:bg-red-50 hover:border-red-500 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.1)]"
                                onClick={() => {
                                    logout();
                                    navigate('/login');
                                }}
                            >
                                <LogOut size={16} className="mr-2" /> LOG OUT OF NILECONNECT
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const SectionCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-[24px] border-[2px] border-black shadow-sm">
        <h3 className="text-lg font-black text-black uppercase mb-6 pb-2 border-b-[2px] border-black tracking-tighter">{title}</h3>
        {children}
    </div>
);

const StatBadge = ({ value, label, highlight = false }: { value: string, label: string, highlight?: boolean }) => (
    <div className="text-left">
        <p className={`text-2xl font-black leading-none ${highlight ? 'text-nile-green' : 'text-black'}`}>{value}</p>
        <p className="text-[7px] font-black text-nile-blue/40 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
);

const ContactRow = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
    <div className="flex items-center space-x-3 p-3 border-[2px] border-black rounded-xl hover:translate-y-[-1px] transition-all cursor-pointer shadow-sm group hover:bg-nile-blue hover:text-white">
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-[9px] font-black uppercase truncate tracking-widest">{label}</span>
    </div>
);

export default Profile;
