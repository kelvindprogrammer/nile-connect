import React, { useState, useEffect } from 'react';
import StaffLayout from '../../layouts/StaffLayout';
import { 
    Users, Briefcase, Activity, Search, Filter, 
    ChevronRight, ExternalLink, Calendar, MessageSquare,
    Eye, CheckCircle2, Clock
} from 'lucide-react';
import { Button } from '../../components/Button';
import InputField from '../../components/InputField';
import Badge from '../../components/ui/badge';

interface ActivityLog {
    id: string;
    studentName: string;
    companyName: string;
    action: 'applied' | 'interview_scheduled' | 'offer_sent' | 'rejected' | 'message_sent';
    timestamp: string;
    details: string;
    status: 'pending' | 'completed' | 'urgent';
}

const StudentActivity = () => {
    const [search, setSearch] = useState('');
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Mock data for student-employer interactions
        const mockActivities: ActivityLog[] = [
            { id: '1', studentName: 'Kelvin James', companyName: 'Google Nigeria', action: 'applied', timestamp: '2 hours ago', details: 'Applied for Software Engineer Intern', status: 'pending' },
            { id: '2', studentName: 'Sarah Chen', companyName: 'Shell Nigeria', action: 'interview_scheduled', timestamp: '5 hours ago', details: 'Interview set for May 15, 10:00 AM', status: 'urgent' },
            { id: '3', studentName: 'Musa Ibrahim', companyName: 'Access Bank', action: 'message_sent', timestamp: 'Yesterday', details: 'Recruiter asked for updated transcript', status: 'completed' },
            { id: '4', studentName: 'David Okoro', companyName: 'MTN Nigeria', action: 'offer_sent', timestamp: '2 days ago', details: 'Full-time offer extended', status: 'completed' },
            { id: '5', studentName: 'Linda Yusuf', companyName: 'Andela', action: 'rejected', timestamp: '3 days ago', details: 'Not a fit for current role', status: 'completed' },
        ];
        
        setTimeout(() => {
            setActivities(mockActivities);
            setIsLoading(false);
        }, 800);
    }, []);

    const getActionIcon = (action: ActivityLog['action']) => {
        switch(action) {
            case 'applied': return <Briefcase size={14} className="text-blue-500" />;
            case 'interview_scheduled': return <Calendar size={14} className="text-orange-500" />;
            case 'offer_sent': return <CheckCircle2 size={14} className="text-nile-green" />;
            case 'message_sent': return <MessageSquare size={14} className="text-purple-500" />;
            case 'rejected': return <Clock size={14} className="text-red-500" />;
            default: return <Activity size={14} />;
        }
    };

    return (
        <StaffLayout>
            <div className="p-4 md:p-8 space-y-8 anime-fade-in text-left">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-[2px] border-black pb-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter">Activity Monitor .</h2>
                        <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">OVERSIGHT OF STUDENT-EMPLOYER INTERACTIONS</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Download size={14} className="mr-2" /> EXPORT REPORT
                        </Button>
                    </div>
                </header>

                {/* Insights Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InsightCard label="TOTAL INTERACTIONS" value="1,284" change="+12%" icon={<Activity />} />
                    <InsightCard label="ACTIVE INTERVIEWS" value="42" change="+5%" icon={<Calendar />} />
                    <InsightCard label="SUCCESSFUL HIRES" value="18" change="+8%" icon={<CheckCircle2 />} />
                </div>

                <div className="bg-white border-[2px] border-black rounded-[28px] overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div className="p-6 bg-nile-white border-b-[2px] border-black flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                            <input 
                                type="text"
                                placeholder="Search by student or company..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border-[2px] border-black rounded-xl text-xs font-bold outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] transition-all"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button variant="outline" size="sm" className="flex-1 md:flex-none"><Filter size={14} className="mr-2" /> FILTER</Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/5 border-b-[2px] border-black">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Action</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Employer</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Timestamp</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-black/40"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <Activity className="animate-spin mx-auto text-nile-blue/20" size={32} />
                                        </td>
                                    </tr>
                                ) : activities.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-black/30 font-black uppercase text-xs">No recent activity found</td>
                                    </tr>
                                ) : activities.map(activity => (
                                    <tr key={activity.id} className="border-b border-black/5 hover:bg-nile-white transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-xs border border-black shadow-[1px_1px_0px_0px_rgba(255,255,255,0.5)]">
                                                    {activity.studentName[0]}
                                                </div>
                                                <p className="font-black text-xs uppercase text-black">{activity.studentName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-white border border-black/10 shadow-sm">
                                                    {getActionIcon(activity.action)}
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-black/60 tracking-wider">
                                                    {activity.action.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-xs uppercase text-nile-blue">{activity.companyName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[10px] font-bold text-black/40 uppercase">{activity.timestamp}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={activity.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-black hover:text-white rounded-lg transition-all border border-transparent hover:border-black">
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </StaffLayout>
    );
};

const InsightCard = ({ label, value, change, icon }: { label: string, value: string, change: string, icon: React.ReactNode }) => (
    <div className="bg-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
        <div className="space-y-2">
            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">{label}</p>
            <div className="flex items-baseline gap-2">
                <h4 className="text-3xl font-black text-black">{value}</h4>
                <span className="text-[10px] font-black text-nile-green">{change}</span>
            </div>
        </div>
        <div className="w-12 h-12 rounded-[16px] bg-nile-blue/5 border-[2px] border-black flex items-center justify-center text-nile-blue">
            {icon}
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: ActivityLog['status'] }) => {
    const colors = {
        pending: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        completed: 'bg-nile-green/10 text-nile-green border-nile-green/20',
        urgent: 'bg-red-50 text-red-500 border-red-200'
    };
    return (
        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase ${colors[status]}`}>
            {status}
        </span>
    );
};

const Download = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export default StudentActivity;
