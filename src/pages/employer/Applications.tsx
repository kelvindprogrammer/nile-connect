import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, CheckCircle2, Loader2, ClipboardList,
    MessageSquare, GraduationCap, ChevronDown, Star, ArrowUpDown,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getEmployerApplications, updateApplicationStage, EmployerApplication,
} from '../../services/employerService';
import { APPLICATION_STAGES } from '../../types/application';

type Filter = 'all' | string;
type SortOption = '' | 'gpa' | 'graduation_year' | 'name';

const stageColor: Record<string, string> = {
    submitted:            'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    under_review:         'bg-purple-50 text-purple-600 border-purple-200',
    shortlisted:          'bg-orange-50 text-orange-500 border-orange-200',
    interview_scheduled:  'bg-orange-50 text-orange-500 border-orange-200',
    assessment_sent:      'bg-yellow-50 text-yellow-600 border-yellow-200',
    offer_extended:       'bg-nile-green/20 text-nile-green border-nile-green/30',
    accepted:             'bg-nile-green/20 text-nile-green border-nile-green/30',
    rejected:             'bg-red-50 text-red-500 border-red-200',
    withdrawn:            'bg-black/5 text-black/40 border-black/10',
};

const stageLabel = (s: string) => APPLICATION_STAGES.find(x => x.value === s)?.label ?? s;

const EmployerApplications = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [applications, setApplications] = useState<EmployerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortOption>('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filter !== 'all') params.stage = filter;
            if (search) params.q = search;
            if (sort) params.sort = sort;
            setApplications(await getEmployerApplications(params));
        }
        catch { showToast('Failed to load applications.', 'error'); }
        finally { setLoading(false); }
    }, [showToast, filter, search, sort]);

    useEffect(() => {
        const t = setTimeout(load, 300); // debounce search/filter changes
        return () => clearTimeout(t);
    }, [load]);

    const handleStageChange = async (app: EmployerApplication, newStage: string) => {
        setActionLoading(p => ({ ...p, [app.id]: true }));
        try {
            await updateApplicationStage(app.id, { stage: newStage });
            setApplications(p => p.map(a => a.id === app.id ? { ...a, stage: newStage } : a));
            showToast(`${app.student_name} moved to ${stageLabel(newStage)}.`, 'success');
        } catch {
            showToast('Update failed.', 'error');
        } finally {
            setActionLoading(p => ({ ...p, [app.id]: false }));
        }
    };

    const countFor = (f: Filter) => f === 'all' ? applications.length : applications.filter(a => a.stage === f).length;

    if (loading && applications.length === 0) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-12 bg-black/5 rounded-2xl w-64" />
            <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-9 bg-black/5 rounded-xl w-24" />)}</div>
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-black/5 rounded-[20px]" />)}
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">
            <div className="border-b border-gray-100 pb-6">
                <h2 className="text-3xl md:text-5xl font-semibold text-black leading-none">Applications .</h2>
                <p className="text-[9px] font-semibold text-black/40 mt-1">
                    {applications.length} TOTAL · {applications.filter(a => a.stage === 'submitted').length} NEW · MANAGE YOUR PIPELINE
                </p>
            </div>

            <div className="flex bg-white p-1 border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
                <button onClick={() => setFilter('all')}
                    className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-semibold text-[8px] transition-all whitespace-nowrap flex-shrink-0
                        ${filter === 'all' ? 'bg-black text-white shadow-green' : 'text-black/40 hover:text-black'}`}>
                    ALL
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-semibold ${filter === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 text-black/40'}`}>
                        {countFor('all')}
                    </span>
                </button>
                {APPLICATION_STAGES.map(s => (
                    <button key={s.value} onClick={() => setFilter(s.value)}
                        className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-semibold text-[8px] transition-all whitespace-nowrap flex-shrink-0
                            ${filter === s.value ? 'bg-black text-white shadow-green' : 'text-black/40 hover:text-black'}`}>
                        {s.label.toUpperCase()}
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-semibold ${filter === s.value ? 'bg-white/20 text-white' : 'bg-black/5 text-black/40'}`}>
                            {countFor(s.value)}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="SEARCH BY NAME OR MAJOR..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 font-semibold text-[9px] outline-none focus:shadow-card bg-nile-white/60 focus:bg-white transition-all" />
                </div>
                <div className="relative">
                    <ArrowUpDown size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                    <select
                        value={sort}
                        onChange={e => setSort(e.target.value as SortOption)}
                        className="appearance-none pl-10 pr-8 py-3 rounded-xl border border-gray-100 font-semibold text-[9px] outline-none focus:shadow-card bg-nile-white/60 focus:bg-white transition-all cursor-pointer"
                    >
                        <option value="">SORT: DEFAULT</option>
                        <option value="gpa">GPA (HIGH TO LOW)</option>
                        <option value="graduation_year">GRADUATION YEAR</option>
                        <option value="name">NAME (A-Z)</option>
                    </select>
                </div>
            </div>

            {applications.length === 0 ? (
                <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
                    <ClipboardList size={28} className="text-black/15 mx-auto mb-4" />
                    <p className="text-[9px] font-semibold text-black/30">
                        {search ? 'No matches' : filter === 'all' ? 'No applications yet — post jobs to attract talent' : `No ${stageLabel(filter).toLowerCase()} applications`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {applications.map(app => (
                        <div key={app.id} className="bg-white border border-gray-100 rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-card transition-all">
                            <button onClick={() => navigate(`/employer/candidates/${app.id}`)} className="w-10 h-10 bg-nile-blue text-white rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                {(app.student_name || '?').charAt(0).toUpperCase()}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <button onClick={() => navigate(`/employer/candidates/${app.id}`)} className="font-semibold text-sm text-black truncate hover:underline">{app.student_name}</button>
                                    {app.is_verified && (
                                        <span className="flex items-center gap-1 text-[7px] font-semibold text-nile-green bg-nile-green/10 px-2 py-0.5 rounded-full border border-nile-green/20">
                                            <CheckCircle2 size={8} strokeWidth={3} /> VERIFIED
                                        </span>
                                    )}
                                    {app.rating > 0 && (
                                        <span className="flex items-center gap-0.5 text-[7px] font-semibold text-yellow-600">
                                            <Star size={9} fill="currentColor" /> {app.rating}/5
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] font-semibold text-nile-blue truncate">{app.job_title}</p>
                                <div className="flex flex-wrap gap-3 mt-1">
                                    {app.major && (
                                        <span className="flex items-center gap-1 text-[7px] font-semibold text-black/40">
                                            <GraduationCap size={9} />{app.major}
                                        </span>
                                    )}
                                    {app.graduation_year > 0 && (
                                        <span className="text-[7px] font-semibold text-black/30">CLASS OF {app.graduation_year}</span>
                                    )}
                                    {app.gpa > 0 && (
                                        <span className="text-[7px] font-semibold text-black/30">GPA {app.gpa.toFixed(2)}</span>
                                    )}
                                    {app.applied_at && (
                                        <span className="text-[7px] font-semibold text-black/20">
                                            {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                                <button onClick={() => navigate('/employer/messages')}
                                    className="p-2 border border-gray-100/10 rounded-xl text-black/40 hover:border-black hover:text-nile-blue transition-all">
                                    <MessageSquare size={14} />
                                </button>
                                <StageSelect current={app.stage} loading={!!actionLoading[app.id]} onChange={s => handleStageChange(app, s)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StageSelect = ({ current, loading, onChange }: {
    current: string; loading: boolean; onChange: (s: string) => void;
}) => {
    const cfg = stageColor[current] || 'bg-black/5 text-black/40 border-black/10';
    return loading ? (
        <div className={`flex items-center gap-2 px-3 py-2 border-[2px] rounded-xl font-semibold text-[8px] ${cfg}`}>
            <Loader2 size={11} className="animate-spin" /> ...
        </div>
    ) : (
        <div className="relative">
            <select value={current} onChange={e => onChange(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 border-[2px] rounded-xl font-semibold text-[8px] tracking-wider cursor-pointer outline-none ${cfg} border-current`}>
                {APPLICATION_STAGES.map(o => (
                    <option key={o.value} value={o.value}>{o.label.toUpperCase()}</option>
                ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
    );
};

export default EmployerApplications;
