import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
    Home, Briefcase, Calendar, UserRound, LogOut, Bell, Mail,
    ChevronRight, Search, HeartHandshake, BarChart2, Users,
    Settings, Grid3X3, X, GraduationCap, LayoutList, FileText,
    Sparkles,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NileConnectLogo from '../components/NileConnectLogo';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useProfilePicture } from '../hooks/useProfilePicture';

type Role = 'student' | 'employer' | 'staff';

interface NavConfig {
    accentBg: string;         // e.g. 'bg-nile-blue'
    accentBgSoft: string;     // e.g. 'bg-nile-blue/10'
    accentText: string;       // e.g. 'text-nile-blue'
    accentShadow: string;     // e.g. 'shadow-blue'
    accentSpin: string;       // e.g. 'border-nile-blue'
    avatarHoverRing: string;  // e.g. 'hover:ring-nile-blue'
    avatarGroupRing: string;  // e.g. 'group-hover:ring-nile-blue'
    inputFocusClasses: string; // full focus:* class string for search input
    notifActiveClasses: string; // full class string for active notif button
    hubLabel: string;
    searchPlaceholder: string;
    primary: { to: string; label: string; icon: React.ElementType; exact?: boolean }[];
    more: { to: string; label: string; icon: React.ElementType; exact?: boolean }[];
    profilePath: string;
    messagesPath: string;
    settingsPath: string;
}

const CONFIG: Record<Role, NavConfig> = {
    student: {
        accentBg: 'bg-nile-blue', accentBgSoft: 'bg-nile-blue/10', accentText: 'text-nile-blue', accentShadow: 'shadow-blue',
        accentSpin: 'border-nile-blue',
        avatarHoverRing: 'hover:ring-nile-blue', avatarGroupRing: 'group-hover:ring-nile-blue',
        inputFocusClasses: 'focus:border-nile-blue focus:bg-white focus:ring-2 focus:ring-nile-blue/10',
        notifActiveClasses: 'text-nile-blue bg-nile-blue-50',
        hubLabel: 'Student Hub',
        searchPlaceholder: 'Search people, jobs, events…',
        primary: [
            { to: '/student',          label: 'Home',         icon: Home, exact: true },
            { to: '/student/network',  label: 'Network',      icon: Users },
            { to: '/student/jobs',     label: 'Opportunities',icon: Briefcase },
            { to: '/student/messages', label: 'Messages',     icon: Mail },
            { to: '/student/profile',  label: 'Profile',      icon: UserRound },
        ],
        more: [
            { to: '/student/career',       label: 'Career',   icon: GraduationCap },
            { to: '/student/applications', label: 'Applied',  icon: LayoutList },
            { to: '/student/documents',    label: 'Docs',     icon: FileText },
            { to: '/student/events',       label: 'Events',   icon: Calendar },
            { to: '/student/insights',     label: 'Insights', icon: Sparkles },
        ],
        profilePath: '/student/profile',
        messagesPath: '/student/messages',
        settingsPath: '/student/profile/edit',
    },
    employer: {
        accentBg: 'bg-nile-green', accentBgSoft: 'bg-nile-green/10', accentText: 'text-nile-green', accentShadow: 'shadow-green',
        accentSpin: 'border-nile-green',
        avatarHoverRing: 'hover:ring-nile-green', avatarGroupRing: 'group-hover:ring-nile-green',
        inputFocusClasses: 'focus:border-nile-green focus:bg-white focus:ring-2 focus:ring-nile-green/10',
        notifActiveClasses: 'text-nile-green bg-nile-green-50',
        hubLabel: 'Recruiter Hub',
        searchPlaceholder: 'Search talent…',
        primary: [
            { to: '/employer',            label: 'Home',          icon: Home, exact: true },
            { to: '/employer/candidates', label: 'Talent',        icon: Users },
            { to: '/employer/jobs',       label: 'Opportunities', icon: Briefcase },
            { to: '/employer/messages',   label: 'Messages',      icon: Mail },
            { to: '/employer/profile',    label: 'Profile',       icon: UserRound },
        ],
        more: [
            { to: '/employer/applications', label: 'Applications', icon: FileText },
            { to: '/employer/events',       label: 'Events',       icon: Calendar },
            { to: '/employer/insights',     label: 'Insights',     icon: Sparkles },
            { to: '/employer/settings',     label: 'Settings',     icon: Settings },
        ],
        profilePath: '/employer/profile',
        messagesPath: '/employer/messages',
        settingsPath: '/employer/settings',
    },
    staff: {
        accentBg: 'bg-gray-900', accentBgSoft: 'bg-gray-100', accentText: 'text-gray-900', accentShadow: 'shadow-soft-md',
        accentSpin: 'border-gray-900',
        avatarHoverRing: 'hover:ring-gray-900', avatarGroupRing: 'group-hover:ring-gray-400',
        inputFocusClasses: 'focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100',
        notifActiveClasses: 'text-gray-900 bg-gray-100',
        hubLabel: 'Staff Hub',
        searchPlaceholder: 'Quick search…',
        primary: [
            { to: '/staff',          label: 'Home',    icon: Home, exact: true },
            { to: '/staff/crm',      label: 'Network',  icon: HeartHandshake },
            { to: '/staff/jobs',     label: 'Opportunities', icon: Briefcase },
            { to: '/staff/messages', label: 'Messages', icon: Mail },
            { to: '/staff/profile',  label: 'Profile',  icon: UserRound },
        ],
        more: [
            { to: '/staff/services', label: 'Services', icon: GraduationCap },
            { to: '/staff/events',   label: 'Events',    icon: Calendar },
            { to: '/staff/reports',  label: 'Reports',   icon: BarChart2 },
            { to: '/staff/insights', label: 'Insights',  icon: Sparkles },
            { to: '/staff/settings', label: 'Settings',  icon: Settings },
        ],
        profilePath: '/staff/profile',
        messagesPath: '/staff/messages',
        settingsPath: '/staff/settings',
    },
};

const isActive = (to: string, pathname: string, exact = false) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const NavItem = ({ to, Icon, label, active, badge, accentText, accentBgSoft }: {
    to: string; Icon: React.ElementType; label: string; active: boolean; badge?: number;
    accentText: string; accentBgSoft: string;
}) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            title={label}
            className="w-full flex flex-col items-center justify-center py-1.5 flex-1 transition-all duration-200 cursor-pointer"
        >
            <div className={`relative flex items-center justify-center rounded-lg w-6 h-6 ${active ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {!!badge && badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>
            <span className={`mt-1 leading-none text-[9px] font-medium transition-colors whitespace-nowrap ${active ? `${accentText} font-semibold` : 'text-gray-400'}`}>
                {label}
            </span>
        </button>
    );
};

// Desktop rail item: icon + label as a horizontal row, with an active accent
// bar on the left edge — replaces the old icon-stack rail where longer
// labels like "Opportunities" would wrap and visually collide with
// neighbouring rows in the cramped 72px column.
const RailItem = ({ to, Icon, label, active, badge, accentText, accentBgSoft, accentBg }: {
    to: string; Icon: React.ElementType; label: string; active: boolean; badge?: number;
    accentText: string; accentBgSoft: string; accentBg: string;
}) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            className={`relative w-full flex items-center gap-3 pl-3.5 pr-3 py-2.5 rounded-xl transition-all duration-150 group
                ${active ? `${accentBgSoft} ${accentText}` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
        >
            {active && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full ${accentBg}`} />}
            <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                {!!badge && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>
            <span className={`text-sm truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </button>
    );
};

const AppShell = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isLoading } = useAuth();
    const { picture: profilePic } = useProfilePicture();
    const { notifications, unreadCount: unreadNotifCount, loaded: notifsLoaded, refreshNotifications, markRead, markAllRead } = useNotifications();
    const { unreadCount: unreadMsgCount } = useUnreadMessages();

    const [showNotifications, setShowNotifications] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [progress, setProgress] = useState(0);
    const searchRef = useRef<HTMLDivElement>(null);

    const role: Role = (user?.role as Role) || 'student';
    const cfg = CONFIG[role];

    const userName = user?.name || (role === 'employer' ? 'Recruiter' : role === 'staff' ? 'Staff' : 'Student');
    const subLabel = role === 'employer'
        ? (user?.company || '')
        : role === 'staff'
            ? (user?.department || 'Career Services')
            : (user?.type === 'alumni' ? 'Alumni' : user?.department || 'Student');

    useEffect(() => {
        const start = setTimeout(() => setProgress(40), 0);
        const t = setTimeout(() => setProgress(100), 350);
        return () => { clearTimeout(start); clearTimeout(t); setProgress(0); };
    }, [location.pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setShowSearchResults(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const rootPath = `/${role}`;
    const crumbs = location.pathname.split('/').filter(x => x && x !== role);

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    const toggleNotifications = () => {
        setShowNotifications(v => {
            const next = !v;
            if (next) refreshNotifications();
            return next;
        });
    };

    const navBadge = (label: string) => (label === 'Messages' ? unreadMsgCount : undefined);

    const allNavItems = [...cfg.primary, ...cfg.more];
    const mobileLeft  = [cfg.primary[0], cfg.primary[1]];
    const mobileRight = [cfg.primary[3], cfg.primary[4]];

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-white">
            <div className={`w-8 h-8 rounded-full border-2 ${cfg.accentSpin} border-t-transparent animate-spin`} />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            <div className={`fixed top-0 left-0 h-[2px] ${cfg.accentBg} transition-all duration-400 z-[100]`}
                style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }} />

            {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
            <aside className="hidden md:flex w-[236px] bg-white border-r border-gray-100 flex-col py-5 z-30 flex-shrink-0">
                <button onClick={() => navigate(rootPath)} className="flex items-center gap-2 px-4 mb-6 hover:opacity-80 transition-opacity flex-shrink-0">
                    <NileConnectLogo size="xs" showText showTagline={false} animated />
                </button>

                <div className="px-4 mb-4">
                    <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">{cfg.hubLabel}</p>
                </div>

                <nav className="flex-1 flex flex-col gap-0.5 w-full overflow-y-auto px-3">
                    {cfg.primary.map(item => (
                        <RailItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                            active={isActive(item.to, location.pathname, item.exact)}
                            badge={navBadge(item.label)} accentText={cfg.accentText} accentBgSoft={cfg.accentBgSoft} accentBg={cfg.accentBg} />
                    ))}

                    <div className="w-full h-px bg-gray-100 my-3" />

                    <p className="px-3.5 mb-1 text-[10px] font-semibold text-gray-300 uppercase tracking-wider">More</p>
                    {cfg.more.map(item => (
                        <RailItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                            active={isActive(item.to, location.pathname, item.exact)}
                            badge={navBadge(item.label)} accentText={cfg.accentText} accentBgSoft={cfg.accentBgSoft} accentBg={cfg.accentBg} />
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-100 w-full px-3">
                    <button onClick={() => navigate(cfg.profilePath)}
                        className="w-full flex items-center gap-3 px-1.5 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className={`w-9 h-9 rounded-xl overflow-hidden ring-2 ring-transparent ${cfg.avatarGroupRing} transition-all flex-shrink-0`}>
                            <Avatar name={userName} size="sm" src={profilePic || undefined} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-800 leading-none truncate">{userName}</p>
                            {subLabel && <p className="text-xs text-gray-400 mt-0.5 truncate">{subLabel}</p>}
                        </div>
                    </button>
                    <button onClick={handleLogout} title="Sign out"
                        className="w-full mt-1 py-2 flex items-center gap-3 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium">
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </aside>

            {/* ── Mobile Bottom Nav ──────────────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 h-[62px] flex items-center z-40 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] px-1">
                {mobileLeft.map(item => (
                    <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)}
                        accentText={cfg.accentText} accentBgSoft={cfg.accentBgSoft} />
                ))}
                <button onClick={() => setShowMoreMenu(true)} className="flex-1 flex flex-col items-center justify-center -mt-5">
                    <div className={`w-12 h-12 ${cfg.accentBg} rounded-2xl flex items-center justify-center ${cfg.accentShadow} hover:shadow-soft-md transition-all active:scale-95`}>
                        <Grid3X3 size={19} className="text-white" />
                    </div>
                    <span className="text-[9px] font-medium text-gray-400 mt-1">More</span>
                </button>
                {mobileRight.map(item => (
                    <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)}
                        badge={navBadge(item.label)} accentText={cfg.accentText} accentBgSoft={cfg.accentBgSoft} />
                ))}
            </nav>

            {/* ── More Overlay (mobile + desktop) ──────────────────────────── */}
            {showMoreMenu && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center" onClick={() => setShowMoreMenu(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative w-full md:w-[420px] bg-white rounded-t-3xl md:rounded-3xl pt-3 pb-10 md:pb-6 px-5 shadow-soft-lg animate-in slide-in-from-bottom-3 duration-200"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-5 md:hidden" />
                        <div className="flex items-center justify-between mb-5">
                            <NileConnectLogo size="xs" showText showTagline={false} animated={false} />
                            <button onClick={() => setShowMoreMenu(false)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                                <X size={14} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {allNavItems.map(item => {
                                const active = isActive(item.to, location.pathname, item.exact);
                                const Icon = item.icon;
                                const badge = navBadge(item.label);
                                return (
                                    <button key={item.to} onClick={() => { navigate(item.to); setShowMoreMenu(false); }}
                                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                                            ${active ? `${cfg.accentBg} text-white` : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                                        <span className="text-[10px] font-medium leading-none">{item.label}</span>
                                        {!!badge && badge > 0 && (
                                            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                                {badge > 9 ? '9+' : badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-100">
                            <button onClick={handleLogout}
                                className="w-full py-3 flex items-center justify-center gap-2 text-red-500 text-sm font-medium rounded-2xl hover:bg-red-50 transition-colors">
                                <LogOut size={16} /> Sign out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main ──────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 flex-shrink-0 gap-3">
                    <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
                        <button onClick={() => navigate(cfg.profilePath)} className="md:hidden w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                            <Avatar name={userName} size="sm" src={profilePic || undefined} />
                        </button>
                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-400">
                            <button onClick={() => navigate(rootPath)} className="font-medium hover:text-gray-700 transition-colors whitespace-nowrap">
                                {cfg.hubLabel}
                            </button>
                            {crumbs.map((c, i) => (
                                <React.Fragment key={c}>
                                    <ChevronRight size={13} className="opacity-40" />
                                    <span className={`capitalize ${i === crumbs.length - 1 ? 'text-gray-700 font-semibold' : ''}`}>
                                        {c.replace(/-/g, ' ')}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 max-w-sm mx-3" ref={searchRef}>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder={cfg.searchPlaceholder}
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                                onFocus={() => setShowSearchResults(true)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        navigate(`${cfg.primary[1].to}?q=${encodeURIComponent(searchQuery)}`);
                                        setShowSearchResults(false);
                                        setSearchQuery('');
                                    }
                                }}
                                className={`w-full h-9 bg-gray-50 border border-gray-200 rounded-full pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all ${cfg.inputFocusClasses}`}
                            />
                            {showSearchResults && searchQuery.trim() && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-soft-md overflow-hidden z-50">
                                    <button
                                        onClick={() => { navigate(`${cfg.primary[1].to}?q=${encodeURIComponent(searchQuery)}`); setShowSearchResults(false); setSearchQuery(''); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                                        <Search size={14} className={`${cfg.accentText} opacity-70 flex-shrink-0`} />
                                        <span className="text-sm text-gray-700">Search "{searchQuery}"</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => navigate(cfg.messagesPath)}
                            className="relative p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                            <Mail size={18} />
                            {unreadMsgCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                                </span>
                            )}
                        </button>
                        <button onClick={() => navigate(cfg.settingsPath)}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors hidden sm:flex">
                            <Settings size={18} />
                        </button>
                        <div className="relative">
                            <button onClick={toggleNotifications}
                                className={`relative p-2 rounded-xl transition-colors ${showNotifications ? cfg.notifActiveClasses : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                                <Bell size={18} />
                                {unreadNotifCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                                    </span>
                                )}
                            </button>
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-2 z-50 w-80 max-w-[calc(100vw-16px)] animate-in fade-in slide-in-from-top-1">
                                    <NotificationTray
                                        notifications={notifications}
                                        loaded={notifsLoaded}
                                        onMarkRead={markRead}
                                        onMarkAllRead={markAllRead}
                                        onClose={() => setShowNotifications(false)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-0">
                    <div className="max-w-[1240px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AppShell;
