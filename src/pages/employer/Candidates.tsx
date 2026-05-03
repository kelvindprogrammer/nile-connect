import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Users, GraduationCap, CheckCircle2,
    MessageSquare, ArrowUpRight, Briefcase,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getEmployerApplications, EmployerApplication } from '../../services/employerService';

type FilterStatus = 'all' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

const statusBadge: Record<string, string> = {
    applied:   'bg-nile-blue/10 text-nile-blue border-nile-blue/20',
    screening: 'bg-purple-50 text-purple-600 border-purple-200',
    interview: 'bg-orange-50 text-orange-500 border-orange-200',
    offer:     'bg-nile-green/20 text-nile-green border-nile-green/30',
    rejected:  'bg-red-50 text-red-500 border-red-200',
};

const EmployerCandidates = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [applications, setApplications] = useState<EmployerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try { setApplications(await getEmployerApplications()); }
        catch { showToast('Failed to load candidates.', 'error'); }
        finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    // Deduplicate by student_id — one card per student (show their best/latest status)
    const candidates = useMemo(() => {
        const map = new Map<string, EmployerApplication & { jobs: string[] }>();
        for (const app of applications) {
            const existing = map.get(app.student_id);
            if (existing) {
                existing.jobs.push(app.job_title);
                // prefer higher-stage status
                const rank = ['rejected', 'applied', 'screening', 'interview', 'offer'];
                if (rank.indexOf(app.status) > rank.indexOf(existing.status)) {
                    existing.status = app.status;
                }
            } else {
                map.set(app.student_id, { ...app, jobs: [app.job_title] });
            }
        }
        return Array.from(map.values());
    }, [applications]);

    const filtered = useMemo(() => candidates
        .filter(c => filterStatus === 'all' || c.status === filterStatus)
        .filter(c => !search ||
            (c.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.major || '').toLowerCase().includes(search.toLowerCase()) ||
            c.jobs.some(j => j.toLowerCase().includes(search.toLowerCase()))
        ),
        [candidates, filterStatus, search]
    );

    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-12 bg-black/5 rounded-2xl w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-black/5 rounded-[24px]" />)}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="border-b-[2px] border-black pb-6">
                <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Talent Pool .</h2>
                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">
                    {candidates.length} UNIQUE CANDIDATES · ALL APPLIED TO YOUR LISTINGS
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="SEARCH BY NAME, MAJOR OR ROLE..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white/60 focus:bg-white transition-all" />
                </div>
                <div className="flex bg-white p-1 border-[2px] border-black rounded-xl gap-0.5 overflow-x-auto">
                    {(['all', 'applied', 'screening', 'interview', 'offer', 'rejected'] as FilterStatus[]).map(f => (
                        <button key={f} onClick={() => setFilterStatus(f)}
                            className={`px-2.5 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-wider transition-all whitespace-nowrap
                                ${filterStatus === f ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Candidates grid */}
            {filtered.length === 0 ? (
                <div className="py-24 text-center border-[2px] border-dashed border-black/10 rounded-[32px]">
                    <Users size={32} className="text-black/15 mx-auto mb-4" />
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">
                        {search ? 'No candidates match your search' : applications.length === 0 ? 'No candidates yet — post jobs to attract talent' : `No ${filterStatus} candidates`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(c => (
                        <CandidateCard key={c.student_id} candidate={c} onMessage={() => navigate('/messages')} />
                    ))}
                </div>
            )}
        </div>
    );
};

const CandidateCard = ({ candidate, onMessage }: {
    candidate: EmployerApplication & { jobs: string[] };
    onMessage: () => void;
}) => {
    const badge = statusBadge[candidate.status] || 'bg-black/5 text-black/40 border-black/10';
    const initials = (candidate.student_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="bg-white border-[2px] border-black rounded-[24px] p-5 flex flex-col gap-4 hover:translate-y-[-2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(30,73,157,0.4)] transition-all">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-nile-blue text-white rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className="font-black text-sm uppercase text-black truncate leading-none">{candidate.student_name}</p>
                            {candidate.is_verified && <CheckCircle2 size={11} className="text-nile-green flex-shrink-0" strokeWidth={3} />}
                        </div>
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${badge}`}>
                            {candidate.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-[8px] font-black text-black/50 uppercase">
                {candidate.major && (
                    <div className="flex items-center gap-2">
                        <GraduationCap size={11} className="text-nile-blue flex-shrink-0" />
                        <span className="truncate">{candidate.major}</span>
                        {candidate.graduation_year > 0 && <span className="text-black/30">· {candidate.graduation_year}</span>}
                    </div>
                )}
                <div className="flex items-start gap-2">
                    <Briefcase size={11} className="text-nile-green flex-shrink-0 mt-0.5" />
                    <span className="truncate">{candidate.jobs.slice(0, 2).join(', ')}{candidate.jobs.length > 2 ? ` +${candidate.jobs.length - 2}` : ''}</span>
                </div>
            </div>

            <div className="flex gap-2 mt-auto">
                <button onClick={onMessage}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-[2px] border-black rounded-xl font-black text-[8px] uppercase hover:bg-black hover:text-white transition-all">
                    <MessageSquare size={12} /> MESSAGE
                </button>
                <button 
                    onClick={() => navigate(`/candidates/${candidate.student_id}`)}
                    className="p-2.5 border-[2px] border-black rounded-xl text-black/40 hover:border-nile-blue hover:text-nile-blue transition-all"
                >
                    <ArrowUpRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default EmployerCandidates;
