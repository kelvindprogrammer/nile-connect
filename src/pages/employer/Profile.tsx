import React, { useState, useEffect, useRef } from 'react';
import { Settings, Building2, Link2, Pencil, X, Mail, Globe, LogOut, Loader2, ShieldCheck, ShieldAlert, Upload, Users2, MapPinned, CalendarClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { getEmployerProfile, updateEmployerProfile, EmployerProfile as EProfile } from '../../services/employerService';
import { uploadFile } from '../../services/messageService';

const EmployerProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [profile, setProfile] = useState<EProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<Partial<EProfile>>({});
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getEmployerProfile()
            .then(p => { setProfile(p); setEditForm(p); })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Backend PUT is a full overwrite (no partial-update semantics), so we
            // send the entire editForm — it was seeded from the full profile on
            // load, so untouched fields round-trip unchanged. is_verified/status
            // are staff-controlled and intentionally omitted.
            const updated = await updateEmployerProfile({
                company_name: editForm.company_name,
                industry: editForm.industry,
                location: editForm.location,
                about: editForm.about,
                contact_email: editForm.contact_email,
                website: editForm.website,
                linkedin: editForm.linkedin,
                logo_url: editForm.logo_url,
                company_size: editForm.company_size,
                headquarters: editForm.headquarters,
                founded_year: editForm.founded_year,
            });
            setProfile(updated);
            setEditForm(updated);
            setEditing(false);
            showToast('Profile updated!', 'success');
        } catch {
            showToast('Save failed. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => { setEditForm(profile ?? {}); setEditing(false); };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const { url } = await uploadFile(file);
            setEditForm(p => ({ ...p, logo_url: url }));
            showToast('Logo uploaded — click Save to apply', 'success');
        } catch {
            showToast('Logo upload failed', 'error');
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="animate-spin text-nile-blue/40" />
            </div>
        );
    }

    const companyName = profile?.company_name || user?.company || 'YOUR COMPANY';
    const recruiterName = user?.name || 'RECRUITER';
    const email = profile?.contact_email || user?.email || '';
    const isApproved = profile?.status === 'approved';
    const isVerifiedBadge = !!profile?.is_verified;

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-10 anime-fade-in font-sans pb-24 md:pb-20 text-left max-w-4xl mx-auto">

            {/* Banner Header */}
            <div className="bg-white border border-gray-100 rounded-[24px] md:rounded-[32px] shadow-green md:shadow-green overflow-hidden">
                <div className="h-24 md:h-36 bg-black border-b border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
                    <button
                        onClick={() => setEditing(!editing)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white border border-gray-100 rounded-lg hidden md:flex items-center justify-center shadow-sm hover:bg-nile-green transition-colors"
                    >
                        {editing ? <X size={16} strokeWidth={2.5} /> : <Settings size={16} strokeWidth={2.5} />}
                    </button>
                </div>

                <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                    <div className="absolute -top-8 md:-top-10 left-4 md:left-8 w-16 h-16 md:w-20 md:h-20 bg-white border border-gray-100 rounded-[12px] md:rounded-[16px] shadow-green flex items-center justify-center overflow-hidden group">
                        {(editing ? editForm.logo_url : profile?.logo_url) ? (
                            <img src={editing ? editForm.logo_url : profile?.logo_url} alt={companyName} className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={32} strokeWidth={1.5} className="text-black/40" />
                        )}
                        {editing && (
                            <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={uploadingLogo}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            >
                                {uploadingLogo ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            </button>
                        )}
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </div>

                    <div className="pt-10 md:pt-14 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-xl md:text-3xl font-semibold text-black leading-none truncate">{companyName} .</h1>
                                {isApproved ? (
                                    <span className="flex items-center gap-1 bg-nile-green text-white text-[6px] md:text-[7px] font-semibold px-2 py-0.5 rounded border border-black flex-shrink-0">
                                        <ShieldCheck size={8} strokeWidth={3} /> APPROVED
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[6px] md:text-[7px] font-semibold px-2 py-0.5 rounded border border-black flex-shrink-0">
                                        <ShieldAlert size={8} strokeWidth={3} /> PENDING
                                    </span>
                                )}
                                {isVerifiedBadge && (
                                    <span className="flex items-center gap-1 bg-nile-blue text-white text-[6px] md:text-[7px] font-semibold px-2 py-0.5 rounded border border-black flex-shrink-0">
                                        <ShieldCheck size={8} strokeWidth={3} /> VERIFIED
                                    </span>
                                )}
                            </div>
                            <p className="text-[8px] md:text-[9px] font-semibold text-nile-blue/50">
                                {profile?.industry || 'SOFTWARE & TECHNOLOGY'} • {profile?.location || 'NIGERIA'}
                            </p>
                            <div className="flex items-center space-x-2 text-[7px] md:text-[8px] font-semibold text-black/30 pt-1 truncate max-w-[250px]">
                                <Mail size={10} strokeWidth={3} />
                                <span>{email}</span>
                            </div>
                        </div>

                        <div className="flex space-x-2 w-full sm:w-auto">
                            {editing ? (
                                <>
                                    <Button variant="outline" size="sm" fullWidth className="sm:w-auto" onClick={handleCancel}>CANCEL</Button>
                                    <Button size="sm" fullWidth className="sm:w-auto" onClick={handleSave} isLoading={isSaving}>SAVE</Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" fullWidth className="sm:w-auto" onClick={() => setEditing(true)}>
                                    <Pencil size={14} className="mr-2" /> EDIT PROFILE
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout */}
            <Button variant="outline" size="sm" className="text-red-500 border-red-500/20" onClick={() => { logout(); navigate('/login'); }}>
                <LogOut size={16} className="mr-2" /> EXIT RECRUITER HUB
            </Button>

            {/* Body Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div className="md:col-span-2 space-y-6 md:space-y-8">
                    <Card title="ABOUT COMPANY">
                        {editing ? (
                            <textarea
                                value={editForm.about ?? ''}
                                onChange={(e) => setEditForm(p => ({ ...p, about: e.target.value }))}
                                className="w-full h-28 border border-gray-100 rounded-xl p-4 font-bold text-xs outline-none focus:shadow-blue transition-all bg-nile-white/40 resize-none"
                                placeholder="Describe your company..."
                            />
                        ) : (
                            <p className="font-bold text-nile-blue/80 leading-relaxed text-[10px] md:text-[11px] text-left">
                                {profile?.about || 'No company description yet. Click Edit Profile to add one.'}
                            </p>
                        )}
                    </Card>

                    {editing && (
                        <Card title="COMPANY DETAILS">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">COMPANY NAME</label>
                                        <input value={editForm.company_name ?? ''} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">INDUSTRY</label>
                                        <input value={editForm.industry ?? ''} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))} className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">LOCATION</label>
                                        <input value={editForm.location ?? ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">CONTACT EMAIL</label>
                                        <input type="email" value={editForm.contact_email ?? ''} onChange={e => setEditForm(p => ({ ...p, contact_email: e.target.value }))} className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">COMPANY SIZE</label>
                                        <input value={editForm.company_size ?? ''} onChange={e => setEditForm(p => ({ ...p, company_size: e.target.value }))} placeholder="e.g. 51-200 employees" className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">HEADQUARTERS</label>
                                        <input value={editForm.headquarters ?? ''} onChange={e => setEditForm(p => ({ ...p, headquarters: e.target.value }))} placeholder="e.g. Abuja, Nigeria" className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-black/40 block mb-1">FOUNDED YEAR</label>
                                        <input
                                            type="number"
                                            value={editForm.founded_year ?? ''}
                                            onChange={e => setEditForm(p => ({ ...p, founded_year: e.target.value ? Number(e.target.value) : undefined }))}
                                            placeholder="e.g. 2015"
                                            className="w-full border border-gray-100 rounded-xl p-3 font-semibold text-xs outline-none focus:shadow-blue bg-nile-white/40"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {!editing && (profile?.company_size || profile?.headquarters || profile?.founded_year) && (
                        <Card title="COMPANY FACTS">
                            <div className="flex flex-wrap gap-4">
                                {profile?.company_size && (
                                    <span className="flex items-center gap-1.5 text-[9px] font-semibold text-black/50"><Users2 size={12} className="text-nile-blue" /> {profile.company_size}</span>
                                )}
                                {profile?.headquarters && (
                                    <span className="flex items-center gap-1.5 text-[9px] font-semibold text-black/50"><MapPinned size={12} className="text-nile-green" /> {profile.headquarters}</span>
                                )}
                                {profile?.founded_year ? (
                                    <span className="flex items-center gap-1.5 text-[9px] font-semibold text-black/50"><CalendarClock size={12} className="text-nile-blue" /> Founded {profile.founded_year}</span>
                                ) : null}
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card title="DIGITAL PRESENCE">
                        <div className="space-y-4 text-left">
                            {editing ? (
                                <>
                                    <div>
                                        <label className="text-[7px] font-semibold text-black/30 flex items-center gap-1.5 mb-1.5"><Globe size={14} /> WEBSITE</label>
                                        <input value={editForm.website ?? ''} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} placeholder="company.io" className="w-full border border-gray-100 rounded-lg p-2 font-semibold text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-semibold text-black/30 flex items-center gap-1.5 mb-1.5"><Link2 size={14} /> LINKEDIN</label>
                                        <input value={editForm.linkedin ?? ''} onChange={e => setEditForm(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/company/..." className="w-full border border-gray-100 rounded-lg p-2 font-semibold text-xs outline-none" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-[7px] font-semibold text-black/30 flex items-center gap-1.5 mb-1.5"><Globe size={14} /> WEBSITE</p>
                                        {profile?.website ? <a href={`https://${profile.website}`} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-nile-blue underline truncate block">{profile.website}</a> : <p className="text-[9px] font-semibold text-black/20">Not set</p>}
                                    </div>
                                    <div>
                                        <p className="text-[7px] font-semibold text-black/30 flex items-center gap-1.5 mb-1.5"><Link2 size={14} /> LINKEDIN</p>
                                        {profile?.linkedin ? <a href={`https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-nile-blue underline truncate block">{profile.linkedin}</a> : <p className="text-[9px] font-semibold text-black/20">Not set</p>}
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    <Card title="RECRUITER">
                        <div className="flex items-center space-x-3 text-left">
                            <Avatar name={recruiterName} size="sm" />
                            <div>
                                <p className="text-[9px] font-semibold text-black">{recruiterName}</p>
                                <p className="text-[7px] font-semibold text-nile-blue/40">LEAD RECRUITER</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default EmployerProfile;
