import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
    Home, MessageSquare, Briefcase, GraduationCap, LayoutList,
    Calendar, User, LogOut, Mail, Bell, Search, Users, ChevronRight,
    Grid3X3, X, ArrowRight,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NileConnectLogo from '../components/NileConnectLogo';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';
import { useProfilePicture } from '../hooks/useProfilePicture';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { to: '/student',              icon: <Home />,         label: 'HOME',    exact: true },
    { to: '/student/feed',         icon: <MessageSquare />,label: 'FEED' },
    { to: '/student/network',      icon: <Users />,        label: 'NET' },
    { to: '/student/messages',     icon: <Mail />,         label: 'MAIL' },
    { to: '/student/jobs',         icon: <Briefcase />,    label: 'JOBS' },
    { to: '/student/career',       icon: <GraduationCap />,label: 'GROW' },
    { to: '/student/applications', icon: <LayoutList />,   label: 'APPS' },
    { to: '/student/events',       icon: <Calendar />,     label: 'LIVE' },
    { to: '/student/profile',      icon: <User />,         label: 'PROFILE' },
];

const isActive = (to: string, pathname: string, exact = false) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const SlimNavItem = ({
    to, icon, label, active, mobile = false,
}: {
    to: string; icon: React.ReactNode; label: string; active: boolean; mobile?: boolean;
}) => {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate(to)}
            className={`
                flex-1 flex flex-col items-center justify-center transition-all group relative cursor-pointer
                ${mobile ? 'py-2' : 'w-full py-3'}
                ${active ? 'opacity-100' : 'opacity-40 hover:opacity-100'}
            `}
        >
            {!mobile && active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-nile-blue rounded-r-full animate-in slide-in-from-left-1" />
            )}
            <div className={`
                ${mobile ? 'w-8 h-8' : 'w-11 h-11'}
                flex items-center justify-center rounded-xl transition-all duration-300
                ${active
                    ? 'bg-nile-blue text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] border-[2px] border-black'
                    : 'bg-transparent text-black border-2 border-transparent group-hover:bg-nile-white group-hover:border-black'}
            `}>
                {React.cloneElement(icon as React.ReactElement, { size: mobile ? 16 : 20 })}
            </div>
            <span className={`
                ${mobile ? 'text-[6px]' : 'text-[7px]'}
                font-black tracking-[0.1em] mt-1 transition-colors
                ${active ? 'text-nile-blue' : 'text-black opacity-40 group-hover:opacity-100'}
            `}>
                {label}
            </span>
        </div>
    );
};

const MoreMenuItem = ({ to, icon, label, onClose }: { to: string; icon: React.ReactNode; label: string; onClose: () => void }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const active = location.pathname === to || (to !== '/student' && location.pathname.startsWith(to));
    return (
        <button
            onClick={() => { navigate(to); onClose(); }}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-[16px] border-[2px] transition-all
                ${active
                    ? 'bg-nile-blue text-white border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]'
                    : 'bg-white text-black border-black/10 hover:border-black hover:bg-nile-white'}`}
        >
            <div className="w-8 h-8 flex items-center justify-center">
                {React.cloneElement(icon as React.ReactElement, { size: 20 })}
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest leading-none">{label}</span>
        </button>
    );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    // Auth guard: redirect to login if not authenticated
    if (!user) return <Navigate to="/login" replace />;
    const { picture: profilePic } = useProfilePicture();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showMailBadge, setShowMailBadge] = useState(true);
    const [progress, setProgress] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const userName = user?.name || 'USER';
    const userType = user?.type;
    const userDept = user?.department;
    const displayInfo = userType === 'alumni'
        ? 'ALUMNI • CLASS OF 2024'
        : userDept
        ? userDept.toUpperCase()
        : 'L400 • CS';

    useEffect(() => {
        setProgress(30);
        const timer = setTimeout(() => setProgress(100), 400);
        return () => { clearTimeout(timer); setProgress(0); };
    }, [location.pathname]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchResults(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const breadcrumbs = location.pathname.split('/').filter(x => x && x !== 'student');

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/student/network?q=${encodeURIComponent(searchQuery.trim())}`);
            setShowSearchResults(false);
            setSearchQuery('');
        }
    };

    const searchSuggestions = searchQuery.trim().length > 0 ? [
        { label: `People: "${searchQuery}"`, icon: <Users size={12} />, to: `/student/network?q=${encodeURIComponent(searchQuery)}` },
        { label: `Jobs: "${searchQuery}"`, icon: <Briefcase size={12} />, to: `/student/jobs?q=${encodeURIComponent(searchQuery)}` },
        { label: `Events: "${searchQuery}"`, icon: <Calendar size={12} />, to: `/student/events?q=${encodeURIComponent(searchQuery)}` },
    ] : [];

    const mobileNavLeft = navItems.slice(0, 2);
    const mobileNavRight = [navItems[4], navItems[8]]; // JOBS, PROFILE

    return (
        <div className="flex h-screen bg-nile-white text-black font-sans overflow-hidden">
            {/* Page progress bar */}
            <div
                className="fixed top-0 left-0 h-0.5 bg-nile-blue transition-all duration-500 z-[100]"
                style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
            />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-[84px] bg-white border-r-[2px] border-black flex-col items-center py-6 z-30 flex-shrink-0">
                <div
                    onClick={() => navigate('/student')}
                    className="mb-6 cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                >
                    <NileConnectLogo size="xs" showText={false} showTagline={false} animated />
                </div>

                <nav className="flex-1 flex flex-col items-center space-y-1 w-full custom-scrollbar overflow-y-auto px-1">
                    {navItems.map(item => (
                        <SlimNavItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            active={isActive(item.to, location.pathname, item.exact)}
                        />
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t-[2px] border-black/5 w-full flex flex-col items-center space-y-4">
                    <button onClick={handleLogout} className="opacity-40 hover:opacity-100 transition-all text-red-500">
                        <LogOut size={18} />
                    </button>
                    <div
                        className="w-9 h-9 rounded-full border-[2px] border-black/10 overflow-hidden cursor-pointer hover:border-nile-blue transition-colors"
                        onClick={() => navigate('/student/profile')}
                    >
                        <Avatar name={userName} size="sm" src={profilePic || undefined} />
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-[2px] border-black h-[60px] px-2 flex items-center justify-around z-[40] shadow-[0_-4px_10px_rgba(0,0,0,0.06)]">
                {mobileNavLeft.map(item => (
                    <SlimNavItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)}
                        mobile
                    />
                ))}

                {/* Center FAB - opens More menu */}
                <div
                    onClick={() => setShowMoreMenu(true)}
                    className="flex flex-col items-center justify-center -mt-6 flex-shrink-0 cursor-pointer"
                >
                    <div className="w-12 h-12 bg-nile-blue border-[2px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] hover:scale-105 transition-all">
                        <Grid3X3 size={20} className="text-white" />
                    </div>
                    <span className="text-[5px] font-black tracking-[0.1em] mt-1 text-black/40">MORE</span>
                </div>

                {mobileNavRight.map(item => (
                    <SlimNavItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)}
                        mobile
                    />
                ))}
            </nav>

            {/* Mobile More Menu Overlay */}
            {showMoreMenu && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setShowMoreMenu(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full bg-white border-t-[3px] border-black rounded-t-[28px] pt-4 pb-8 px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-5" />
                        <div className="flex items-center justify-between mb-4">
                            <NileConnectLogo size="xs" showText showTagline={false} animated={false} />
                            <button onClick={() => setShowMoreMenu(false)} className="p-1.5 rounded-lg border-2 border-black/10">
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                            {navItems.map(item => (
                                <MoreMenuItem
                                    key={item.to}
                                    to={item.to}
                                    icon={item.icon}
                                    label={item.label}
                                    onClose={() => setShowMoreMenu(false)}
                                />
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t-[2px] border-black/5">
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 flex items-center justify-center gap-2 text-red-500 text-[9px] font-black uppercase tracking-widest border-2 border-red-200 rounded-[14px] hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={14} strokeWidth={3} />
                                LOG OUT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
                {/* Header */}
                <header className="h-14 border-b-[2px] border-black flex items-center justify-between px-3 md:px-6 bg-white/90 backdrop-blur-md sticky top-0 z-20 flex-shrink-0 gap-2">
                    {/* Left: Logo / Breadcrumb */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                            onClick={() => navigate('/student')}
                            className="md:hidden w-8 h-8 rounded-lg border-2 border-black overflow-hidden cursor-pointer"
                        >
                            <Avatar name={userName} size="sm" src={profilePic || undefined} />
                        </div>
                        <div className="hidden sm:flex items-center text-[9px] font-black uppercase tracking-widest text-black/40">
                            <span className="hover:text-nile-blue cursor-pointer transition-colors" onClick={() => navigate('/student')}>
                                STUDENT HUB
                            </span>
                            {breadcrumbs.length > 0 && breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={crumb}>
                                    <ChevronRight size={10} className="mx-2 opacity-30" />
                                    <span className={i === breadcrumbs.length - 1 ? 'text-black' : 'hover:text-black transition-colors'}>
                                        {crumb.replace(/-/g, ' ')}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Center: Search */}
                    <div className="flex-1 mx-2 md:mx-6 max-w-md" ref={searchRef}>
                        <div className="relative group">
                            <Search size={13} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-nile-blue transition-colors pointer-events-none" />
                            <input
                                type="text"
                                placeholder="SEARCH PEOPLE, JOBS, EVENTS..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                                onKeyDown={handleSearch}
                                onFocus={() => setShowSearchResults(true)}
                                className="w-full bg-nile-white border-[2px] border-black rounded-lg py-1.5 pl-9 pr-3 font-black text-[9px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all"
                            />
                            {showSearchResults && searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-[2px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50">
                                    {searchSuggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { navigate(s.to); setShowSearchResults(false); setSearchQuery(''); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-nile-white transition-colors border-b border-black/5 last:border-0"
                                        >
                                            <span className="text-nile-blue opacity-60">{s.icon}</span>
                                            <span className="text-[9px] font-black uppercase text-left">{s.label}</span>
                                            <ArrowRight size={10} className="ml-auto text-black/30" />
                                        </button>
                                    ))}
                                    <div className="px-4 py-2 bg-nile-white/50">
                                        <p className="text-[7px] font-black text-black/30 uppercase tracking-widest">Press Enter to search</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        {/* Mail - visible on all sizes */}
                        <button
                            onClick={() => navigate('/student/messages')}
                            className="relative p-2 text-black/40 hover:text-black transition-colors rounded-lg hover:bg-nile-white"
                        >
                            <Mail size={17} />
                            {showMailBadge && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 border-2 border-white rounded-full" />
                            )}
                        </button>

                        {/* Notifications */}
                        <div ref={notifRef} className="relative">
                            <button
                                onClick={() => setShowNotifications(prev => !prev)}
                                className={`p-2 transition-all relative rounded-lg hover:bg-nile-white ${showNotifications ? 'text-nile-blue bg-nile-white' : 'text-black/40 hover:text-black'}`}
                            >
                                <Bell size={17} />
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-nile-green border-2 border-white rounded-full" />
                            </button>
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-2 z-50 w-[320px] max-w-[calc(100vw-24px)] animate-in fade-in slide-in-from-top-1">
                                    <NotificationTray onClose={() => setShowNotifications(false)} />
                                </div>
                            )}
                        </div>

                        <div className="hidden md:block h-5 w-px bg-black/10 mx-1" />

                        {/* User Info (desktop) */}
                        <div
                            className="hidden md:flex items-center gap-2 cursor-pointer group"
                            onClick={() => navigate('/student/profile')}
                        >
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase leading-none">{userName}</p>
                                <p className="text-[7px] font-bold text-nile-blue/50 uppercase mt-0.5 tracking-wider">{displayInfo}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all overflow-hidden">
                                <Avatar name={userName} size="sm" src={profilePic || undefined} />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-nile-white/20 scroll-smooth custom-scrollbar pb-20 md:pb-0">
                    <div className="max-w-[1240px] mx-auto min-h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
