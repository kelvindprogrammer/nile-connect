import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    User, Mail, MapPin, Camera, Save, ArrowLeft,
    Link as LinkIcon, Link2, GraduationCap, Phone,
    Code2, Plus, Trash2, Briefcase, Loader2,
} from 'lucide-react';
import Card from '../../components/Card';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useProfile, type Experience } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';


const EditProfile = () => {
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();
    const { showToast } = useToast();
    const { profile, updateProfile } = useProfile(user?.id);
    const { picture, uploadPicture, removePicture } = useProfilePicture();
    const picInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPic, setUploadingPic] = useState(false);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [major, setMajor] = useState(profile.major || user?.major || '');
    const [location, setLocation] = useState(profile.location || 'Abuja, Nigeria');
    const [linkedIn, setLinkedIn] = useState(profile.linkedIn || '');
    const [portfolio, setPortfolio] = useState(profile.portfolio || '');
    const [github, setGithub] = useState(profile.github || '');
    const [phone, setPhone] = useState(profile.phone || '');
    const [skills, setSkills] = useState<string[]>(profile.skills || []);
    const [skillInput, setSkillInput] = useState('');
    const [experiences, setExperiences] = useState<Experience[]>(profile.experiences || []);
    const [showAddExp, setShowAddExp] = useState(false);
    const [newExp, setNewExp] = useState<Omit<Experience, 'id'>>({
        title: '', company: '', duration: '', description: '',
    });

    const handleAddSkill = () => {
        const s = skillInput.trim();
        if (s && !skills.includes(s)) {
            setSkills(prev => [...prev, s]);
            setSkillInput('');
        }
    };

    const handleAddExperience = () => {
        if (!newExp.title || !newExp.company) {
            showToast('Title and company are required', 'error');
            return;
        }
        const exp: Experience = { ...newExp, id: Date.now().toString() };
        setExperiences(prev => [...prev, exp]);
        setNewExp({ title: '', company: '', duration: '', description: '' });
        setShowAddExp(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        login({ ...user!, name, email });
        updateProfile({ bio, major, location, linkedIn, portfolio, github, phone, skills, experiences });
        showToast('Profile updated successfully!', 'success');
        navigate('/student/profile');
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 anime-fade-in font-sans pb-24 text-left max-w-4xl mx-auto">

                <div className="flex items-center justify-between border-b-[2px] border-black pb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">Edit Profile .</h2>
                        <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">UPDATE YOUR PUBLIC PORTFOLIO</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/student/profile')}>
                        <ArrowLeft size={14} className="mr-2" /> CANCEL
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-6 md:space-y-8">

                    {/* Avatar */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6 bg-nile-blue/5 border-[2px] border-dashed border-black/10 rounded-[24px]">
                        <div className="relative group flex-shrink-0">
                            <div className="w-20 h-20 rounded-[16px] border-[2px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {picture ? (
                                    <img src={picture} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    <Avatar name={name} size="lg" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => picInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 p-2 bg-nile-green text-white rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                            >
                                {uploadingPic ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                            </button>
                            <input
                                ref={picInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingPic(true);
                                    try { await uploadPicture(file); showToast('Picture updated!', 'success'); }
                                    catch (err: any) { showToast(err.message || 'Upload failed', 'error'); }
                                    finally { setUploadingPic(false); if (picInputRef.current) picInputRef.current.value = ''; }
                                }}
                            />
                        </div>
                        <div className="space-y-1 text-center sm:text-left">
                            <h4 className="text-sm font-black text-black uppercase">PROFILE IMAGE</h4>
                            <p className="text-[9px] font-black text-nile-blue/40 uppercase tracking-widest">JPG, PNG, WEBP — max 4MB</p>
                            {picture && <p className="text-[8px] font-black text-nile-green uppercase">✓ PHOTO UPLOADED</p>}
                            <div className="flex gap-2 pt-1 justify-center sm:justify-start">
                                <Button size="xs" variant="primary" type="button" onClick={() => picInputRef.current?.click()}>UPLOAD NEW</Button>
                                {picture && <Button size="xs" variant="outline" type="button" onClick={() => { removePicture(); showToast('Photo removed', 'success'); }}>REMOVE</Button>}
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-black/50 border-b border-black/10 pb-2">BASIC INFORMATION</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="FULL NAME" value={name} onChange={e => setName(e.target.value)} icon={<User size={14} />} />
                            <InputField label="EMAIL ADDRESS" type="email" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={14} />} />
                            <InputField label="ACADEMIC MAJOR" value={major} onChange={e => setMajor(e.target.value)} icon={<GraduationCap size={14} />} />
                            <InputField label="PHONE NUMBER" value={phone} onChange={e => setPhone(e.target.value)} icon={<Phone size={14} />} />
                            <div className="sm:col-span-2">
                                <InputField label="LOCATION" value={location} onChange={e => setLocation(e.target.value)} icon={<MapPin size={14} />} />
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-black/50 border-b border-black/10 pb-2">PROFESSIONAL BIO</h3>
                        <textarea
                            className="w-full h-28 bg-nile-white/40 border-[2px] border-black rounded-2xl p-4 font-bold text-xs outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] transition-all resize-none"
                            placeholder="Tell people about yourself, your goals, and what makes you unique..."
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                        />
                    </div>

                    {/* Skills */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-black/50 border-b border-black/10 pb-2">SKILLS</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={skillInput}
                                onChange={e => setSkillInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                                placeholder="e.g. React, Python, Leadership..."
                                className="flex-1 border-[2px] border-black rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                            />
                            <Button size="sm" variant="outline" type="button" onClick={handleAddSkill}>
                                <Plus size={14} strokeWidth={3} />
                            </Button>
                        </div>
                        {skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {skills.map(s => (
                                    <span
                                        key={s}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-[2px] border-black rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        {s}
                                        <button type="button" onClick={() => setSkills(p => p.filter(x => x !== s))} className="text-red-400 hover:text-red-600 transition-colors">
                                            <X size={10} strokeWidth={3} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Experiences */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-black/10 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-black/50">EXPERIENCE</h3>
                            <button type="button" onClick={() => setShowAddExp(true)} className="flex items-center gap-1 text-[9px] font-black text-nile-blue uppercase tracking-widest hover:text-nile-green transition-colors">
                                <Plus size={12} strokeWidth={3} /> ADD
                            </button>
                        </div>

                        {experiences.map(exp => (
                            <div key={exp.id} className="flex items-start gap-4 p-4 bg-white border-[2px] border-black rounded-[16px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <div className="w-10 h-10 rounded-xl bg-nile-blue text-white flex items-center justify-center flex-shrink-0 border-2 border-black">
                                    <Briefcase size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm uppercase leading-none">{exp.title}</p>
                                    <p className="text-[9px] font-black text-nile-blue/60 uppercase mt-1">{exp.company} • {exp.duration}</p>
                                    {exp.description && <p className="text-[10px] font-bold text-black/60 mt-2 leading-relaxed">{exp.description}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setExperiences(p => p.filter(x => x.id !== exp.id))}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <Trash2 size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        ))}

                        {showAddExp && (
                            <div className="p-5 bg-nile-white/50 border-[2px] border-dashed border-black rounded-[20px] space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        placeholder="JOB TITLE *"
                                        value={newExp.title}
                                        onChange={e => setNewExp(p => ({ ...p, title: e.target.value }))}
                                        className="border-[2px] border-black rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all bg-white uppercase"
                                    />
                                    <input
                                        placeholder="COMPANY *"
                                        value={newExp.company}
                                        onChange={e => setNewExp(p => ({ ...p, company: e.target.value }))}
                                        className="border-[2px] border-black rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all bg-white uppercase"
                                    />
                                    <input
                                        placeholder="DURATION (e.g. Jan 2023 – Dec 2023)"
                                        value={newExp.duration}
                                        onChange={e => setNewExp(p => ({ ...p, duration: e.target.value }))}
                                        className="sm:col-span-2 border-[2px] border-black rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all bg-white"
                                    />
                                    <textarea
                                        placeholder="Brief description (optional)"
                                        value={newExp.description}
                                        onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))}
                                        className="sm:col-span-2 border-[2px] border-black rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all bg-white h-20 resize-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" type="button" onClick={handleAddExperience}>ADD</Button>
                                    <Button size="sm" variant="outline" type="button" onClick={() => setShowAddExp(false)}>CANCEL</Button>
                                </div>
                            </div>
                        )}

                        {experiences.length === 0 && !showAddExp && (
                            <button
                                type="button"
                                onClick={() => setShowAddExp(true)}
                                className="w-full py-6 border-[2px] border-dashed border-black/20 rounded-[16px] text-[10px] font-black text-black/30 hover:bg-black/5 hover:text-black hover:border-black transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} strokeWidth={3} /> ADD FIRST EXPERIENCE
                            </button>
                        )}
                    </div>

                    {/* Social Links */}
                    <Card title="LINKS & SOCIALS" className="text-left">
                        <div className="space-y-3">
                            <InputField label="LINKEDIN URL" value={linkedIn} onChange={e => setLinkedIn(e.target.value)} icon={<Link2 size={14} />} />
                            <InputField label="PORTFOLIO / WEBSITE" value={portfolio} onChange={e => setPortfolio(e.target.value)} icon={<LinkIcon size={14} />} />
                            <InputField label="GITHUB URL" value={github} onChange={e => setGithub(e.target.value)} icon={<Code2 size={14} />} />
                        </div>
                    </Card>

                    <div className="pt-4 border-t-[2px] border-black/5">
                        <Button fullWidth size="md" type="submit">
                            <Save size={14} className="mr-2" /> SAVE PROFILE
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

const X = ({ size, strokeWidth }: { size: number; strokeWidth?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default EditProfile;
