import React, { useState } from 'react';
import {
    Shield, Bell, Eye, Globe, ChevronRight, Save,
    User, Building2, Trash2, LogOut, Mail, Briefcase,
    Loader2, CheckCircle2,
} from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type Toggle = { label: string; desc: string; key: string };

const EmployerSettings = () => {
    const { showToast } = useToast();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [saving, setSaving] = useState(false);
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        email_alerts:      true,
        application_notif: true,
        message_notif:     true,
        profile_visible:   true,
        show_listings:     true,
        allow_messages:    true,
    });

    const flip = (key: string) => setToggles(p => ({ ...p, [key]: !p[key] }));

    const handleSave = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        showToast('Settings saved successfully', 'success');
    };

    const companyName = user?.company || 'YOUR COMPANY';
    const recruiterName = user?.name || 'RECRUITER';
    const email = user?.email || '';

    return (
        <div className="p-4 md:p-8 space-y-8 font-sans bg-nile-white min-h-full anime-fade-in text-left pb-24 md:pb-8">

            {/* Header */}
            <div className="bg-white border border-gray-100 rounded-[24px] shadow-green p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-nile-green/5 -skew-x-12 translate-x-1/4 pointer-events-none" />
                <div className="space-y-2 z-10">
                    <span className="px-3 py-1 bg-nile-green text-white text-[8px] font-semibold rounded-full">RECRUITER SETTINGS</span>
                    <h2 className="text-3xl md:text-5xl font-semibold text-black leading-none">Preferences .</h2>
                    <p className="text-[10px] font-bold text-black/40">Manage your account, notifications & privacy.</p>
                </div>
                <div className="hidden md:flex items-center gap-4 z-10">
                    <div className="w-14 h-14 bg-nile-blue text-white rounded-[18px] border border-gray-100 flex items-center justify-center font-semibold text-2xl shadow-card">
                        {recruiterName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-black">{recruiterName}</p>
                        <p className="text-[9px] font-semibold text-black/30">{companyName}</p>
                        <p className="text-[8px] font-bold text-nile-blue/60 truncate max-w-[180px]">{email}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl space-y-6">

                {/* Account Info */}
                <Section icon={<User size={14} />} label="ACCOUNT INFO">
                    <Row label="Company Name" value={companyName} onClick={() => navigate('/employer/profile')} />
                    <Divider />
                    <Row label="Contact Email" value={email || '—'} />
                    <Divider />
                    <Row label="Portal Access" value="Employer / Recruiter" />
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Edit Company Profile</p>
                            <p className="text-[9px] font-bold text-black/30">Update branding, description, industry &amp; links.</p>
                        </div>
                        <button
                            onClick={() => navigate('/employer/profile')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-nile-blue text-white border border-gray-100 rounded-lg font-semibold text-[8px] shadow-card transition-all"
                        >
                            <Building2 size={11} /> EDIT
                        </button>
                    </div>
                </Section>

                {/* Notifications */}
                <Section icon={<Bell size={14} />} label="NOTIFICATIONS">
                    {([
                        { label: 'Email Alerts', desc: 'Receive email updates for new candidate applications.', key: 'email_alerts' },
                        { label: 'Application Notifications', desc: 'Get notified when a student applies to your listing.', key: 'application_notif' },
                        { label: 'Message Notifications', desc: 'Alerts for direct messages from students.', key: 'message_notif' },
                    ] as Toggle[]).map((t, i) => (
                        <React.Fragment key={t.key}>
                            {i > 0 && <Divider />}
                            <ToggleRow label={t.label} desc={t.desc} on={toggles[t.key]} onFlip={() => flip(t.key)} />
                        </React.Fragment>
                    ))}
                </Section>

                {/* Privacy */}
                <Section icon={<Eye size={14} />} label="PRIVACY & VISIBILITY">
                    {([
                        { label: 'Public Profile', desc: 'Allow students to view your company profile.', key: 'profile_visible' },
                        { label: 'Show Job Listings', desc: 'Make your job listings visible on the student job board.', key: 'show_listings' },
                        { label: 'Allow Direct Messages', desc: 'Let verified students message your recruiter account.', key: 'allow_messages' },
                    ] as Toggle[]).map((t, i) => (
                        <React.Fragment key={t.key}>
                            {i > 0 && <Divider />}
                            <ToggleRow label={t.label} desc={t.desc} on={toggles[t.key]} onFlip={() => flip(t.key)} />
                        </React.Fragment>
                    ))}
                </Section>

                {/* Security */}
                <Section icon={<Shield size={14} />} label="SECURITY & ACCESS">
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Single Sign-On</p>
                            <p className="text-[9px] font-bold text-black/30">Authenticated via Campus One SSO.</p>
                        </div>
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-nile-green/10 text-nile-green text-[8px] font-semibold rounded-full border border-nile-green/20">
                            <CheckCircle2 size={10} strokeWidth={3} /> ACTIVE
                        </span>
                    </div>
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Active Sessions</p>
                            <p className="text-[9px] font-bold text-black/30">You are currently signed in on this device.</p>
                        </div>
                        <ChevronRight size={16} className="text-black/20" />
                    </div>
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Linked Jobs</p>
                            <p className="text-[9px] font-bold text-black/30">Manage all your job postings from the Job Console.</p>
                        </div>
                        <button
                            onClick={() => navigate('/employer/jobs')}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-lg font-semibold text-[8px] hover:bg-black hover:text-white transition-all"
                        >
                            <Briefcase size={10} /> MANAGE
                        </button>
                    </div>
                </Section>

                {/* Save */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[10px] shadow-green transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                </div>

                {/* Danger Zone */}
                <Section icon={<Trash2 size={14} />} label="DANGER ZONE" danger>
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Sign Out</p>
                            <p className="text-[9px] font-bold text-black/30">End your current session securely.</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-lg font-semibold text-[8px] text-black hover:bg-black hover:text-white transition-all"
                        >
                            <LogOut size={10} /> SIGN OUT
                        </button>
                    </div>
                </Section>
            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Section = ({ icon, label, children, danger = false }: {
    icon: React.ReactNode; label: string; children: React.ReactNode; danger?: boolean;
}) => (
    <section className="space-y-3">
        <h3 className={`text-[9px] font-semibold flex items-center gap-2 ${danger ? 'text-red-500' : 'text-black/40'}`}>
            {icon} {label}
        </h3>
        <div className={`bg-white border border-gray-100 rounded-[20px] p-5 shadow-card space-y-3 ${danger ? 'border-red-200' : ''}`}>
            {children}
        </div>
    </section>
);

const Divider = () => <div className="border-t border-dashed border-black/5" />;

const Row = ({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) => (
    <div
        className={`flex items-center justify-between py-1 ${onClick ? 'cursor-pointer group' : ''}`}
        onClick={onClick}
    >
        <p className="text-[9px] font-semibold text-black/40">{label}</p>
        <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-semibold text-black truncate max-w-[180px]">{value}</p>
            {onClick && <ChevronRight size={12} className="text-black/20 group-hover:text-black transition-colors" />}
        </div>
    </div>
);

const ToggleRow = ({ label, desc, on, onFlip }: { label: string; desc: string; on: boolean; onFlip: () => void }) => (
    <div className="flex items-center justify-between py-1">
        <div className="space-y-0.5 mr-4">
            <p className="text-[11px] font-semibold text-black">{label}</p>
            <p className="text-[9px] font-bold text-black/30">{desc}</p>
        </div>
        <button
            onClick={onFlip}
            className={`w-11 h-6 rounded-full relative p-1 transition-all flex-shrink-0 ${on ? 'bg-black' : 'bg-black/10'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full transition-all absolute top-1 ${on ? 'right-1' : 'left-1'}`} />
        </button>
    </div>
);

export default EmployerSettings;
