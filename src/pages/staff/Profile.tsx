import React, { useState, useRef, useEffect } from 'react';
import {
    Settings, Mail, Phone, MapPin, Shield, LogOut, Camera,
    Briefcase, Users, BarChart3, Calendar, Trash2,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { useToast } from '../../context/ToastContext';
import { getDashboardStats, DashboardStats } from '../../services/staffService';
import DeleteAccountModal from '../../components/DeleteAccountModal';

const StaffProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { picture, uploadPicture } = useProfilePicture();
    const { showToast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [showDelete, setShowDelete] = useState(false);

    const name = user?.name || 'STAFF MEMBER';
    const email = user?.email || 'staff@nileuni.edu.ng';
    const department = user?.department || 'CAREER SERVICES';

    useEffect(() => {
        getDashboardStats().then(setStats).catch(() => {});
    }, []);

    const handlePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadPicture(file);
            showToast('Profile picture updated!', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Failed to update picture', 'error');
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const statItems = stats ? [
        { label: 'STUDENTS', value: stats.total_students, icon: <Users size={16} /> },
        { label: 'COMPANIES', value: stats.total_employers, icon: <Briefcase size={16} /> },
        { label: 'ACTIVE JOBS', value: stats.active_jobs, icon: <BarChart3 size={16} />, highlight: true },
        { label: 'EVENTS', value: stats.upcoming_events, icon: <Calendar size={16} /> },
    ] : null;

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 anime-fade-in font-sans pb-24 md:pb-20 text-left max-w-4xl mx-auto">

            {/* Profile Banner */}
            <div className="bg-white border-[2px] border-black rounded-[28px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Cover */}
                <div className="h-28 md:h-40 bg-black relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
                    <div className="absolute inset-0 bg-gradient-to-br from-nile-blue/40 via-transparent to-nile-green/20" />
                </div>

                <div className="px-5 md:px-8 pb-6 md:pb-8 relative">
                    {/* Avatar with camera button */}
                    <div className="absolute -top-10 md:-top-12 left-5 md:left-8 group">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-[3px] border-white bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer relative"
                            onClick={() => fileRef.current?.click()}>
                            {picture
                                ? <img src={picture} alt={name} className="w-full h-full object-cover" />
                                : <Avatar name={name} size="lg" />}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={20} className="text-white" />
                            </div>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
                    </div>

                    <div className="pt-12 md:pt-14 flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl md:text-4xl font-black text-black uppercase leading-none tracking-tighter">{name} .</h1>
                                <span className="bg-black text-white px-2 py-0.5 rounded text-[7px] font-black border border-black">STAFF</span>
                            </div>
                            <p className="text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">{department}</p>
                            <div className="flex items-center gap-2 text-[8px] font-black text-black/30 uppercase pt-0.5">
                                <Mail size={10} strokeWidth={3} />
                                <span>{email}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-1.5 px-4 py-2.5 border-[2px] border-black rounded-xl font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
                                <Camera size={13} /> PHOTO
                            </button>
                            <button onClick={handleLogout}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                                <LogOut size={13} /> LOGOUT
                            </button>
                        </div>
                    </div>

                    {/* Real stats */}
                    <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t-[2px] border-black/5">
                        {statItems ? statItems.map(s => (
                            <div key={s.label} className="text-left">
                                <p className={`text-xl md:text-2xl font-black leading-none ${s.highlight ? 'text-nile-green' : 'text-black'}`}>
                                    {s.value.toLocaleString()}
                                </p>
                                <p className="text-[7px] font-black text-nile-blue/40 uppercase tracking-[0.15em] mt-1">{s.label}</p>
                            </div>
                        )) : [1,2,3,4].map(i => (
                            <div key={i} className="text-left animate-pulse">
                                <div className="h-7 w-12 bg-black/5 rounded-lg mb-1" />
                                <div className="h-3 w-16 bg-black/5 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact */}
                <div className="bg-white border-[2px] border-black rounded-[24px] p-5 md:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h3 className="text-[9px] font-black text-black uppercase tracking-widest pb-3 border-b-[2px] border-black/5">CONTACT INFO</h3>
                    <InfoRow icon={<Mail size={14} />} label="EMAIL" value={email} />
                    <InfoRow icon={<Phone size={14} />} label="OFFICE PHONE" value="+234 (0) 9 123 4567" />
                    <InfoRow icon={<MapPin size={14} />} label="OFFICE" value="Room 402, Admin Block" />
                    <InfoRow icon={<Shield size={14} />} label="ACCESS LEVEL" value="STAFF · ADMIN CONSOLE" />
                </div>

                {/* Account actions */}
                <div className="bg-white border-[2px] border-black rounded-[24px] p-5 md:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h3 className="text-[9px] font-black text-black uppercase tracking-widest pb-3 border-b-[2px] border-black/5">ACCOUNT ACTIONS</h3>
                    <div className="space-y-3">
                        <ActionRow
                            icon={<Settings size={14} />}
                            label="ACCOUNT SETTINGS"
                            desc="Password, security preferences"
                            onClick={() => navigate('/staff/settings')}
                        />
                        <ActionRow
                            icon={<LogOut size={14} />}
                            label="SIGN OUT"
                            desc="Log out of the staff console"
                            onClick={handleLogout}
                            danger={false}
                        />
                        <div className="pt-2 border-t-[2px] border-black/5">
                            <button onClick={() => setShowDelete(true)}
                                className="w-full flex items-center gap-3 p-3 border-[2px] border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all group">
                                <div className="w-8 h-8 bg-red-50 border-[2px] border-red-200 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                                    <Trash2 size={13} className="text-red-500" />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-[10px] uppercase text-red-500">DELETE ACCOUNT</p>
                                    <p className="text-[8px] font-bold text-red-300 uppercase">Permanent · Irreversible</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform stats detail */}
            {stats && (
                <div className="bg-nile-blue text-white border-[2px] border-black rounded-[24px] p-5 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-5 opacity-60">PLATFORM AT A GLANCE</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        <GlanceStat label="PENDING EMPLOYERS" value={stats.pending_employers} />
                        <GlanceStat label="PENDING JOBS" value={stats.pending_jobs} />
                        <GlanceStat label="TOTAL APPLICATIONS" value={stats.total_applications} />
                        <GlanceStat label="UPCOMING EVENTS" value={stats.upcoming_events} />
                    </div>
                </div>
            )}

            {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
        </div>
    );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-nile-white border-[2px] border-black rounded-lg flex items-center justify-center flex-shrink-0 text-nile-blue">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[7px] font-black text-black/30 uppercase tracking-[0.2em] leading-none mb-1">{label}</p>
            <p className="text-[9px] font-black text-black uppercase tracking-wider truncate">{value}</p>
        </div>
    </div>
);

const ActionRow = ({ icon, label, desc, onClick, danger = false }: {
    icon: React.ReactNode; label: string; desc: string; onClick: () => void; danger?: boolean;
}) => (
    <button onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 border-[2px] rounded-xl transition-all group hover:border-black ${danger ? 'border-red-200 hover:bg-red-50' : 'border-black/10 hover:bg-nile-white'}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border-[2px] ${danger ? 'bg-red-50 border-red-200 text-red-500' : 'bg-nile-white border-black/10 text-black group-hover:bg-black group-hover:text-white group-hover:border-black'} transition-colors`}>
            {icon}
        </div>
        <div className="text-left">
            <p className={`font-black text-[10px] uppercase ${danger ? 'text-red-500' : 'text-black'}`}>{label}</p>
            <p className="text-[8px] font-bold text-black/40 uppercase">{desc}</p>
        </div>
    </button>
);

const GlanceStat = ({ label, value }: { label: string; value: number }) => (
    <div>
        <p className="text-xl md:text-3xl font-black leading-none text-white">{value.toLocaleString()}</p>
        <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.15em] mt-1.5">{label}</p>
    </div>
);

export default StaffProfile;
