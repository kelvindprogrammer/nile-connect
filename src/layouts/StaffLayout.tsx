import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
    Home, Briefcase, Calendar, UserRound, LogOut, Bell, Mail,
    ChevronRight, Search, HeartHandshake, BarChart2, Stethoscope,
    Settings, Grid3X3, X,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NileConnectLogo from '../components/NileConnectLogo';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

const navItems = [
    { to: '/staff',          label: 'Dashboard', icon: Home,          exact: true },
    { to: '/staff/jobs',     label: 'Jobs',       icon: Briefcase },
    { to: '/staff/services', label: 'Services',   icon: Stethoscope },
    { to: '/staff/events',   label: 'Events',     icon: Calendar },
    { to: '/staff/crm',      label: 'CRM',        icon: HeartHandshake },
    { to: '/staff/reports',  label: 'Reports',    icon: BarChart2 },
    { to: '/staff/profile',  label: 'Profile',    icon: UserRound },
];

const isActive = (to: string, pathname: string, exact = false) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const NavItem = ({ to, Icon, label, active, mobile = false, badge }: {
    to: string; Icon: React.ElementType; label: string; active: boolean; mobile?: boolean; badge?: number;
}) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            title={label}
            className={`
                w-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer
                ${mobile ? 'py-1.5 flex-1' : 'py-2.5 px-2 rounded-xl'}
                ${active
                    ? mobile ? 'opacity-100' : 'bg-gray-900 text-white'
                    : mobile ? 'opacity-50 hover:opacity-80' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}
            `}
        >
            <div className={`relative flex items-center justify-center rounded-lg ${mobile ? 'w-6 h-6' : 'w-9 h-9'}`}>
                <Icon size={mobile ? 18 : 19} strokeWidth={active ? 2.2 : 1.8} />
                {badge && badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>
            <span className={`mt-1 leading-none text-[10px] font-medium transition-colors ${active ? '' : 'text-gray-400'}`}>
                {label}
            </span>
        </button>
    );
};

const StaffLayout = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { user, logout, isLoading } = useAuth();
    const { notifications, unreadCount: unreadNotifCount, loaded: notifsLoaded, refreshNotifications, markRead, markAllRead } = useNotifications();
    const { unreadCount: unreadMsgCount } = useUnreadMessages();

    const [showNotifications, setShowNotifications] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [progress, setProgress] = useState(0);

    const userName   = user?.name || 'Staff';
    const department = user?.department || 'Career Services';

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    const toggleNotifications = () => {
        setShowNotifications(v => {
            const next = !v;
            if (next) refreshNotifications();
            return next;
        });
    };

    useEffect(() => {
        const start = setTimeout(() => setProgress(40), 0);
        const t = setTimeout(() => setProgress(100), 350);
        return () => { clearTimeout(start); clearTimeout(t); setProgress(0); };
    }, [location.pathname]);

    const crumbs = location.pathname.split('/').filter(x => x && x !== 'staff');
    const mobileLeft  = [navItems[0], navItems[1]];
    const mobileRight = [navItems[3], navItems[6]];

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-white">
            <div className="w-8 h-8 rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            <div className="fixed top-0 left-0 h-[2px] bg-gray-900 transition-all duration-400 z-[100]"
                style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }} />

            {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
            <aside className="hidden md:flex w-[72px] bg-white border-r border-gray-100 flex-col items-center py-5 z-30 flex-shrink-0">
                <button onClick={() => navigate('/staff')} className="mb-5 hover:scale-105 transition-transform flex-shrink-0">
                    <NileConnectLogo size="xs" showText={false} showTagline={false} animated />
                </button>

                <nav className="flex-1 flex flex-col items-center gap-0.5 w-full overflow-y-auto px-2">
                    {navItems.map(item => (
                        <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                            active={isActive(item.to, location.pathname, item.exact)} />
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-100 w-full flex flex-col items-center gap-3 px-2">
                    <button onClick={handleLogout} title="Sign out"
                        className="w-full py-2 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <LogOut size={17} />
                    </button>
                    <button onClick={() => navigate('/staff/profile')}
                        className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-gray-900 transition-all">
                        <Avatar name={userName} size="sm" />
                    </button>
                </div>
            </aside>

            {/* ── Mobile Bottom Nav ──────────────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 h-[62px] flex items-center z-40 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] px-1">
                {mobileLeft.map(item => (
                    <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)} mobile />
                ))}
                <button onClick={() => setShowMoreMenu(true)} className="flex-1 flex flex-col items-center justify-center -mt-5">
                    <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-soft-md hover:shadow-soft-lg transition-all active:scale-95">
                        <Grid3X3 size={19} className="text-white" />
                    </div>
                    <span className="text-[9px] font-medium text-gray-400 mt-1">More</span>
                </button>
                {mobileRight.map(item => (
                    <NavItem key={item.to} to={item.to} Icon={item.icon} label={item.label}
                        active={isActive(item.to, location.pathname, item.exact)} mobile />
                ))}
            </nav>

            {/* ── Mobile More Overlay ────────────────────────────────────── */}
            {showMoreMenu && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setShowMoreMenu(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative w-full bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-soft-lg animate-in slide-in-from-bottom-3 duration-200"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                        <div className="flex items-center justify-between mb-5">
                            <NileConnectLogo size="xs" showText showTagline={false} animated={false} />
                            <button onClick={() => setShowMoreMenu(false)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                                <X size={14} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {navItems.map(item => {
                                const active = isActive(item.to, location.pathname, item.exact);
                                const Icon = item.icon;
                                return (
                                    <button key={item.to} onClick={() => { navigate(item.to); setShowMoreMenu(false); }}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                                            ${active ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                                        <span className="text-[10px] font-medium leading-none">{item.label}</span>
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => navigate('/staff/profile')} className="md:hidden w-8 h-8 rounded-xl overflow-hidden">
                            <Avatar name={userName} size="sm" />
                        </button>
                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-400">
                            <button onClick={() => navigate('/staff')} className="font-medium hover:text-gray-700 transition-colors">Staff Hub</button>
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

                    <div className="flex-1 max-w-sm mx-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Quick search…"
                                className="w-full h-9 bg-gray-50 border border-gray-200 rounded-full pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => navigate('/staff/messages')}
                            className="relative p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                            <Mail size={18} />
                            {unreadMsgCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                                </span>
                            )}
                        </button>
                        <button onClick={() => navigate('/staff/settings')}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors hidden sm:flex">
                            <Settings size={18} />
                        </button>
                        <div className="relative">
                            <button onClick={toggleNotifications}
                                className={`relative p-2 rounded-xl transition-colors ${showNotifications ? 'text-gray-900 bg-gray-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
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

                        <div className="hidden md:block h-5 w-px bg-gray-100 mx-1" />

                        <button onClick={() => navigate('/staff/profile')}
                            className="hidden md:flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors group">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800 leading-none">{userName}</p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[100px]">{department}</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl overflow-hidden ring-2 ring-gray-100 group-hover:ring-gray-400 transition-all">
                                <Avatar name={userName} size="sm" />
                            </div>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                    <div className="max-w-[1400px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffLayout;
