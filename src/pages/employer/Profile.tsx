import React, { useState } from 'react';
import { Settings, Building2, Link, Link2, UserRound, Pencil, X, Plus, Mail, MapPin, Globe, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';

interface Product { id: number; name: string; desc: string; }
interface Contact { id: number; name: string; role: string; }

const EmployerProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const companyName = user?.company || 'YOUR COMPANY';
    const recruiterName = user?.name || 'RECRUITER';
    const email = user?.email || 'recruiter@company.com';

    const [editing, setEditing] = useState(false);
    const [profile, setProfile] = useState({
        about: 'A leading innovator in enterprise solutions. We build scalable, high-performance products used by organizations worldwide. Our mission is to simplify complex workflows through intuitive technology.',
        website: 'company.io',
        linkedin: 'linkedin.com/company/yourcompany',
        industry: 'SOFTWARE & TECHNOLOGY',
        location: 'ABUJA, NIGERIA',
        products: [
            { id: 1, name: 'CLOUDDATA PLATFORM', desc: 'A robust analytics engine processing millions of requests daily.' },
            { id: 2, name: 'WORKFLOW PRO', desc: 'Enterprise project management and automation suite.' },
        ] as Product[],
        contacts: [
            { id: 1, name: recruiterName, role: 'LEAD RECRUITER' },
            { id: 2, name: 'HIRING TEAM', role: 'TALENT ACQUISITION' },
        ] as Contact[],
    });
    const [editForm, setEditForm] = useState(profile);

    const handleSave = () => { setProfile(editForm); setEditing(false); };
    const handleCancel = () => { setEditForm(profile); setEditing(false); };
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-10 anime-fade-in font-sans pb-24 md:pb-20 text-left max-w-4xl mx-auto">

            {/* Banner Header */}
            <div className="bg-white border-[2px] border-black rounded-[24px] md:rounded-[32px] shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] md:shadow-[6px_6px_0px_0px_rgba(108,187,86,1)] overflow-hidden">
                <div className="h-24 md:h-36 bg-black border-b-[2px] border-black relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
                    <button
                        onClick={() => setEditing(!editing)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white border-[2px] border-black rounded-lg hidden md:flex items-center justify-center shadow-sm hover:bg-nile-green transition-colors"
                    >
                        {editing ? <X size={16} strokeWidth={2.5} /> : <Settings size={16} strokeWidth={2.5} />}
                    </button>
                </div>

                <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                    {/* Company Logo Avatar */}
                    <div className="absolute -top-8 md:-top-10 left-4 md:left-8 w-16 h-16 md:w-20 md:h-20 bg-white border-[2px] border-black rounded-[12px] md:rounded-[16px] shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] flex items-center justify-center overflow-hidden">
                        <Building2 size={32} strokeWidth={1.5} className="text-black/40" />
                    </div>

                    <div className="pt-10 md:pt-14 flex justify-between items-end flex-wrap gap-4">
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <h1 className="text-xl md:text-3xl font-black text-black uppercase leading-none tracking-tighter truncate max-w-[200px] md:max-w-none">{companyName} .</h1>
                                <span className="bg-nile-green text-black px-2 py-0.5 rounded text-[6px] md:text-[7px] font-black border border-black">VERIFIED</span>
                            </div>
                            <p className="text-[8px] md:text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">{profile.industry} • {profile.location}</p>
                            <div className="flex items-center space-x-2 text-[7px] md:text-[8px] font-black text-black/30 uppercase pt-1 truncate max-w-[250px]">
                                <Mail size={10} strokeWidth={3} />
                                <span>{email}</span>
                            </div>
                        </div>

                        <div className="flex space-x-2 w-full md:w-auto mt-4 md:mt-0">
                             {editing ? (
                                <>
                                    <Button variant="outline" size="sm" fullWidth className="md:w-auto" onClick={handleCancel}>CANCEL</Button>
                                    <Button size="sm" fullWidth className="md:w-auto" onClick={handleSave}>SAVE</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" fullWidth className="md:w-auto" onClick={() => setEditing(true)}>
                                        <Pencil size={14} className="md:mr-1" /> <span className="hidden md:inline">EDIT PROFILE</span><span className="md:hidden">EDIT</span>
                                    </Button>
                                    <Button variant="primary" size="sm" fullWidth className="md:w-auto bg-red-500 hover:bg-red-600 md:hidden" onClick={handleLogout}>
                                        <LogOut size={14} className="mr-1" /> LOGOUT
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex justify-between md:justify-start md:space-x-10 mt-6 pt-5 border-t-[2px] border-black/5 overflow-x-auto no-scrollbar">
                        <Stat value="3" label="JOBS" />
                        <Stat value="276" label="APPS" />
                        <Stat value="12" label="INTERVIEWS" highlight />
                        <Stat value="4" label="OFFERS" />
                    </div>
                </div>
            </div>

            {/* Logout Mobile Only explicitly */}
            <div className="hidden md:block">
                <Button variant="outline" size="sm" className="text-red-500 border-red-500/20" onClick={handleLogout}>
                    <LogOut size={16} className="mr-2" /> EXIT RECRUITER HUB
                </Button>
            </div>

            {/* Body Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Main Column */}
                <div className="md:col-span-2 space-y-6 md:space-y-8">
                    {/* About */}
                    <Card title="ABOUT COMPANY">
                        {editing ? (
                            <textarea
                                value={editForm.about}
                                onChange={(e) => setEditForm(p => ({ ...p, about: e.target.value }))}
                                className="w-full h-28 border-[2px] border-black rounded-xl p-4 font-bold text-xs outline-none focus:shadow-[4px_4px_0px_0px_#1E499D] transition-all bg-nile-white/40 resize-none"
                            />
                        ) : (
                            <p className="font-bold text-nile-blue/80 leading-relaxed text-[10px] md:text-[11px] uppercase text-left">{profile.about}</p>
                        )}
                    </Card>

                    {/* Products */}
                    <Card title="OFFERINGS">
                        <div className="space-y-3">
                            {(editing ? editForm : profile).products.map((p) => (
                                <div key={p.id} className="p-4 border-[2px] border-black rounded-[16px] md:rounded-2xl bg-nile-white/30 hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-left">
                                    {editing ? (
                                        <div className="space-y-2">
                                            <input value={p.name} onChange={(e) => setEditForm(prev => ({ ...prev, products: prev.products.map(x => x.id === p.id ? { ...x, name: e.target.value } : x) }))} className="w-full border-[2px] border-black rounded-lg p-2 font-black text-xs uppercase outline-none" />
                                            <input value={p.desc} onChange={(e) => setEditForm(prev => ({ ...prev, products: prev.products.map(x => x.id === p.id ? { ...x, desc: e.target.value } : x) }))} className="w-full border-[2px] border-black rounded-lg p-2 font-bold text-xs outline-none" />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[11px] md:text-xs font-black uppercase tracking-widest text-black mb-1">{p.name}</p>
                                            <p className="text-[8px] md:text-[9px] font-bold text-nile-blue/60 leading-relaxed">{p.desc}</p>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Key Contacts */}
                    <Card title="HIRING TEAM">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {profile.contacts.map((c) => (
                                <div key={c.id} className="flex items-center space-x-3 p-4 border-[2px] border-black rounded-[16px] md:rounded-2xl hover:bg-nile-white/60 transition-all text-left">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-nile-white border-[2px] border-black rounded-xl flex items-center justify-center flex-shrink-0">
                                        <UserRound size={18} className="text-black/40" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-black uppercase tracking-wide truncate">{c.name}</p>
                                        <p className="text-[7px] font-black text-nile-blue/40 uppercase tracking-widest">{c.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card title="DIGITAL PRESENCE">
                        <div className="space-y-4 text-left">
                            <LinkRow icon={<Globe size={14} />} label="WEBSITE" value={editing ? undefined : profile.website}>
                                {editing && <input value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} className="w-full border-[2px] border-black rounded-lg p-2 font-black text-xs outline-none" />}
                            </LinkRow>
                            <LinkRow icon={<Link2 size={14} />} label="LINKEDIN" value={editing ? undefined : profile.linkedin}>
                                {editing && <input value={editForm.linkedin} onChange={e => setEditForm(p => ({ ...p, linkedin: e.target.value }))} className="w-full border-[2px] border-black rounded-lg p-2 font-black text-xs outline-none" />}
                            </LinkRow>
                        </div>
                    </Card>

                    <Card title="RECRUITER">
                        <div className="flex items-center space-x-3 text-left">
                            <Avatar name={recruiterName} size="sm" />
                            <div>
                                <p className="text-[9px] font-black text-black uppercase">{recruiterName}</p>
                                <p className="text-[7px] font-black text-nile-blue/40 uppercase">LEAD RECRUITER</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const Stat = ({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) => (
    <div className="text-left pr-6 md:pr-0">
        <p className={`text-lg md:text-xl font-black leading-none ${highlight ? 'text-nile-green' : 'text-black'}`}>{value}</p>
        <p className="text-[6px] md:text-[7px] font-black text-nile-blue/40 uppercase tracking-[0.15em] mt-1 whitespace-nowrap">{label}</p>
    </div>
);

const LinkRow = ({ icon, label, value, children }: { icon: React.ReactNode; label: string; value?: string; children?: React.ReactNode }) => (
    <div>
        <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1.5">{icon} {label}</p>
        {value ? <a href={`https://${value}`} target="_blank" rel="noreferrer" className="text-[9px] font-black text-nile-blue underline truncate block max-w-full">{value}</a> : children}
    </div>
);

export default EmployerProfile;
