import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Mail, Download, ExternalLink, Edit2, MapPin, GraduationCap,
    Plus, Link2, LogOut, Loader2, ShieldCheck, Phone,
    Briefcase, FileText, Code2,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { getHomeUrl } from '../../utils/subdomain';
import Button from '../../components/Button';
import { apiClient } from '../../services/api';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';

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
    const { profile } = useProfile();
    const { picture: profilePic } = useProfilePicture();
    const [apiProfile, setApiProfile] = useState<StudentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCvModal, setShowCvModal] = useState(false);

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<StudentProfile>>('/api/student/profile')
            .then(({ data }) => setApiProfile(data.data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const displayName = apiProfile?.full_name || user?.name || 'USER';
    const major = profile.major || apiProfile?.major || user?.major || 'Computer Science';
    const gradYear = apiProfile?.graduation_year || user?.graduationYear;
    const email = apiProfile?.email || user?.email || '';
    const isVerified = apiProfile?.is_verified ?? user?.isVerified ?? false;
    const bio = profile.bio || '';
    const location = profile.location || 'Abuja, Nigeria';
    const strength = calculateProfileStrength(profile, !!displayName, !!email);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                </div>
            </DashboardLayout>
        );
    }

    const strengthColor = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-nile-blue' : 'text-red-500';
    const strengthBg = strength >= 80 ? 'bg-nile-green' : strength >= 50 ? 'bg-nile-blue' : 'bg-red-400';

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 anime-fade-in font-sans pb-24 text-left">

                {/* Banner */}
                <div className="bg-white border-[2px] border-black rounded-[24px] md:rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="h-28 md:h-36 bg-nile-blue border-b-[2px] border-black relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <svg width="100%" height="100%">
                                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1" />
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                            </svg>
                        </div>
                        {/* Profile strength indicator on banner */}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                            <span className="text-[7px] font-black text-white/50 uppercase tracking-widest">PROFILE STRENGTH</span>
                            <div className="w-28 h-2 bg-white/20 rounded-full overflow-hidden border border-white/20">
                                <div className={`h-full ${strengthBg} rounded-full transition-all duration-700`} style={{ width: `${strength}%` }} />
                            </div>
                            <span className={`text-xs font-black ${strengthColor === 'text-nile-green' ? 'text-nile-green' : 'text-white'}`}>{strength}%</span>
                        </div>
                    </div>

                    <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                        <div className="absolute -top-8 md:-top-12 left-4 md:left-8 w-16 h-16 md:w-24 md:h-24 rounded-[16px] md:rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_0px_#1E499D] md:shadow-[4px_4px_0px_0px_#1E499D] flex items-center justify-center overflow-hidden">
                            <Avatar name={displayName} size="lg" src={profilePic || undefined} />
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
                                <div className="flex items-center gap-2 text-[9px] font-black text-black/30 uppercase pt-1">
                                    <MapPin size={12} strokeWidth={3} />
                                    <span>{location}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setShowCvModal(true)}>
                                    <Download size={14} className="mr-2" /> CV
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => navigate('/profile/edit')}>
                                    <Edit2 size={14} className="mr-2" /> EDIT
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-6 md:gap-10 mt-5 pt-5 md:pt-6 border-t-[2px] border-black/5">
                            <StatBadge value="—" label="APPS" />
                            <StatBadge value="—" label="HITS" />
                            <StatBadge value="—" label="OFFERS" />
                            <StatBadge value={`${strength}%`} label="STRENGTH" highlight />
                        </div>
                    </div>
                </div>

                {/* Strength tip banner */}
                {strength < 80 && (
                    <div className="bg-nile-blue/5 border-[2px] border-dashed border-nile-blue/20 rounded-[16px] p-4 flex items-center justify-between gap-4">
                        <p className="text-[9px] font-black text-nile-blue uppercase tracking-widest">
                            Profile at {strength}% — {strength < 50 ? 'Add your bio, skills and experience to unlock more opportunities' : 'Add LinkedIn and portfolio to reach 100%'}
                        </p>
                        <Button size="xs" variant="primary" onClick={() => navigate('/profile/edit')}>
                            COMPLETE
                        </Button>
                    </div>
                )}

                {/* Body Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                    <div className="xl:col-span-2 space-y-6 md:space-y-8">
                        <SectionCard title="About Me .">
                            {bio ? (
                                <p className="font-bold text-black/70 leading-relaxed text-sm">{bio}</p>
                            ) : (
                                <button
                                    onClick={() => navigate('/profile/edit')}
                                    className="text-[10px] font-black text-nile-blue/40 uppercase tracking-widest hover:text-nile-blue transition-colors flex items-center gap-2"
                                >
                                    <Plus size={12} strokeWidth={3} /> ADD A BIO
                                </button>
                            )}
                        </SectionCard>

                        <SectionCard title="Experience .">
                            {profile.experiences.length > 0 ? (
                                <div className="space-y-4">
                                    {profile.experiences.map(exp => (
                                        <div key={exp.id} className="flex items-start gap-4 p-4 bg-nile-white/50 border-[2px] border-black rounded-[16px]">
                                            <div className="w-10 h-10 rounded-xl bg-nile-blue text-white flex items-center justify-center flex-shrink-0 border-2 border-black">
                                                <Briefcase size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm uppercase leading-none">{exp.title}</p>
                                                <p className="text-[9px] font-black text-nile-blue/60 uppercase mt-1">{exp.company} • {exp.duration}</p>
                                                {exp.description && <p className="text-[10px] font-bold text-black/60 mt-2 leading-relaxed">{exp.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => navigate('/profile/edit')}
                                        className="w-full py-3 border-[2px] border-dashed border-black/20 rounded-[14px] text-[9px] font-black text-black/30 hover:bg-black/5 hover:text-black transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={12} strokeWidth={3} /> ADD EXPERIENCE
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/profile/edit')}
                                    className="w-full py-6 border-[2px] border-dashed border-black/20 rounded-[16px] text-[10px] font-black text-black/30 hover:bg-black/5 hover:text-black transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} strokeWidth={4} /> ADD EXPERIENCE
                                </button>
                            )}
                        </SectionCard>

                        {profile.skills.length > 0 && (
                            <SectionCard title="Skills .">
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map(s => (
                                        <span key={s} className="px-3 py-1.5 bg-nile-white border-[2px] border-black rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}
                    </div>

                    <div className="space-y-6 md:space-y-8">
                        <SectionCard title="Education .">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center flex-shrink-0 border-[2px] border-black shadow-sm">
                                    <GraduationCap size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-black uppercase text-sm leading-none truncate">Nile University</p>
                                    <p className="text-[9px] font-bold text-nile-blue/70 uppercase mt-1">B.Sc. {major}</p>
                                    {gradYear && <p className="text-[8px] font-black text-nile-blue/30 uppercase mt-2 tracking-widest">CLASS OF {gradYear}</p>}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Connect .">
                            <div className="space-y-2">
                                <ContactRow icon={<Mail size={14} strokeWidth={3} />} label={email || 'No email'} href={email ? `mailto:${email}` : undefined} />
                                {profile.linkedIn ? (
                                    <ContactRow icon={<Link2 size={14} strokeWidth={3} />} label={profile.linkedIn} href={`https://${profile.linkedIn.replace('https://', '')}`} />
                                ) : (
                                    <button onClick={() => navigate('/profile/edit')} className="w-full flex items-center gap-3 p-3 border-[2px] border-dashed border-black/20 rounded-xl text-[9px] font-black text-black/30 hover:border-black hover:text-black transition-all">
                                        <Link2 size={14} strokeWidth={3} /> ADD LINKEDIN
                                    </button>
                                )}
                                {profile.portfolio ? (
                                    <ContactRow icon={<ExternalLink size={14} strokeWidth={3} />} label={profile.portfolio} href={`https://${profile.portfolio.replace('https://', '')}`} />
                                ) : (
                                    <button onClick={() => navigate('/profile/edit')} className="w-full flex items-center gap-3 p-3 border-[2px] border-dashed border-black/20 rounded-xl text-[9px] font-black text-black/30 hover:border-black hover:text-black transition-all">
                                        <ExternalLink size={14} strokeWidth={3} /> ADD PORTFOLIO
                                    </button>
                                )}
                                {profile.github && (
                                    <ContactRow icon={<Code2 size={14} strokeWidth={3} />} label={profile.github} href={`https://${profile.github.replace('https://', '')}`} />
                                )}
                                {profile.phone && (
                                    <ContactRow icon={<Phone size={14} strokeWidth={3} />} label={profile.phone} href={`tel:${profile.phone}`} />
                                )}
                            </div>
                        </SectionCard>

                        <Button variant="outline" fullWidth className="border-red-500/20 text-red-500 hover:bg-red-50 hover:border-red-500" onClick={() => { logout(); window.location.href = getHomeUrl('/login'); }}>
                            <LogOut size={16} className="mr-2" /> LOG OUT
                        </Button>
                    </div>
                </div>
            </div>

            {/* CV Modal */}
            {showCvModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCvModal(false)}>
                    <div className="bg-white border-[3px] border-black rounded-[28px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Download CV</h3>
                            <button onClick={() => setShowCvModal(false)} className="p-1.5 border-2 border-black/10 rounded-lg hover:bg-black/5">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>
                        <p className="text-[10px] font-bold text-black/60 uppercase leading-relaxed">
                            Your CV is auto-generated from your profile data. Complete your profile to improve CV quality.
                        </p>
                        <div className="p-5 bg-nile-white rounded-[16px] border-[2px] border-black space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center border-2 border-black">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <p className="font-black text-sm uppercase">{displayName.replace(' ', '_')}_CV.pdf</p>
                                    <p className="text-[8px] font-black text-black/40 uppercase">PROFILE STRENGTH: {strength}%</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button fullWidth variant="outline" onClick={() => setShowCvModal(false)}>CANCEL</Button>
                            <Button fullWidth onClick={() => { showCvModal && setShowCvModal(false); }}>
                                <Download size={14} className="mr-2" /> DOWNLOAD
                            </Button>
                        </div>
                        {strength < 70 && (
                            <p className="text-[9px] font-black text-nile-blue/60 uppercase tracking-widest text-center">
                                <button onClick={() => { setShowCvModal(false); navigate('/profile/edit'); }} className="underline hover:text-nile-blue">Complete your profile</button> to get a better CV
                            </p>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] border-[2px] border-black shadow-sm">
        <h3 className="text-base md:text-lg font-black text-black uppercase mb-4 md:mb-5 pb-2 border-b-[2px] border-black tracking-tighter">{title}</h3>
        {children}
    </div>
);

const StatBadge = ({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) => (
    <div className="text-left">
        <p className={`text-xl md:text-2xl font-black leading-none ${highlight ? 'text-nile-green' : 'text-black'}`}>{value}</p>
        <p className="text-[7px] font-black text-nile-blue/40 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
);

const ContactRow = ({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) => (
    <a
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel="noreferrer"
        className="flex items-center gap-3 p-3 border-[2px] border-black rounded-xl hover:translate-y-[-1px] transition-all cursor-pointer shadow-sm group hover:bg-nile-blue hover:text-white"
        onClick={e => !href && e.preventDefault()}
    >
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-[9px] font-black uppercase truncate tracking-widest">{label}</span>
    </a>
);

const X = ({ size, strokeWidth }: { size: number; strokeWidth?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default Profile;
