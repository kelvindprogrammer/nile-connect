import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Home, Briefcase, Settings2, Calendar, HeartHandshake,
    BarChart3, User, LogOut, Bell, Mail, ChevronRight,
    Search, Grid3X3, X,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NileConnectLogo from '../components/NileConnectLogo';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';
import { useProfilePicture } from '../hooks/useProfilePicture';

const navItems = [
    { to: '/staff',          icon: <Home />,          label: 'ADMIN',    exact: true },
    { to: '/staff/jobs',     icon: <Briefcase />,     label: 'JOBS' },
    { to: '/staff/services', icon: <Settings2 />,     label: 'SERVICES' },
    { to: '/staff/events',   icon: <Calendar />,      label: 'EVENTS' },
    { to: '/staff/crm',      icon: <HeartHandshake />,label: 'CRM' },
    { to: '/staff/reports',  icon: <BarChart3 />,     label: 'REPORTS' },
    { to: '/staff/profile',  icon: <User />,          label: 'USER' },
];

const isActive = (to: string, pathname: string, exact = false) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const NavItem = ({ to, icon, label, active, mobile = false }: {
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-black rounded-r-full" />
            )}
            <div className={`
                ${mobile ? 'w-8 h-8' : 'w-11 h-11'}
                flex items-center justify-center rounded-xl transition-all duration-200
                ${active
                    ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] border-[2px] border-black'
                    : 'bg-transparent text-black border-2 border-transparent group-hover:bg-nile-white group-hover:border-black'}
            `}>
                {React.cloneElement(icon as React.ReactElement, { size: mobile ? 15 : 19 })}
            </div>
            <span className={`
                ${mobile ? 'text-[5.5px]' : 'text-[7px]'}
                font-black tracking-[0.1em] mt-1 transition-colors
                ${active ? 'text-black' : 'text-black opacity-40 group-hover:opacity-100'}
            `}>
                {label}
            </span>
        </div>
    );
};

const MobileNavBtn = ({ to, icon, label, onClose }: { to: string; icon: React.ReactNode; label: string; onClose: () => void }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const active = location.pathname === to || (to !== '/staff' && location.pathname.startsWith(to));
    return (
        <button
            onClick={() => { navigate(to); onClose(); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-[14px] border-[2px] transition-all
                ${active ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' : 'bg-white text-black border-black/10 hover:border-black'}`}
        >
            <div className="w-7 h-7 flex items-center justify-center">
                {React.cloneElement(icon as React.ReactElement, { size: 18 })}
            </div>
            <span className="text-[6.5px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
};

const StaffLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { picture: profilePic } = useProfilePicture();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [progress, setProgress] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    const userName = user?.name || 'STAFF';
    const department = user?.department || 'Career Services';

    useEffect(() => {
        setProgress(30);
        const t = setTimeout(() => setProgress(100), 400);
        return () => { clearTimeout(t); setProgress(0); };
    }, [location.pathname]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const breadcrumbs = location.pathname.split('/').filter(x => x && x !== 'staff');

    return (
        <div className="flex h-screen bg-nile-white text-black font-sans overflow-hidden">
            {/* Progress bar */}
            <div className="fixed top-0 left-0 h-0.5 bg-black transition-all duration-500 z-[100]"
                style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }} />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-[84px] bg-white border-r-[2px] border-black flex-col items-center py-5 z-30 flex-shrink-0">
                <div onClick={() => navigate('/staff')} className="mb-6 cursor-pointer hover:scale-105 transition-transform">
                    <NileConnectLogo size="xs" showText={false} animated />
                </div>
                <nav className="flex-1 flex flex-col items-center space-y-0.5 w-full overflow-y-auto px-1">
                    {navItems.map(item => (
                        <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label}
                            active={isActive(item.to, location.pathname, item.exact)} />
                    ))}
                </nav>
                <div className="mt-auto pt-3 border-t-[2px] border-black/5 w-full flex flex-col items-center gap-3">
                    <button onClick={() => { logout(); navigate('/login'); }} className="opacity-40 hover:opacity-100 text-red-500 transition-all p-1">
                        <LogOut size={17} />
                    </button>
                    <div className="w-9 h-9 rounded-full border-[2px] border-black/10 overflow-hidden cursor-pointer hover:border-black transition-colors"
                        onClick={() => navigate('/staff/profile')}>
                        {profilePic
                            ? <img src={profilePic} alt={userName} className="w-full h-full object-cover" />
                            : <Avatar name={userName} size="sm" />}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-[2px] border-black h-[58px] px-2 flex items-center justify-around z-[40]">
                <NavItem to="/staff" icon={<Home />} label="ADMIN" active={location.pathname === '/staff'} mobile />
                <NavItem to="/staff/jobs" icon={<Briefcase />} label="JOBS" active={isActive('/staff/jobs', location.pathname)} mobile />
                <div onClick={() => setShowMoreMenu(true)} className="flex flex-col items-center justify-center -mt-5 flex-shrink-0 cursor-pointer">
                    <div className="w-11 h-11 bg-black border-[2px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]">
                        <Grid3X3 size={18} className="text-white" />
                    </div>
                    <span className="text-[5px] font-black tracking-widest mt-0.5 text-black/40">MORE</span>
                </div>
                <NavItem to="/staff/events" icon={<Calendar />} label="EVENTS" active={isActive('/staff/events', location.pathname)} mobile />
                <NavItem to="/staff/profile" icon={<User />} label="ME" active={isActive('/staff/profile', location.pathname)} mobile />
            </nav>

            {/* Mobile More Menu */}
            {showMoreMenu && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setShowMoreMenu(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full bg-white border-t-[3px] border-black rounded-t-[26px] pt-4 pb-8 px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-4" />
                        <div className="flex items-center justify-between mb-4">
                            <NileConnectLogo size="xs" showText showTagline={false} animated={false} />
                            <button onClick={() => setShowMoreMenu(false)} className="p-1.5 border-2 border-black/10 rounded-lg">
                                <X size={13} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {navItems.map(item => (
                                <MobileNavBtn key={item.to} to={item.to} icon={item.icon} label={item.label} onClose={() => setShowMoreMenu(false)} />
                            ))}
                        </div>
                        <button onClick={() => { logout(); navigate('/login'); }}
                            className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 text-red-500 text-[9px] font-black uppercase tracking-widest border-2 border-red-200 rounded-[12px] hover:bg-red-50 transition-colors">
                            <LogOut size={13} strokeWidth={3} /> LOG OUT
                        </button>
                    </div>
                </div>
            )}

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
                <header className="h-13 border-b-[2px] border-black flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-md sticky top-0 z-20 flex-shrink-0" style={{height:'52px'}}>
                    <div className="flex items-center gap-3">
                        <div onClick={() => navigate('/staff/profile')} className="md:hidden w-8 h-8 rounded-lg border-2 border-black overflow-hidden cursor-pointer">
                            {profilePic ? <img src={profilePic} alt={userName} className="w-full h-full object-cover" /> : <Avatar name={userName} size="sm" />}
                        </div>
                        <div className="hidden sm:flex items-center text-[8px] font-black uppercase tracking-widest text-black/40">
                            <span className="hover:text-black cursor-pointer transition-colors" onClick={() => navigate('/staff')}>STAFF HUB</span>
                            {breadcrumbs.map((c, i) => (
                                <React.Fragment key={c}>
                                    <ChevronRight size={9} className="mx-1.5 opacity-30" />
                                    <span className={i === breadcrumbs.length - 1 ? 'text-black font-black' : ''}>{c.replace(/-/g,' ')}</span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 mx-3 md:mx-5 max-w-sm">
                        <div className="relative group">
                            <Search size={12} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                            <input type="text" placeholder="QUICK SEARCH..."
                                className="w-full bg-nile-white border-[2px] border-black rounded-lg py-1.5 pl-8 pr-3 font-black text-[8px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#000] transition-all" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate('/staff/messages')} className="hidden sm:block p-2 text-black/40 hover:text-black transition-colors"><Mail size={16} /></button>
                        <div ref={notifRef} className="relative">
                            <button onClick={() => setShowNotifications(v => !v)} className="p-2 text-black/40 hover:text-black transition-colors relative">
                                <Bell size={16} />
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-nile-green border-2 border-white rounded-full" />
                            </button>
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-2 z-50 w-[300px] max-w-[calc(100vw-16px)] animate-in fade-in slide-in-from-top-1">
                                    <NotificationTray onClose={() => setShowNotifications(false)} />
                                </div>
                            )}
                        </div>
                        <div className="hidden md:flex items-center gap-2 cursor-pointer group ml-1" onClick={() => navigate('/staff/profile')}>
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase leading-none">{userName}</p>
                                <p className="text-[6px] font-bold text-black/40 uppercase mt-0.5 tracking-wider">{department}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
                                {profilePic ? <img src={profilePic} alt={userName} className="w-full h-full object-cover" /> : <Avatar name={userName} size="sm" />}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-nile-white/20 scroll-smooth custom-scrollbar pb-16 md:pb-0">
                    <div className="max-w-[1400px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffLayout;
