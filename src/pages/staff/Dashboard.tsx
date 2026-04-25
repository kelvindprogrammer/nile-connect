import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, ShieldCheck, TrendingUp, Users, CheckCircle2, XCircle, Activity, BellRing, Settings, FileSearch } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Feed from '../../components/Feed';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats, DashboardStats } from '../../services/staffService';

const pendingApprovals = [
    { id: 1, name: 'MICHAEL OLADELE', major: 'MECH. ENG', doc: 'Internship CV', time: '20m ago' },
    { id: 2, name: 'SARAH JENKINS', major: 'COMP. SCI', doc: 'Full-time Resume', time: '1h ago' },
    { id: 3, name: 'DAVID KABIR', major: 'BUSINESS', doc: 'Cover Letter', time: '3h ago' },
];

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const staffName = user?.name || 'ADMIN';
    const [approvals, setApprovals] = useState(pendingApprovals);
    const [isLoading, setIsLoading] = useState(true);
    const [dashStats, setDashStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        getDashboardStats()
            .then(setDashStats)
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const handleAction = (id: number, name: string, action: 'approved' | 'rejected') => {
        setApprovals(prev => prev.filter(a => a.id !== id));
        showToast(`Document for ${name} has been ${action}.`, action === 'approved' ? 'success' : 'error');
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-pulse bg-nile-white h-full">
                <div className="h-40 md:h-48 bg-black/5 rounded-[24px] md:rounded-[40px] border-[2px] border-black/5"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 md:h-32 bg-black/5 rounded-2xl"></div>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
                    <div className="md:col-span-8 h-[500px] bg-black/5 rounded-[32px]"></div>
                    <div className="md:col-span-4 h-[500px] bg-black/5 rounded-[32px]"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 anime-fade-in font-sans bg-nile-white min-h-full pb-20 md:pb-8">
            
            {/* 1. Admin Console Hero */}
            <section className="bg-white border-[2px] md:border-[3px] border-black rounded-[24px] md:rounded-[40px] shadow-[4px_4px_0px_0px_#000000] md:shadow-[8px_8px_0px_0px_#000000] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-1/3 h-full bg-black/5 -skew-x-12 translate-x-1/2"></div>
                
                <div className="space-y-4 md:space-y-6 max-w-2xl z-10 text-left w-full md:w-auto">
                    <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-black text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full">SYSTEM COMMAND</span>
                        <span className="flex items-center space-x-1 text-[8px] md:text-[10px] font-black text-nile-blue uppercase tracking-widest truncate max-w-[150px]">
                            <div className="pulse-blue"></div>
                            <span>{staffName}</span>
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-6xl font-black text-black leading-none md:leading-[0.9] uppercase tracking-tighter">
                        Platform <br className="hidden md:block" />
                        <span className="text-nile-blue">Intelligence</span>
                    </h2>
                    <p className="text-sm md:text-lg font-bold text-nile-blue/70 leading-snug uppercase max-w-md">
                        Global platform health is <span className="text-black underline">OPTIMAL</span>. Systems are active with <span className="text-nile-green">zero downtime</span>.
                    </p>
                    <div className="flex space-x-3 pt-1">
                         <Button onClick={() => navigate('/staff/services')} size="sm">Services</Button>
                         <Button variant="outline" size="sm" onClick={() => navigate('/staff/profile')}>Security</Button>
                    </div>
                </div>

                <div className="hidden md:flex w-[340px] h-[240px] bg-white border-[3px] border-black rounded-[32px] p-8 shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] z-10 flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center text-black">
                             <Activity size={24} />
                         </div>
                         <span className="text-[10px] font-black text-black opacity-30 uppercase tracking-widest">SYSTEM PULSE</span>
                     </div>
                     <div className="space-y-1">
                         <h4 className="text-4xl font-black text-black leading-none">99.9%</h4>
                         <p className="text-[10px] font-black text-nile-blue opacity-60 uppercase tracking-widest">UPTIME STATUS</p>
                     </div>
                     <div className="flex items-center space-x-2 text-[10px] font-black text-nile-green uppercase tracking-widest">
                         <CheckCircle2 size={12} strokeWidth={3} />
                         <span>ALL SYSTEMS OPERATIONAL</span>
                     </div>
                </div>
            </section>

            {/* 2. Fast Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {[
                    { label: 'STUDENTS', value: dashStats ? dashStats.total_students.toLocaleString() : '—', color: 'bg-black/5 text-black' },
                    { label: 'EMPLOYERS', value: dashStats ? dashStats.total_employers.toLocaleString() : '—', color: 'bg-nile-green/10 text-nile-green' },
                    { label: 'PENDING', value: dashStats ? dashStats.pending_employers.toLocaleString() : '—', color: 'bg-red-50 text-red-500' },
                    { label: 'ACTIVE JOBS', value: dashStats ? dashStats.active_jobs.toLocaleString() : '—', color: 'bg-nile-green/10 text-nile-green' },
                ].map((s) => (
                    <Card key={s.label} className="p-4 md:p-8 hover:translate-y-[-4px] group transition-all">
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="p-2 md:p-3 rounded-xl border-2 border-black group-hover:bg-black group-hover:text-white transition-colors">
                                <TrendingUp size={18} />
                            </div>
                            <span className={`text-[7px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-black ${s.color}`}>
                                LIVE
                            </span>
                        </div>
                        <h3 className="text-xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter truncate">{s.value}</h3>
                        <p className="text-[8px] md:text-[10px] font-black text-black/40 uppercase mt-2 md:mt-3 tracking-widest">{s.label}</p>
                    </Card>
                ))}
            </div>

            {/* 3. Operational Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
                
                {/* Left: Queue Column */}
                <div className="xl:col-span-8 space-y-8 md:space-y-10">
                     <Card title="OPERATIONAL QUEUE">
                        <div className="flex items-center justify-between mb-6 md:mb-8 pb-3 md:pb-4 border-b-[2px] md:border-b-[3px] border-black/5 text-left">
                            <div className="flex items-center space-x-3 md:space-x-4">
                                <div className="bg-nile-blue text-white p-2 rounded-lg">
                                    <FileSearch size={16} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] md:text-sm font-black uppercase text-black leading-none">Verifications</h4>
                                    <p className="text-[7px] md:text-[9px] font-black text-nile-blue/40 uppercase tracking-widest mt-1">AWAITING STAFF</p>
                                </div>
                            </div>
                            <span className="text-[8px] md:text-[10px] font-black bg-black text-white px-2 md:px-3 py-1 rounded-full uppercase">{approvals.length} PENDING</span>
                        </div>
                        
                        <div className="space-y-3 md:space-y-4">
                            {approvals.map((item) => (
                                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 bg-nile-white/40 border-[2px] md:border-[3px] border-black rounded-[20px] md:rounded-[24px] hover:bg-white transition-all group gap-4">
                                    <div className="flex items-center space-x-4 md:space-x-5">
                                        <div className="flex-shrink-0">
                                            <Avatar name={item.name} size="sm" />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="font-black text-[12px] md:text-sm uppercase text-black leading-none mb-1 truncate">{item.name}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                 <span className="text-[8px] md:text-[9px] font-black text-nile-blue uppercase truncate">{item.major}</span>
                                                 <span className="text-[8px] md:text-[9px] font-black text-nile-green uppercase tracking-widest">{item.doc}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                                        <button 
                                            onClick={() => handleAction(item.id, item.name, 'approved')}
                                            className="flex-1 sm:flex-none p-2 md:p-3 bg-nile-green text-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center"
                                        >
                                            <CheckCircle2 size={18} strokeWidth={3} />
                                        </button>
                                        <button 
                                            onClick={() => handleAction(item.id, item.name, 'rejected')}
                                            className="flex-1 sm:flex-none p-2 md:p-3 bg-white text-red-500 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center"
                                        >
                                            <XCircle size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {approvals.length === 0 && (
                                <div className="py-12 md:py-20 text-center border-2 border-dashed border-black/10 rounded-[24px] md:rounded-[32px]">
                                     <CheckCircle2 size={32} className="text-nile-green/20 mx-auto mb-4" />
                                     <p className="text-[9px] md:text-xs font-black text-black/30 uppercase tracking-[0.2em]">Queue cleared .</p>
                                </div>
                            )}
                        </div>
                     </Card>
                     
                     <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] flex items-center">
                                <Activity size={18} className="mr-2 text-nile-green" /> BROADCAST FEED
                            </h3>
                        </div>
                        <Feed />
                     </div>
                </div>

                {/* Right: Insights Column */}
                <div className="xl:col-span-4 space-y-8 md:space-y-10">
                    <Card title="ANALYTICS">
                         <div className="space-y-6 md:space-y-8">
                            <div className="space-y-4 md:space-y-6">
                                {[
                                    { label: 'STUDENTS', val: 78, color: 'bg-nile-blue' },
                                    { label: 'STAFF', val: 12, color: 'bg-black' },
                                    { label: 'EMPLOYERS', val: 45, color: 'bg-nile-green' },
                                ].map((bar) => (
                                    <div key={bar.label} className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.15em] text-left">
                                            <span>{bar.label}</span>
                                            <span className="text-nile-blue">{bar.val}%</span>
                                        </div>
                                        <div className="h-4 bg-nile-white border-[2px] border-black rounded-full overflow-hidden p-0.5">
                                            <div className={`h-full ${bar.color} rounded-full transition-all duration-1000`} style={{ width: `${bar.val}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card title="CONTROLS">
                        <div className="grid grid-cols-1 gap-3 md:gap-4">
                            <AdminTool icon={<Users size={16} />} label="Users" onAction={() => navigate('/staff/services')} />
                            <AdminTool icon={<BellRing size={16} />} label="Broadcast" onAction={() => showToast('Broadcast open.', 'success')} />
                        </div>
                        <Button fullWidth variant="outline" size="sm" className="mt-6 md:mt-8 text-red-500 border-red-500/20" onClick={() => navigate('/login')}>
                            LOGOUT
                        </Button>
                    </Card>
                </div>
            </div>

        </div>
    );
};

const AdminTool = ({ icon, label, onAction }: { icon: React.ReactNode, label: string, onAction: () => void }) => (
    <button 
        onClick={onAction}
        className="w-full flex items-center space-x-3 md:space-x-4 p-4 md:p-5 bg-white border-[2px] md:border-[3px] border-black rounded-xl md:rounded-2xl hover:translate-x-1 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(30,73,157,1)] md:shadow-[4px_4px_0px_0px_rgba(30,73,157,1)] hover:shadow-none text-left"
    >
        <div className="flex-shrink-0">{icon}</div>
        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest truncate">{label}</span>
    </button>
);

export default StaffDashboard;
