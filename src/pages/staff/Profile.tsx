import React from 'react';
import { Settings, Download, Mail, Phone, MapPin, Shield, LogOut } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';

const StaffProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const name = user?.name || 'STAFF MEMBER';
    const email = user?.email || 'staff@nileuni.edu.ng';
    const department = user?.department || 'CAREER SERVICES';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-10 anime-fade-in font-sans pb-24 md:pb-20 text-left max-w-4xl mx-auto">

            {/* Profile Header Banner */}
            <div className="bg-white border-[2px] border-black rounded-[24px] md:rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Cover */}
                <div className="h-24 md:h-36 bg-black border-b-[2px] border-black relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white border-[2px] border-black rounded-lg hidden md:flex items-center justify-center shadow-sm hover:bg-nile-green transition-colors">
                        <Settings size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                    {/* Avatar */}
                    <div className="absolute -top-8 md:-top-10 left-4 md:left-8 w-16 h-16 md:w-20 md:h-20 rounded-[12px] md:rounded-[16px] border-[2px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <Avatar name={name} size="lg" />
                    </div>

                    <div className="pt-10 md:pt-14 flex justify-between items-end flex-wrap gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2 mb-1">
                                <h1 className="text-xl md:text-3xl font-black text-black uppercase leading-none tracking-tighter truncate max-w-[200px] md:max-w-none">{name} .</h1>
                                <span className="bg-black text-white px-2 py-0.5 rounded text-[6px] md:text-[7px] font-black border border-black">STAFF</span>
                            </div>
                            <p className="text-[8px] md:text-[9px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">{department}</p>
                            <div className="flex items-center space-x-2 text-[7px] md:text-[8px] font-black text-black/30 uppercase pt-1 truncate max-w-[250px]">
                                <Mail size={10} strokeWidth={3} />
                                <span>{email}</span>
                            </div>
                        </div>
                        <div className="flex space-x-2 w-full md:w-auto mt-4 md:mt-0">
                            <Button variant="outline" size="sm" fullWidth className="md:w-auto">
                                <Settings size={14} className="md:mr-2" /> <span className="hidden md:inline">EDIT PROFILE</span><span className="md:hidden">EDIT</span>
                            </Button>
                            <Button variant="primary" size="sm" fullWidth className="md:w-auto bg-red-500 hover:bg-red-600 md:hidden" onClick={handleLogout}>
                                <LogOut size={14} className="mr-1" /> LOGOUT
                            </Button>
                        </div>
                    </div>

                    {/* Staff Stats */}
                    <div className="flex justify-between md:justify-start md:space-x-10 mt-6 pt-5 border-t-[2px] border-black/5 overflow-x-auto no-scrollbar">
                        <Stat value="42" label="PENDING" />
                        <Stat value="156" label="COMPANIES" />
                        <Stat value="78%" label="PLACEMENT" highlight />
                        <Stat value="4.2k" label="USERS" />
                    </div>
                </div>
            </div>

            {/* Logout Mobile Only explicitly */}
            <div className="hidden md:block">
                <Button variant="outline" size="sm" className="text-red-500 border-red-500/20" onClick={handleLogout}>
                    <LogOut size={16} className="mr-2" /> LOG OUT OF CONSOLE
                </Button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Card */}
                <div className="bg-white border-[2px] border-black rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-sm space-y-4">
                    <h3 className="text-[9px] md:text-[10px] font-black text-black uppercase tracking-widest pb-3 border-b-[2px] border-black/5 text-left">CONTACT INFO</h3>
                    <InfoRow icon={<Mail size={14} />} label="EMAIL" value={email} />
                    <InfoRow icon={<Phone size={14} />} label="OFFICE PHONE" value="+234 (0) 9 123 4567" />
                    <InfoRow icon={<MapPin size={14} />} label="OFFICE" value="Rm 402" />
                    <InfoRow icon={<Shield size={14} />} label="ACCESS" value="ADMIN • VERIFIED" />
                </div>

                {/* Reports Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="text-left">
                        <h2 className="text-xs md:text-sm font-black text-black uppercase tracking-widest mb-1">GENERATE REPORTS</h2>
                        <p className="text-[8px] md:text-[9px] font-black text-nile-blue/40 uppercase tracking-[0.15em]">ADMIN ANALYTICS FOR PLATFORM</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ReportCard
                            title="WEEKLY REVIEW"
                            desc="PAST 7 DAYS ACTIVITY SUMMARY."
                            dark={false}
                        />
                        <ReportCard
                            title="MONTHLY REVIEW"
                            desc="PLACEMENT RATES & TRENDS."
                            dark
                        />
                    </div>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="space-y-4 text-left">
                <h2 className="text-[11px] md:text-sm font-black text-black uppercase tracking-widest">RECENT DOWNLOADS</h2>
                {[
                    { title: 'SEPTEMBER 2026 REVIEW', date: 'OCT 1, 2026' },
                    { title: 'WEEK 39 SUMMARY', date: 'SEP 28, 2026' },
                ].map((r, i) => (
                    <div key={i} className="flex justify-between items-center p-4 md:p-5 bg-white border-[2px] border-dashed border-black rounded-[16px] md:rounded-[20px] hover:bg-nile-white/60 hover:border-solid transition-all cursor-pointer group">
                        <div className="min-w-0">
                            <h4 className="text-[10px] md:text-xs font-black text-black uppercase tracking-widest truncate">{r.title}</h4>
                            <p className="text-[7px] md:text-[8px] font-black text-nile-blue/40 uppercase tracking-widest mt-1 uppercase">GENERATED: {r.date}</p>
                        </div>
                        <button className="w-8 h-8 md:w-9 md:h-9 bg-white border-[2px] border-black rounded-lg md:rounded-xl flex items-center justify-center group-hover:bg-nile-green transition-colors shadow-sm flex-shrink-0">
                            <Download size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Stat = ({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) => (
    <div className="text-left pr-6 md:pr-0">
        <p className={`text-lg md:text-xl font-black leading-none ${highlight ? 'text-nile-green' : 'text-black'}`}>{value}</p>
        <p className="text-[6px] md:text-[7px] font-black text-nile-blue/40 uppercase tracking-[0.15em] mt-1 whitespace-nowrap">{label}</p>
    </div>
);

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start space-x-3 text-left">
        <div className="w-8 h-8 bg-nile-white border-[2px] border-black rounded-lg flex items-center justify-center flex-shrink-0 text-nile-blue">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[6px] md:text-[7px] font-black text-black/30 uppercase tracking-[0.2em] leading-none mb-1">{label}</p>
            <p className="text-[8px] md:text-[9px] font-black text-black uppercase tracking-wider truncate">{value}</p>
        </div>
    </div>
);

const ReportCard = ({ title, desc, dark }: { title: string; desc: string; dark: boolean }) => (
    <div className={`border-[2px] border-black rounded-[16px] md:rounded-[20px] p-5 md:p-6 flex flex-col shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-left ${dark ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-2">{title}</h3>
        <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest leading-relaxed flex-1 ${dark ? 'text-white/40' : 'text-nile-blue/40'}`}>{desc}</p>
        <button className={`mt-5 md:mt-6 w-full py-2.5 md:py-3 font-black text-[8px] md:text-[9px] uppercase tracking-widest rounded-xl border-[2px] flex items-center justify-center space-x-2 transition-all ${dark ? 'bg-white text-black border-white hover:bg-nile-green' : 'bg-black text-white border-black hover:bg-nile-blue'}`}>
            <Download size={12} strokeWidth={3} />
            <span>GENERATE</span>
        </button>
    </div>
);

export default StaffProfile;
