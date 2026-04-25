import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Mail, Download, ExternalLink, Edit2, MapPin, GraduationCap, Briefcase, Plus, Link2, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { apiClient } from '../../services/api';

interface StudentProfile {
    id: string;
    full_name: string;
    username: string;
    email: string;
    major: string;
    graduation_year: number;
    is_verified: boolean;
}

interface ApiEnvelope<T> { data: T; }

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<StudentProfile>>('/api/student/profile')
            .then(({ data }) => setProfile(data.data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const displayName = profile?.full_name || user?.name || 'USER';
    const major = profile?.major || user?.major || 'Computer Science';
    const gradYear = profile?.graduation_year || user?.graduationYear;
    const email = profile?.email || user?.email || '';
    const isVerified = profile?.is_verified ?? user?.isVerified ?? false;

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 md:space-y-10 anime-fade-in font-sans pb-20 text-left h-full">

                {/* Header Banner */}
                <div className="bg-white border-[2px] border-black rounded-[24px] md:rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="h-28 md:h-40 bg-nile-blue border-b-[2px] border-black relative">
                        <div className="absolute inset-0 opacity-10">
                            <svg width="100%" height="100%">
                                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/>
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                            </svg>
                        </div>
                    </div>

                    <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                        <div className="absolute -top-8 md:-top-12 left-4 md:left-8 w-16 h-16 md:w-24 md:h-24 rounded-[16px] md:rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_0px_#1E499D] md:shadow-[4px_4px_0px_0px_#1E499D] flex items-center justify-center overflow-hidden">
                            <Avatar name={displayName} size="lg" />
                        </div>

                        <div className="pt-10 md:pt-16 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                            <div className="space-y-1 flex-grow min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-2xl md:text-3xl font-black text-black uppercase leading-none tracking-tighter truncate">{displayName} .</h3>
                                    {isVerified && (
                                        <span className="flex items-center gap-1 bg-nile-green text-white text-[7px] font-black px-2 py-0.5 rounded-full border border-black flex-shrink-0">
                                            <ShieldCheck size={9} strokeWidth={3} /> VERIFIED
                                        </span>
                                    )}
                                </div>
                                <p className="font-black text-nile-blue/50 uppercase tracking-widest text-[9px]">
                                    {major} • Nile University{gradYear ? ` • ${gradYear}` : ''}
                                </p>
                                <div className="flex items-center space-x-2 text-[9px] font-black text-black/30 uppercase pt-1">
                                    <MapPin size={12} strokeWidth={3} />
                                    <span>Abuja, Nigeria</span>
                                </div>
                            </div>
                            <div className="flex space-x-2 md:space-x-3 flex-shrink-0">
                                <Button variant="outline" size="sm">
                                    <Download size={14} className="mr-2" /> CV
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => navigate('/student/profile/edit')}>
                                    <Edit2 size={14} className="mr-2" /> EDIT
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-6 md:gap-10 mt-6 pt-4 md:pt-6 border-t-[2px] border-black/5">
                            <StatBadge value="—" label="APPS" />
                            <StatBadge value="—" label="HITS" />
                            <StatBadge value="—" label="OFFERS" />
                            <StatBadge value={isVerified ? '100%' : '70%'} label="STRENGTH" highlight />
                        </div>
                    </div>
                </div>

                {/* Body Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                    <div className="xl:col-span-2 space-y-6 md:space-y-8">
                        <SectionCard title="About Me .">
                            <p className="font-bold text-nile-blue/80 leading-relaxed uppercase text-[11px]">
                                {major ? `Student of ${major} at Nile University.` : 'Nile University student.'} Update your profile to add a bio and showcase your experience.
                            </p>
                        </SectionCard>

                        <SectionCard title="Experience .">
                            <div className="space-y-4">
                                <button className="w-full py-4 border-[2px] border-black border-dashed rounded-[20px] text-[10px] font-black text-black/30 hover:bg-black/5 hover:text-black transition-all uppercase flex items-center justify-center space-x-2" onClick={() => navigate('/student/profile/edit')}>
                                    <Plus size={14} strokeWidth={4} />
                                    <span>ADD EXPERIENCE</span>
                                </button>
                            </div>
                        </SectionCard>
                    </div>

                    <div className="space-y-6 md:space-y-8">
                        <SectionCard title="Education .">
                            <div className="flex items-start space-x-4">
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center flex-shrink-0 border-[2px] border-black shadow-sm">
                                    <GraduationCap size={20} strokeWidth={2.5} />
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="font-black text-black uppercase text-xs md:text-sm leading-none truncate">Nile University</p>
                                    <p className="text-[9px] font-bold text-nile-blue/70 uppercase mt-1 truncate">B.Sc. {major || 'Computer Science'}</p>
                                    {gradYear && <p className="text-[8px] font-black text-nile-blue/30 uppercase mt-2 tracking-widest">CLASS OF {gradYear}</p>}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Connect .">
                            <div className="space-y-3">
                                <ContactRow icon={<Mail size={14} strokeWidth={3} />} label={email} />
                                <ContactRow icon={<Link2 size={14} strokeWidth={3} />} label="Add LinkedIn" />
                                <ContactRow icon={<ExternalLink size={14} strokeWidth={3} />} label="Add GitHub" />
                            </div>
                        </SectionCard>

                        <div className="pt-2">
                            <Button
                                variant="outline"
                                fullWidth
                                className="border-red-500/20 text-red-500 hover:bg-red-50 hover:border-red-500"
                                onClick={() => { logout(); navigate('/login'); }}
                            >
                                <LogOut size={16} className="mr-2" /> LOG OUT
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] border-[2px] border-black shadow-sm">
        <h3 className="text-base md:text-lg font-black text-black uppercase mb-4 md:mb-6 pb-2 border-b-[2px] border-black tracking-tighter">{title}</h3>
        {children}
    </div>
);

const StatBadge = ({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) => (
    <div className="text-left">
        <p className={`text-xl md:text-2xl font-black leading-none ${highlight ? 'text-nile-green' : 'text-black'}`}>{value}</p>
        <p className="text-[7px] font-black text-nile-blue/40 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
);

const ContactRow = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center space-x-3 p-3 border-[2px] border-black rounded-xl hover:translate-y-[-1px] transition-all cursor-pointer shadow-sm group hover:bg-nile-blue hover:text-white">
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-[9px] font-black uppercase truncate tracking-widest">{label}</span>
    </div>
);

export default Profile;
