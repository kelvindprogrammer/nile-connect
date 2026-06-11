import React, { useState } from 'react';
import {
    Shield, Bell, Database, Layout, Save, LogOut,
    ChevronRight, CheckCircle2, Loader2, Users,
    BarChart2, Lock, Eye, Trash2, ShieldCheck,
} from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type Toggle = { label: string; desc: string; key: string };

const StaffSettings = () => {
    const { showToast } = useToast();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [saving, setSaving] = useState(false);
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        admin_mode:         true,
        audit_logging:      true,
        email_digest:       true,
        employer_alerts:    true,
        student_alerts:     false,
        public_dashboard:   false,
    });

    const flip = (key: string) => setToggles(p => ({ ...p, [key]: !p[key] }));

    const handleSave = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        showToast('Administrative settings updated', 'success');
    };

    const staffName = user?.name || 'ADMIN';
    const email     = user?.email || '';

    return (
        <div className="p-4 md:p-8 space-y-8 font-sans bg-nile-white min-h-full anime-fade-in text-left pb-24 md:pb-8">

            {/* Hero Header */}
            <div className="bg-white border border-gray-100 rounded-[24px] shadow-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-black/[0.03] -skew-x-12 translate-x-1/4 pointer-events-none" />
                <div className="space-y-2 z-10">
                    <span className="px-3 py-1 bg-black text-white text-[8px] font-semibold rounded-full">ADMIN CONFIG</span>
                    <h2 className="text-3xl md:text-5xl font-semibold text-black leading-none">System Config .</h2>
                    <p className="text-[10px] font-bold text-black/40">Administrative controls and platform security protocols.</p>
                </div>
                <div className="hidden md:flex items-center gap-4 z-10">
                    <div className="w-14 h-14 bg-black text-nile-green rounded-[18px] border border-gray-100 flex items-center justify-center shadow-green">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-black">{staffName}</p>
                        <p className="text-[9px] font-semibold text-black/30">STAFF ADMINISTRATOR</p>
                        <p className="text-[8px] font-bold text-nile-blue/60 truncate max-w-[180px]">{email}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Students', icon: <Users size={16} />, path: '/staff/services', color: 'hover:bg-black hover:text-white' },
                    { label: 'Reports', icon: <BarChart2 size={16} />, path: '/staff/reports', color: 'hover:bg-nile-blue hover:text-white' },
                    { label: 'Audit Log', icon: <Eye size={16} />, path: '/staff/applications', color: 'hover:bg-nile-green hover:text-white' },
                    { label: 'CRM', icon: <Bell size={16} />, path: '/staff/crm', color: 'hover:bg-yellow-400 hover:text-black' },
                ].map(a => (
                    <button
                        key={a.label}
                        onClick={() => navigate(a.path)}
                        className={`bg-white border border-gray-100 rounded-[16px] p-4 flex flex-col items-start gap-2.5 transition-all shadow-card ${a.color}`}
                    >
                        {a.icon}
                        <span className="text-[9px] font-semibold leading-none">{a.label}</span>
                    </button>
                ))}
            </div>

            <div className="max-w-3xl space-y-6">

                {/* Interface Preferences */}
                <Section icon={<Layout size={14} />} label="INTERFACE PREFERENCES">
                    <ToggleRow
                        label="Advanced Admin Mode"
                        desc="Enable deep-access analytics, system logs, and raw data views."
                        on={toggles.admin_mode}
                        onFlip={() => flip('admin_mode')}
                    />
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Platform Status</p>
                            <p className="text-[9px] font-bold text-black/30">Nile Connect is fully operational.</p>
                        </div>
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-nile-green/10 text-nile-green text-[8px] font-semibold rounded-full border border-nile-green/20">
                            <CheckCircle2 size={10} strokeWidth={3} /> LIVE
                        </span>
                    </div>
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Dashboard Overview</p>
                            <p className="text-[9px] font-bold text-black/30">View platform-wide metrics and engagement reports.</p>
                        </div>
                        <button
                            onClick={() => navigate('/staff')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white border border-gray-100 rounded-lg font-semibold text-[8px] shadow-card transition-all"
                        >
                            VIEW
                        </button>
                    </div>
                </Section>

                {/* Security & Audit */}
                <Section icon={<Shield size={14} />} label="SECURITY & AUDIT">
                    <ToggleRow
                        label="Login Audit Logging"
                        desc="Record all staff login events and suspicious access patterns."
                        on={toggles.audit_logging}
                        onFlip={() => flip('audit_logging')}
                    />
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Campus One SSO</p>
                            <p className="text-[9px] font-bold text-black/30">Authentication handled by Nile University SSO.</p>
                        </div>
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-nile-blue/10 text-nile-blue text-[8px] font-semibold rounded-full border border-nile-blue/20">
                            <Lock size={10} strokeWidth={3} /> SECURED
                        </span>
                    </div>
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Active Admin Sessions</p>
                            <p className="text-[9px] font-bold text-black/30">You are signed in on this device.</p>
                        </div>
                        <ChevronRight size={16} className="text-black/20" />
                    </div>
                </Section>

                {/* Notifications */}
                <Section icon={<Bell size={14} />} label="NOTIFICATION CENTER">
                    {([
                        { label: 'Daily Email Digest', desc: 'Receive a daily summary of platform activity.', key: 'email_digest' },
                        { label: 'Employer Verification Alerts', desc: 'Notify me when new employers submit for approval.', key: 'employer_alerts' },
                        { label: 'Student Activity Alerts', desc: 'Receive alerts for unusual student activity patterns.', key: 'student_alerts' },
                    ] as Toggle[]).map((t, i) => (
                        <React.Fragment key={t.key}>
                            {i > 0 && <Divider />}
                            <ToggleRow label={t.label} desc={t.desc} on={toggles[t.key]} onFlip={() => flip(t.key)} />
                        </React.Fragment>
                    ))}
                </Section>

                {/* Data & Reports */}
                <Section icon={<Database size={14} />} label="DATA & REPORTS">
                    <ToggleRow
                        label="Public Dashboard"
                        desc="Allow students to view aggregated platform statistics."
                        on={toggles.public_dashboard}
                        onFlip={() => flip('public_dashboard')}
                    />
                    <Divider />
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Export Platform Data</p>
                            <p className="text-[9px] font-bold text-black/30">Download CSV reports for students, jobs and applications.</p>
                        </div>
                        <button
                            onClick={() => navigate('/staff/reports')}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-lg font-semibold text-[8px] hover:bg-black hover:text-white transition-all"
                        >
                            <BarChart2 size={10} /> REPORTS
                        </button>
                    </div>
                </Section>

                {/* Save */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-black text-white border border-gray-100 rounded-xl font-semibold text-[10px] shadow-card transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'COMMITTING...' : 'COMMIT CHANGES'}
                    </button>
                </div>

                {/* Danger Zone */}
                <Section icon={<Trash2 size={14} />} label="DANGER ZONE" danger>
                    <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-black">Sign Out</p>
                            <p className="text-[9px] font-bold text-black/30">End your admin session securely.</p>
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

export default StaffSettings;
