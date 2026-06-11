import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
    Home, MessageSquare, Briefcase, GraduationCap, LayoutList,
    Calendar, User, LogOut, Mail, Bell, Search, Users,
    Grid3X3, X, ChevronRight,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NileConnectLogo from '../components/NileConnectLogo';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';
import { useProfilePicture } from '../hooks/useProfilePicture';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

const navItems = [
    { to: '/student',              icon: Home,          label: 'Home',     exact: true },
    { to: '/student/feed',         icon: MessageSquare, label: 'Feed' },
    { to: '/student/network',      icon: Users,         label: 'Network' },
    { to: '/student/messages',     icon: Mail,          label: 'Messages' },
    { to: '/student/jobs',         icon: Briefcase,     label: 'Jobs' },
    { to: '/student/career',       icon: GraduationCap, label: 'Career' },
    { to: '/student/applications', icon: LayoutList,    label: 'Applied' },
    { to: '/student/events',       icon: Calendar,      label: 'Events' },
    { to: '/student/profile',      icon: User,          label: 'Profile' },
];

const isActive = (to: string, pathname: string, exact = false) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const NavItem = ({
    to, Icon, label, active, mobile = false, badge,
}: {
    to: string; Icon: React.ElementType; label: string; active: boolean; mobile?: boolean; badge?: number;
}) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            title={label}
            className={`
                w-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer group
                ${mobile ? 'py-1.5 flex-1' : 'py-2.5 px-2 rounded-xl'}
                ${active
                    ? mobile ? 'opacity-100' : 'bg-nile-blue-50 text-nile-blue'
                    : mobile ? 'opacity-50 hover:opacity-80' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}
            `}
        >
            <div className={`
                relative flex items-center justify-center rounded-lg transition-all duration-200
                ${mobile ? 'w-6 h-6' : 'w-9 h-9'}
                ${!mobile && active ? 'text-nile-blue' : ''}
            `}>
                <Icon size={mobile ? 18 : 19} strokeWidth={active ? 2.2 : 1.8} />
                {!!badge && badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>
            <span className={`
                mt-1 leading-none transition-colors
                ${mobile ? 'text-[9px] font-medium' : 'text-[10px] font-medium'}
                ${active
                    ? mobile ? 'text-nile-blue' : 'text-nile-blue font-semibold'
                    : 'text-gray-400'}
            `}>
                {label}
            </span>
        </button>
    );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    const notifRef  = useRef<HTMLDivElement>(null);

    const userName    = user?.name || 'Student';
    const displayInfo = user?.type === 'alumni' ? 'Alumni' : user?.department || 'Student';

    useEffect(() => {
        const start = setTimeout(() => setProgress(40), 0);
        const t = setTimeout(() => setProgress(100), 350);
        return () => { clearTimeout(start); clearTimeout(t); setProgress(0); };
    }, [location.pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setShowSearchResults(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node))
                setShowNotifications(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const crumbs = location.pathname.split('/').filter(x => x && x !== 'student');

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    const toggleNotifications = () => {
        setShowNotifications(v => {
            const next = !v;
            if (next) refreshNotifications();
            return next;
        });
    };

    const navBadge = (label: string) => (label === 'Messages' ? unreadMsgCount : undefined);

    const searchSuggestions = searchQuery.trim() ? [
        { label: `People: "${searchQuery}"`,  Icon: Users,    to: `/student/network?q=${encodeURIComponent(searchQuery)}` },
        { label: `Jobs: "${searchQuery}"`,     Icon: Briefcase,to: `/student/jobs?q=${encodeURIComponent(searchQuery)}` },
        { label: `Events: "${searchQuery}"`,   Icon: Calendar, to: `/student/events?q=${encodeURIComponent(searchQuery)}` },
    ] : [];

    const mobileMain  = [navItems[0], navItems[1]];
    const mobileRight = [navItems[4], navItems[8]];

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-white">
            <div className="w-8 h-8 rounded-full border-2 border-nile-blue border-t-transparent animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Progress bar */}
            <div
                className="fixed top-0 left-0 h-[2px] bg-nile-blue transition-all duration-400 z-[100]"
                style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
            />

            {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
            <aside className="hidden md:flex w-[72px] bg-white border-r border-gray-100 flex-col items-center py-5 z-30 flex-shrink-0">
                <button
                    onClick={() => navigate('/student')}
                    className="mb-5 hover:scale-105 transition-transform flex-shrink-0"
                >
                    <NileConnectLogo size="xs" showText={false} showTagline={false} animated />
                </button>

                <nav className="flex-1 flex flex-col items-center gap-0.5 w-full overflow-y-auto px-2">
                    {navItems.map(item => (
                        <NavItem
                            key={item.to}
                            to={item.to}
                            Icon={item.icon}
                            label={item.label}
                            active={isActive(item.to, location.pathname, item.exact)}
                            badge={navBadge(item.label)}
                        />
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-100 w-full flex flex-col items-center gap-3 px-2">
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="w-full py-2 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut size={17} />
                    </button>
                    <button
                        onClick={() => navigate('/student/profile')}
                        className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-nile-blue transition-all"
                    >
                        <Avatar name={userName} size="sm" src={profilePic || undefined} />
                    </button>
                </div>
            </aside>

            {/* ── Mobile Bottom Nav ─────────────────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 h-[62px] flex items-center z-40 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] px-1">
                {mobileMain.map(item => (
                    <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)} mobile />
                ))}

                {/* FAB */}
                <button
                    onClick={() => setShowMoreMenu(true)}
                    className="flex-1 flex flex-col items-center justify-center -mt-5"
                >
                    <div className="w-12 h-12 bg-nile-blue rounded-2xl flex items-center justify-center shadow-blue hover:shadow-soft-md transition-all active:scale-95">
                        <Grid3X3 size={19} className="text-white" />
                    </div>
                    <span className="text-[9px] font-medium text-gray-400 mt-1">More</span>
                </button>

                {mobileRight.map(item => (
                    <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)} mobile />
                ))}
            </nav>

            {/* ── Mobile More Overlay ───────────────────────────────────────── */}
            {showMoreMenu && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setShowMoreMenu(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative w-full bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-soft-lg animate-in slide-in-from-bottom-3 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                        <div className="flex items-center justify-between mb-5">
                            <NileConnectLogo size="xs" showText showTagline={false} animated={false} />
                            <button onClick={() => setShowMoreMenu(false)}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                                <X size={14} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {navItems.map(item => {
                                const active = isActive(item.to, location.pathname, item.exact);
                                const Icon = item.icon;
                                const badge = navBadge(item.label);
                                return (
                                    <button
                                        key={item.to}
                                        onClick={() => { navigate(item.to); setShowMoreMenu(false); }}
                                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                                            ${active
                                                ? 'bg-nile-blue text-white'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    >
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
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 flex items-center justify-center gap-2 text-red-500 text-sm font-medium rounded-2xl hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={16} /> Sign out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Area ─────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 flex-shrink-0 gap-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
                        <button onClick={() => navigate('/student')} className="md:hidden w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                            <Avatar name={userName} size="sm" src={profilePic || undefined} />
                        </button>
                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-400">
                            <button onClick={() => navigate('/student')} className="font-medium hover:text-gray-700 transition-colors whitespace-nowrap">
                                Student Hub
                            </button>
                            {crumbs.map((c, i) => (
                                <React.Fragment key={c}>
                                    <ChevronRight size={13} className="opacity-40" />
                                    <span className={`capitalize ${i === crumbs.length - 1 ? 'text-gray-700 font-semibold' : 'hover:text-gray-700 cursor-pointer'}`}>
                                        {c.replace(/-/g, ' ')}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex-1 max-w-sm mx-3" ref={searchRef}>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search people, jobs, events…"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                                onFocus={() => setShowSearchResults(true)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        navigate(`/student/network?q=${encodeURIComponent(searchQuery)}`);
                                        setShowSearchResults(false);
                                        setSearchQuery('');
                                    }
                                }}
                                className="w-full h-9 bg-gray-50 border border-gray-200 rounded-full pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-nile-blue focus:bg-white focus:ring-2 focus:ring-nile-blue/10 transition-all"
                            />
                            {showSearchResults && searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-soft-md overflow-hidden z-50">
                                    {searchSuggestions.map((s, i) => (
                                        <button key={i} onClick={() => { navigate(s.to); setShowSearchResults(false); setSearchQuery(''); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
                                            <s.Icon size={14} className="text-nile-blue opacity-70 flex-shrink-0" />
                                            <span className="text-sm text-gray-700">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => navigate('/student/messages')}
                            className="relative p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                            <Mail size={18} />
                            {unreadMsgCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                                </span>
                            )}
                        </button>

                        <div ref={notifRef} className="relative">
                            <button onClick={toggleNotifications}
                                className={`relative p-2 rounded-xl transition-colors ${showNotifications ? 'text-nile-blue bg-nile-blue-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                                <Bell size={18} />
                                {unreadNotifCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-nile-green text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
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

                        <div className="hidden md:block h-5 w-px bg-gray-100 mx-1" />

                        <button onClick={() => navigate('/student/profile')}
                            className="hidden md:flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors group">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800 leading-none">{userName}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{displayInfo}</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl overflow-hidden ring-2 ring-gray-100 group-hover:ring-nile-blue transition-all">
                                <Avatar name={userName} size="sm" src={profilePic || undefined} />
                            </div>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-0">
                    <div className="max-w-[1240px] mx-auto min-h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
