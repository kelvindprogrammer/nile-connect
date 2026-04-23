import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    Home, 
    Briefcase, 
    FileText, 
    Calendar, 
    UserRound, 
    LogOut, 
    Settings as SvcsIcon, 
    Bell, 
    Mail,
    ChevronRight,
    Search,
    Shield
} from 'lucide-react';
import Avatar from '../components/Avatar';
import NotificationTray from '../components/NotificationTray';
import { useAuth } from '../context/AuthContext';

const SlimNavItem = ({ to, icon, label, isActive, mobile = false }: { to: string, icon: React.ReactNode, label: string, isActive: boolean, mobile?: boolean }) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(to)}
            className={`
                flex-1 flex flex-col items-center justify-center transition-all group relative cursor-pointer
                ${mobile ? 'py-2' : 'w-full py-3'}
                ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'}
            `}
        >
            {!mobile && isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-black rounded-r-full animate-in slide-in-from-left-1" />
            )}
            <div className={`
                ${mobile ? 'w-8 h-8' : 'w-11 h-11'}
                flex items-center justify-center rounded-xl transition-all duration-300
                ${isActive 
                    ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] border-[2px] border-black' 
                    : 'bg-transparent text-black border-2 border-transparent group-hover:bg-nile-white group-hover:border-black'}
            `}>
                {React.cloneElement(icon as React.ReactElement, { size: mobile ? 16 : 20 })}
            </div>
            <span className={`
                ${mobile ? 'text-[6px]' : 'text-[7px]'}
                font-black tracking-[0.1em] mt-1 transition-colors
                ${isActive ? 'text-black font-black' : 'text-black opacity-40 group-hover:opacity-100'}
            `}>
                {label}
            </span>
        </div>
    );
};

const StaffLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [progress, setProgress] = useState(0);

    const userName = user?.name || 'STAFF';
    const department = user?.department || 'CAREER SERVICES';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        setProgress(30);
        const timer = setTimeout(() => setProgress(100), 400);
        return () => {
            clearTimeout(timer);
            setProgress(0);
        };
    }, [location.pathname]);

    const breadcrumbs = location.pathname.split('/').filter(x => x && x !== 'staff');

    return (
        <div className="flex h-screen bg-nile-white text-black font-sans overflow-hidden">
            <div 
                className="fixed top-0 left-0 h-0.5 bg-black transition-all duration-500 z-[100]" 
                style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
            />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-[84px] bg-white border-r-[2px] border-black flex flex-col items-center py-6 z-30 flex-shrink-0">
                <div 
                    onClick={() => navigate('/staff')}
                    className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-sm shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] border-[2px] border-black mb-10 flex-shrink-0 cursor-pointer hover:-rotate-6 transition-transform"
                >
                    <Shield size={20} />
                </div>
                
                <nav className="flex-1 flex flex-col items-center space-y-1 w-full custom-scrollbar overflow-y-auto px-1">
                    <SlimNavItem to="/staff" icon={<Home />} label="ADMIN" isActive={location.pathname === '/staff'} />
                    <SlimNavItem to="/staff/jobs" icon={<Briefcase />} label="JOBS" isActive={location.pathname.startsWith('/staff/jobs')} />
                    <SlimNavItem to="/staff/services" icon={<SvcsIcon />} label="SVCS" isActive={location.pathname.startsWith('/staff/services')} />
                    <SlimNavItem to="/staff/applications" icon={<FileText />} label="APPS" isActive={location.pathname.startsWith('/staff/applications')} />
                    <SlimNavItem to="/staff/events" icon={<Calendar />} label="LIVE" isActive={location.pathname.startsWith('/staff/events')} />
                    <SlimNavItem to="/staff/profile" icon={<UserRound />} label="USER" isActive={location.pathname.startsWith('/staff/profile')} />
                </nav>

                <div className="mt-auto pt-4 border-t-2 border-black/5 w-full flex flex-col items-center space-y-4">
                    <button onClick={handleLogout} className="opacity-40 hover:opacity-100 transition-all text-red-500 p-2"><LogOut size={18} /></button>
                    <div className="w-9 h-9 rounded-full border-[2px] border-black/10 overflow-hidden cursor-pointer" onClick={() => navigate('/staff/profile')}><Avatar name={userName} size="sm" /></div>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-[2px] border-black h-16 px-4 flex items-center justify-around z-[40]">
                <SlimNavItem to="/staff" icon={<Home />} label="ADMIN" isActive={location.pathname === '/staff'} mobile />
                <SlimNavItem to="/staff/applications" icon={<FileText />} label="APPS" isActive={location.pathname.startsWith('/staff/applications')} mobile />
                <div onClick={() => navigate('/staff/services')} className="flex-1 flex flex-col items-center justify-center -mt-8">
                     <div className="w-12 h-12 bg-black border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#6CBB56] transition-transform cursor-pointer">
                        <Shield className="text-white" size={20} />
                     </div>
                </div>
                <SlimNavItem to="/staff/jobs" icon={<Briefcase />} label="JOBS" isActive={location.pathname.startsWith('/staff/jobs')} mobile />
                <SlimNavItem to="/staff/profile" icon={<UserRound />} label="ME" isActive={location.pathname.startsWith('/staff/profile')} mobile />
            </nav>

            <main className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
                <header className="h-14 border-b-[2px] border-black flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
                    <div className="flex items-center space-x-3 md:space-x-4">
                        <div onClick={() => navigate('/staff/profile')} className="md:hidden w-8 h-8 rounded-lg border-2 border-black overflow-hidden cursor-pointer"><Avatar name={userName} size="sm" /></div>
                        <div className="hidden sm:flex items-center text-[9px] font-black uppercase tracking-[0.15em] text-black/40 whitespace-nowrap">
                            <span className="hover:text-black cursor-pointer transition-colors" onClick={() => navigate('/staff')}>STAFF HUB</span>
                            {breadcrumbs.length > 0 && breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={crumb}>
                                    <ChevronRight size={10} className="mx-2 opacity-30" />
                                    <span className={i === breadcrumbs.length - 1 ? 'text-black font-black' : 'hover:text-black transition-colors'}>
                                        {crumb.replace('-', ' ')}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 mx-3 md:mx-6 max-w-lg">
                        <div className="relative group">
                            <Search size={14} strokeWidth={3} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                            <input 
                                type="text" 
                                placeholder="QUICK SEARCH..." 
                                className="w-full bg-nile-white border-[2px] border-black rounded-lg py-1.5 pl-10 pr-3 font-black text-[9px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#000000] transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 md:space-x-4">
                         <button onClick={() => navigate('/staff/messages')} className={`${location.pathname.startsWith('/staff/messages') ? 'text-black' : 'text-black/40 hover:text-black'} hidden sm:block p-2 transition-colors`}><Mail size={18} /></button>
                         <button onClick={() => navigate('/staff/settings')} className={`${location.pathname.startsWith('/staff/settings') ? 'text-black' : 'text-black/40 hover:text-black'} hidden sm:block p-2 transition-colors`}><SvcsIcon size={18} /></button>
                         <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 transition-all relative ${showNotifications ? 'text-black' : 'text-black/40 hover:text-black'}`}><Bell size={18} /></button>
                         {showNotifications && (
                            <div className="absolute top-full right-4 md:right-8 mt-2 z-50 animate-in fade-in slide-in-from-top-1 scale-95 origin-top-right">
                                <NotificationTray onClose={() => setShowNotifications(false)} />
                            </div>
                        )}
                        <div className="hidden md:flex items-center space-x-2.5 cursor-pointer group" onClick={() => navigate('/staff/profile')}>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase leading-none">{userName}</p>
                                <p className="text-[7px] font-bold text-black/40 uppercase mt-0.5 tracking-wider truncate max-w-[80px]">{department}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all overflow-hidden"><Avatar name={userName} size="sm" /></div>
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
