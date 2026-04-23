import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { User, Mail, AtSign, MapPin, Camera, Save, ArrowLeft, Link as LinkIcon, Link2 } from 'lucide-react';
import Card from '../../components/Card';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const EditProfile = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        major: 'Computer Science', // Mock default
        location: 'Abuja, Nigeria',
        bio: 'Aspiring software engineer and tech enthusiast. Class of 2024.',
        linkedin: 'linkedin.com/in/grace-stanley',
        portfolio: 'gracestanley.dev'
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Update local session
        login({
            ...user!,
            name: formData.name,
            email: formData.email
        });
        showToast('Profile configuration updated successfully!', 'success');
        navigate('/student/profile');
    };

    return (
        <DashboardLayout>
            <div className="p-8 space-y-10 anime-fade-in font-sans pb-20 text-left h-full max-w-4xl mx-auto">
                
                {/* Header Navigation */}
                <div className="flex items-center justify-between border-b-[2px] border-black pb-8">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-black leading-none uppercase tracking-tighter">Edit Identity .</h2>
                        <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">CONFIGURE YOUR PUBLIC PORTFOLIO</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/student/profile')}>
                        <ArrowLeft size={14} className="mr-2" /> CANCEL
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    {/* Avatar Upload Section */}
                    <div className="flex items-center space-x-8 p-8 bg-nile-blue/5 border-[2px] border-dashed border-black/10 rounded-[32px]">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-[2px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Avatar name={formData.name} size="lg" />
                            </div>
                            <button type="button" className="absolute -bottom-1 -right-1 p-2 bg-black text-white rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform">
                                <Camera size={14} />
                            </button>
                        </div>
                        <div className="space-y-2">
                             <h4 className="text-sm font-black text-black uppercase">PROFILE IMAGE</h4>
                             <p className="text-[9px] font-black text-nile-blue/40 uppercase tracking-widest leading-relaxed">Accepted formats: JPG, PNG. MAX 2MB.</p>
                             <div className="flex space-x-2 pt-1">
                                <Button size="xs" variant="primary" type="button">UPLOAD NEW</Button>
                                <Button size="xs" variant="outline" type="button">REMOVE</Button>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputField 
                            label="FULL NAME" 
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                            icon={<User size={16} />}
                        />
                        <InputField 
                            label="EMAIL ADDRESS" 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                            icon={<Mail size={16} />}
                        />
                        <InputField 
                            label="ACADEMIC MAJOR" 
                            value={formData.major}
                            onChange={(e) => setFormData(prev => ({...prev, major: e.target.value}))}
                            icon={<GraduationCap size={16} />}
                        />
                        <InputField 
                            label="CURRENT LOCATION" 
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                            icon={<MapPin size={16} />}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">PROFESSIONAL BIO</label>
                        <textarea 
                            className="w-full h-32 bg-nile-white/40 border-[2px] border-black rounded-2xl p-4 font-bold text-xs outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] transition-all"
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({...prev, bio: e.target.value}))}
                        />
                    </div>

                    <Card title="SOCIAL COUPLING" className="text-left">
                        <div className="space-y-4">
                            <InputField 
                                label="LINKEDIN URL" 
                                value={formData.linkedin}
                                onChange={(e) => setFormData(prev => ({...prev, linkedin: e.target.value}))}
                                icon={<Link2 size={16} />}
                            />
                            <InputField 
                                label="PORTFOLIO / WEBSITE" 
                                value={formData.portfolio}
                                onChange={(e) => setFormData(prev => ({...prev, portfolio: e.target.value}))}
                                icon={<LinkIcon size={16} />}
                            />
                        </div>
                    </Card>

                    <div className="pt-6 border-t-[2px] border-black/5">
                        <Button fullWidth size="md" type="submit">
                            <Save size={14} className="mr-2" /> PERSIST CHANGES
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

const GraduationCap = ({ size }: { size: number }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
);

export default EditProfile;
