import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, CheckCircle2, Loader2, ClipboardList,
    MessageSquare, GraduationCap, ChevronDown,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getEmployerApplications, updateApplicationStatus, EmployerApplication,
} from '../../services/employerService';

type Filter = 'all' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

const statusConfig: Record<string, { color: string }> = {
    applied:   { color: 'bg-nile-blue/10 text-nile-blue border-nile-blue/20' },
    screening: { color: 'bg-purple-50 text-purple-600 border-purple-200' },
    interview: { color: 'bg-orange-50 text-orange-500 border-orange-200' },
    offer:     { color: 'bg-nile-green/20 text-nile-green border-nile-green/30' },
    rejected:  { color: 'bg-red-50 text-red-500 border-red-200' },
};

const FILTERS: Filter[] = ['all', 'applied', 'screening', 'interview', 'offer', 'rejected'];

const EmployerApplications = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [applications, setApplications] = useState<EmployerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try { setApplications(await getEmployerApplications()); }
        catch { showToast('Failed to load applications.', 'error'); }
        finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = async (app: EmployerApplication, newStatus: string) => {
        setActionLoading(p => ({ ...p, [app.id]: true }));
        try {
            await updateApplicationStatus(app.id, newStatus);
            setApplications(p => p.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
            showToast(`${app.student_name} moved to ${newStatus}.`, 'success');
        } catch {
            showToast('Update failed.', 'error');
        } finally {
            setActionLoading(p => ({ ...p, [app.id]: false }));
        }
    };

    const filtered = useMemo(() => applications
        .filter(a => filter === 'all' || a.status === filter)
        .filter(a => !search ||
            (a.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.major || '').toLowerCase().includes(search.toLowerCase())
        ),
        [applications, filter, search]
    );

    const countFor = (f: Filter) => f === 'all' ? applications.length : applications.filter(a => a.status === f).length;

    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-12 bg-black/5 rounded-2xl w-64" />
            <div className="flex gap-2">{FILTERS.map(f => <div key={f} className="h-9 bg-black/5 rounded-xl w-24" />)}</div>
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-black/5 rounded-[20px]" />)}
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">
            <div className="border-b-[2px] border-black pb-6">
                <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Applications .</h2>
                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                    {applications.length} TOTAL · {applications.filter(a => a.status === 'applied').length} NEW · MANAGE YOUR PIPELINE
                </p>
            </div>

            <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm overflow-x-auto">
                {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0
                            ${filter === f ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}>
                        {f.toUpperCase()}
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black ${filter === f ? 'bg-white/20 text-white' : 'bg-black/5 text-black/40'}`}>
                            {countFor(f)}
                        </span>
                    </button>
                ))}
            </div>

            <div className="relative">
                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="SEARCH BY NAME, JOB OR MAJOR..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white/60 focus:bg-white transition-all" />
            </div>

            {filtered.length === 0 ? (
                <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
                    <ClipboardList size={28} className="text-black/15 mx-auto mb-4" />
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">
                        {search ? 'No matches' : filter === 'all' ? 'No applications yet — post jobs to attract talent' : `No ${filter} applications`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(app => (
                        <div key={app.id} className="bg-white border-[2px] border-black rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <div className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                                {(app.student_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <p className="font-black text-sm uppercase text-black truncate">{app.student_name}</p>
                                    {app.is_verified && (
                                        <span className="flex items-center gap-1 text-[7px] font-black text-nile-green bg-nile-green/10 px-2 py-0.5 rounded-full border border-nile-green/20">
                                            <CheckCircle2 size={8} strokeWidth={3} /> VERIFIED
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] font-black text-nile-blue uppercase truncate">{app.job_title}</p>
                                <div className="flex flex-wrap gap-3 mt-1">
                                    {app.major && (
                                        <span className="flex items-center gap-1 text-[7px] font-black text-black/40 uppercase">
                                            <GraduationCap size={9} />{app.major}
                                        </span>
                                    )}
                                    {app.graduation_year > 0 && (
                                        <span className="text-[7px] font-black text-black/30 uppercase">CLASS OF {app.graduation_year}</span>
                                    )}
                                    {app.applied_at && (
                                        <span className="text-[7px] font-black text-black/20 uppercase">
                                            {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                                <button onClick={() => navigate('/employer/messages')}
                                    className="p-2 border-[2px] border-black/10 rounded-xl text-black/40 hover:border-black hover:text-nile-blue transition-all">
                                    <MessageSquare size={14} />
                                </button>
                                <StatusSelect current={app.status} loading={!!actionLoading[app.id]} onChange={s => handleStatusChange(app, s)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StatusSelect = ({ current, loading, onChange }: {
    current: string; loading: boolean; onChange: (s: string) => void;
}) => {
    const cfg = statusConfig[current] || { color: 'bg-black/5 text-black/40 border-black/10' };
    return loading ? (
        <div className={`flex items-center gap-2 px-3 py-2 border-[2px] rounded-xl font-black text-[8px] uppercase ${cfg.color}`}>
            <Loader2 size={11} className="animate-spin" /> ...
        </div>
    ) : (
        <div className="relative">
            <select value={current} onChange={e => onChange(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 border-[2px] rounded-xl font-black text-[8px] uppercase tracking-wider cursor-pointer outline-none ${cfg.color} border-current`}>
                {['applied', 'screening', 'interview', 'offer', 'rejected'].map(o => (
                    <option key={o} value={o}>{o.toUpperCase()}</option>
                ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
    );
};

export default EmployerApplications;
