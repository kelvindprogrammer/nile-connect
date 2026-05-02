import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Home, Briefcase, Users, Mail, Settings,
    LogOut, Bell, ChevronRight, Search, UserRound,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NileConnectLogo from '../components/NileConnectLogo';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';
import { useProfilePicture } from '../hooks/useProfilePicture';

const navItems = [
    { to: '/employer',              icon: <Home />,      label: 'DASH',      exact: true },
    { to: '/employer/candidates',   icon: <Users />,     label: 'TALENT' },
    { to: '/employer/jobs',         icon: <Briefcase />, label: 'JOBS' },
    { to: '/employer/applications', icon: <Briefcase />, label: 'APPS' },
    { to: '/employer/messages',     icon: <Mail />,      label: 'MAIL' },
    { to: '/employer/profile',      icon: <UserRound />, label: 'ME' },
];

const isActive = (to: string, pathname: string, exact = false) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const NavItem = ({ to, icon, label, active, mobile = false }: {
    to: string; icon: React.ReactNode; label: string; active: boolean; mobile?: boolean;
}) => {
    const navigate = useNavigate();
    return (
        <div onClick={() => navigate(to)}
            className={`flex-1 flex flex-col items-center justify-center transition-all group relative cursor-pointer
                ${mobile ? 'py-2' : 'w-full py-3'}
                ${active ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
            {!mobile && active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-nile-green rounded-r-full" />
            )}
            <div className={`${mobile ? 'w-8 h-8' : 'w-11 h-11'}
                flex items-center justify-center rounded-xl transition-all duration-200
                ${active
                    ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] border-[2px] border-black'
                    : 'bg-transparent text-black border-2 border-transparent group-hover:bg-nile-white group-hover:border-black'}`}>
                {React.cloneElement(icon as React.ReactElement, { size: mobile ? 15 : 19 })}
            </div>
            <span className={`${mobile ? 'text-[5.5px]' : 'text-[7px]'}
                font-black tracking-[0.1em] mt-1 transition-colors
                ${active ? 'text-black' : 'text-black opacity-40 group-hover:opacity-100'}`}>
                {label}
            </span>
        </div>
    );
};

const EmployerLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { picture } = useProfilePicture();
    const [showNotifications, setShowNotifications] = useState(false);
    const [progress, setProgress] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    const userName = user?.name || 'RECRUITER';
    const companyName = user?.company || 'COMPANY';

    useEffect(() => {
        setProgress(30);
        const t = setTimeout(() => setProgress(100), 400);
        return () => { clearTimeout(t); setProgress(0); };
    }, [location.pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node))
                setShowNotifications(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const breadcrumbs = location.pathname.split('/').filter(x => x && x !== 'employer');

    return (
        <div className="flex h-screen bg-nile-white text-black font-sans overflow-hidden">
            <div className="fixed top-0 left-0 h-0.5 bg-nile-green transition-all duration-500 z-[100]"
                style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }} />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-[84px] bg-white border-r-[2px] border-black flex-col items-center py-5 z-30 flex-shrink-0">
                <div onClick={() => navigate('/employer')} className="mb-6 cursor-pointer hover:scale-105 transition-transform">
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
                        onClick={() => navigate('/employer/profile')}>
                        {picture
                            ? <img src={picture} alt={userName} className="w-full h-full object-cover" />
                            : <Avatar name={userName} size="sm" />}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-[2px] border-black h-[58px] px-2 flex items-center justify-around z-[40]">
                <NavItem to="/employer" icon={<Home />} label="DASH" active={location.pathname === '/employer'} mobile />
                <NavItem to="/employer/candidates" icon={<Users />} label="TALENT" active={isActive('/employer/candidates', location.pathname)} mobile />
                <div onClick={() => navigate('/employer/jobs')} className="flex flex-col items-center justify-center -mt-5 flex-shrink-0 cursor-pointer">
                    <div className="w-11 h-11 bg-black border-[2px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(108,187,86,1)]">
                        <Briefcase size={18} className="text-white" />
                    </div>
                    <span className="text-[5px] font-black tracking-widest mt-0.5 text-black/40">JOBS</span>
                </div>
                <NavItem to="/employer/messages" icon={<Mail />} label="MAIL" active={isActive('/employer/messages', location.pathname)} mobile />
                <NavItem to="/employer/profile" icon={<UserRound />} label="ME" active={isActive('/employer/profile', location.pathname)} mobile />
            </nav>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
                <header className="border-b-[2px] border-black flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-md sticky top-0 z-20 flex-shrink-0" style={{ height: '52px' }}>
                    <div className="flex items-center gap-3">
                        <div onClick={() => navigate('/employer/profile')} className="md:hidden w-8 h-8 rounded-lg border-2 border-black overflow-hidden cursor-pointer">
                            {picture ? <img src={picture} alt={userName} className="w-full h-full object-cover" /> : <Avatar name={userName} size="sm" />}
                        </div>
                        <div className="hidden sm:flex items-center text-[8px] font-black uppercase tracking-widest text-black/40">
                            <span className="hover:text-black cursor-pointer transition-colors" onClick={() => navigate('/employer')}>RECRUITER HUB</span>
                            {breadcrumbs.map((c, i) => (
                                <React.Fragment key={c}>
                                    <ChevronRight size={9} className="mx-1.5 opacity-30" />
                                    <span className={i === breadcrumbs.length - 1 ? 'text-black font-black' : ''}>{c.replace(/-/g, ' ')}</span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 mx-3 md:mx-5 max-w-sm">
                        <div className="relative group">
                            <Search size={12} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                            <input type="text" placeholder="TALENT SEARCH..."
                                className="w-full bg-nile-white border-[2px] border-black rounded-lg py-1.5 pl-8 pr-3 font-black text-[8px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#6CBB56] transition-all" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate('/employer/settings')} className="hidden sm:block p-2 text-black/40 hover:text-black transition-colors">
                            <Settings size={16} />
                        </button>
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
                        <div className="hidden md:flex items-center gap-2 cursor-pointer group ml-1" onClick={() => navigate('/employer/profile')}>
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase leading-none">{userName}</p>
                                <p className="text-[6px] font-bold text-black/40 uppercase mt-0.5 tracking-wider truncate max-w-[80px]">{companyName}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
                                {picture ? <img src={picture} alt={userName} className="w-full h-full object-cover" /> : <Avatar name={userName} size="sm" />}
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

export default EmployerLayout;
