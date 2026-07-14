import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail, Download, ExternalLink, Edit2, MapPin, GraduationCap,
    Plus, Link2, LogOut, Loader2, ShieldCheck, Phone,
    Briefcase, FileText, Code2, Camera, Share2, Check,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/Button';
import { apiClient } from '../../services/api';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { recordProfileView, getEndorsements, type EndorsementsResponse } from '../../services/profileService';
import { getMyApplications } from '../../services/studentService';

interface StudentProfile {
    id: string;
    full_name: string;
    username: string;
    email: string;
    major: string;
    graduation_year: number;
    is_verified: boolean;
    resume_url?: string;
}

interface ApiEnvelope<T> { data: T; }

const OFFER_STAGES = new Set(['offer_extended', 'accepted']);

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const { profile } = useProfile(user?.id);
    const { picture: profilePic, uploadPicture } = useProfilePicture();
    const [apiProfile, setApiProfile] = useState<StudentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCvModal, setShowCvModal] = useState(false);
    const [totalViews, setTotalViews] = useState<number | null>(null);
    const [endorsements, setEndorsements] = useState<EndorsementsResponse | null>(null);
    const [appsCount, setAppsCount] = useState<number | null>(null);
    const [offersCount, setOffersCount] = useState<number | null>(null);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [copied, setCopied] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        apiClient
            .get<ApiEnvelope<StudentProfile>>('/api/student/profile')
            .then(({ data }) => setApiProfile(data.data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        recordProfileView(user.id).then(r => setTotalViews(r.total_views)).catch(() => {});
        getEndorsements(user.id).then(setEndorsements).catch(() => {});
        getMyApplications()
            .then(apps => {
                setAppsCount(apps.length);
                setOffersCount(apps.filter(a => OFFER_STAGES.has(a.stage)).length);
            })
            .catch(() => {});
    }, [user?.id]);

    const endorsementCount = (skill: string) => endorsements?.endorsements?.find(e => e.skill === skill)?.count ?? 0;

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPic(true);
        try {
            await uploadPicture(file);
            showToast('Profile photo updated!', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
        } finally {
            setUploadingPic(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const handleShareProfile = async () => {
        const url = `${window.location.origin}/student/profile`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            showToast('Profile link copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showToast('Could not copy link', 'error');
        }
    };

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
            <>
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                </div>
            </>
        );
    }

    const strengthColor = strength >= 80 ? 'text-nile-green' : strength >= 50 ? 'text-nile-blue' : 'text-red-500';
    const strengthBg = strength >= 80 ? 'bg-nile-green' : strength >= 50 ? 'bg-nile-blue' : 'bg-red-400';

    return (
        <>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 anime-fade-in font-sans pb-24 text-left">

                {/* Banner */}
                <div className="social-card overflow-hidden">
                    <div className="h-28 md:h-36 bg-nile-blue relative overflow-hidden">
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
                            <span className="text-xs text-white/60 font-medium">Profile strength</span>
                            <div className="w-28 h-2 bg-white/20 rounded-full overflow-hidden border border-white/20">
                                <div className={`h-full ${strengthBg} rounded-full transition-all duration-700`} style={{ width: `${strength}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${strengthColor === 'text-nile-green' ? 'text-nile-green' : 'text-white'}`}>{strength}%</span>
                        </div>
                    </div>

                    <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                        <div className="absolute -top-8 md:-top-12 left-4 md:left-8 group">
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl border border-gray-100 bg-white shadow-card flex items-center justify-center overflow-hidden">
                                <Avatar name={displayName} size="lg" src={profilePic || undefined} />
                            </div>
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={uploadingPic}
                                className="absolute -bottom-1 -right-1 w-7 h-7 bg-nile-blue text-white rounded-full border-2 border-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                                title="Change profile photo"
                            >
                                {uploadingPic ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                            </button>
                            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </div>

                        <div className="pt-10 md:pt-16 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                            <div className="space-y-1 flex-grow min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight truncate">{displayName}</h3>
                                    {isVerified && (
                                        <span className="flex items-center gap-1 bg-nile-green text-white text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0">
                                            <ShieldCheck size={9} strokeWidth={3} /> Verified
                                        </span>
                                    )}
                                </div>
                                <p className="font-medium text-nile-blue text-sm">
                                    {major} • Nile University{gradYear ? ` • ${gradYear}` : ''}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                                    <MapPin size={12} strokeWidth={3} />
                                    <span>{location}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" onClick={handleShareProfile} title="Copy profile link">
                                    {copied ? <Check size={14} className="mr-2 text-nile-green" /> : <Share2 size={14} className="mr-2" />}
                                    {copied ? 'Copied' : 'Share'}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setShowCvModal(true)}>
                                    <Download size={14} className="mr-2" /> CV
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => navigate('/student/profile/edit')}>
                                    <Edit2 size={14} className="mr-2" /> Edit
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-6 md:gap-10 mt-5 pt-5 md:pt-6 border-t border-gray-100">
                            <StatBadge value={appsCount === null ? '—' : String(appsCount)} label="Apps" onClick={() => navigate('/student/applications')} />
                            <StatBadge value={totalViews === null ? '—' : String(totalViews)} label="Profile views" />
                            <StatBadge value={offersCount === null ? '—' : String(offersCount)} label="Offers" onClick={() => navigate('/student/applications')} />
                            <StatBadge value={`${strength}%`} label="Strength" highlight />
                        </div>
                    </div>
                </div>

                {/* Strength tip banner */}
                {strength < 80 && (
                    <div className="bg-nile-blue/5 border border-dashed border-nile-blue/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-nile-blue">
                            Profile at {strength}% — {strength < 50 ? 'Add your bio, skills and experience to unlock more opportunities' : 'Add LinkedIn and portfolio to reach 100%'}
                        </p>
                        <Button size="xs" variant="primary" onClick={() => navigate('/student/profile/edit')}>
                            Complete
                        </Button>
                    </div>
                )}

                {/* Body Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                    <div className="xl:col-span-2 space-y-6 md:space-y-8">
                        <SectionCard title="About me">
                            {bio ? (
                                <p className="text-sm text-gray-800 leading-relaxed">{bio}</p>
                            ) : (
                                <button
                                    onClick={() => navigate('/student/profile/edit')}
                                    className="text-xs text-nile-blue/60 hover:text-nile-blue transition-colors flex items-center gap-2 font-medium"
                                >
                                    <Plus size={12} strokeWidth={3} /> Add a bio
                                </button>
                            )}
                        </SectionCard>

                        <SectionCard title="Experience">
                            {profile.experiences.length > 0 ? (
                                <div className="space-y-4">
                                    {profile.experiences.map(exp => (
                                        <div key={exp.id} className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-nile-blue text-white flex items-center justify-center flex-shrink-0">
                                                <Briefcase size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-gray-900 leading-none">{exp.title}</p>
                                                <p className="text-xs text-nile-blue mt-1">{exp.company} • {exp.duration}</p>
                                                {exp.description && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{exp.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => navigate('/student/profile/edit')}
                                        className="w-full py-3 border border-dashed border-gray-200 rounded-2xl text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={12} strokeWidth={3} /> Add experience
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/student/profile/edit')}
                                    className="w-full py-6 border border-dashed border-gray-200 rounded-2xl text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} strokeWidth={4} /> Add experience
                                </button>
                            )}
                        </SectionCard>

                        {profile.skills.length > 0 && (
                            <SectionCard title="Skills">
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map(s => {
                                        const count = endorsementCount(s);
                                        return (
                                            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                {s}
                                                {count > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-nile-blue/10 text-nile-blue text-[10px] font-semibold">
                                                        {count}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            </SectionCard>
                        )}
                    </div>

                    <div className="space-y-6 md:space-y-8">
                        <SectionCard title="Education">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center flex-shrink-0">
                                    <GraduationCap size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm leading-none truncate">Nile University</p>
                                    <p className="text-xs text-nile-blue mt-1">B.Sc. {major}</p>
                                    {gradYear && <p className="text-xs text-gray-400 mt-2">Class of {gradYear}</p>}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Connect">
                            <div className="space-y-2">
                                <ContactRow icon={<Mail size={14} strokeWidth={3} />} label={email || 'No email'} href={email ? `mailto:${email}` : undefined} />
                                {profile.linkedIn ? (
                                    <ContactRow icon={<Link2 size={14} strokeWidth={3} />} label={profile.linkedIn} href={`https://${profile.linkedIn.replace('https://', '')}`} />
                                ) : (
                                    <button onClick={() => navigate('/student/profile/edit')} className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-nile-blue hover:text-nile-blue transition-all">
                                        <Link2 size={14} strokeWidth={3} /> Add LinkedIn
                                    </button>
                                )}
                                {profile.portfolio ? (
                                    <ContactRow icon={<ExternalLink size={14} strokeWidth={3} />} label={profile.portfolio} href={`https://${profile.portfolio.replace('https://', '')}`} />
                                ) : (
                                    <button onClick={() => navigate('/student/profile/edit')} className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-nile-blue hover:text-nile-blue transition-all">
                                        <ExternalLink size={14} strokeWidth={3} /> Add portfolio
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

                        <Button variant="outline" fullWidth className="border-red-500/20 text-red-500 hover:bg-red-50 hover:border-red-500" onClick={() => { logout(); navigate('/login'); }}>
                            <LogOut size={16} className="mr-2" /> Log out
                        </Button>
                    </div>
                </div>
            </div>

            {/* CV Modal */}
            {showCvModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCvModal(false)}>
                    <div className="bg-white border border-gray-100 rounded-[28px] shadow-card max-w-sm w-full p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold">Your CV</h3>
                            <button onClick={() => setShowCvModal(false)} className="p-1.5 border border-gray-100/10 rounded-lg hover:bg-black/5">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>
                        {apiProfile?.resume_url ? (
                            <>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    This is the CV employers and staff will see when you apply for jobs or career services.
                                </p>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center">
                                            <FileText size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{displayName.replace(/\s+/g, '_')}_CV.pdf</p>
                                            <p className="text-xs font-medium text-nile-green">Uploaded</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button fullWidth variant="outline" onClick={() => { setShowCvModal(false); navigate('/student/profile/edit'); }}>Replace</Button>
                                    <Button fullWidth onClick={() => window.open(apiProfile.resume_url, '_blank')}>
                                        <Download size={14} className="mr-2" /> View / download
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    You haven't uploaded a CV yet. Upload a PDF so employers and career services can review it when you apply.
                                </p>
                                <div className="flex gap-3">
                                    <Button fullWidth variant="outline" onClick={() => setShowCvModal(false)}>Cancel</Button>
                                    <Button fullWidth onClick={() => { setShowCvModal(false); navigate('/student/profile/edit'); }}>
                                        Upload CV
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-black mb-4 md:mb-5 pb-2 border-b border-gray-100">{title}</h3>
        {children}
    </div>
);

const StatBadge = ({ value, label, highlight = false, onClick }: { value: string; label: string; highlight?: boolean; onClick?: () => void }) => {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick} className={`text-left ${onClick ? 'hover:opacity-70 transition-opacity cursor-pointer' : ''}`}>
            <p className={`text-xl md:text-2xl font-semibold leading-none ${highlight ? 'text-nile-green' : 'text-black'}`}>{value}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">{label}</p>
        </Tag>
    );
};

const ContactRow = ({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) => (
    <a
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel="noreferrer"
        className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:translate-y-[-1px] transition-all cursor-pointer shadow-sm group hover:bg-nile-blue hover:text-white"
        onClick={e => !href && e.preventDefault()}
    >
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium truncate">{label}</span>
    </a>
);

const X = ({ size, strokeWidth }: { size: number; strokeWidth?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default Profile;
