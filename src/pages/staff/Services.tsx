import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FileText, Users, Video, Search, CheckCircle2, XCircle,
    Loader2, ArrowUpDown, ShieldCheck, AlertCircle, Star,
    GraduationCap, Calendar, MessageSquare, BookOpen,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import {
    getStaffStudents, verifyStudent, StaffStudent,
} from '../../services/staffService';

type Tab = 'MOCK INTERVIEW' | 'CV REVIEW' | 'ADVISORY';
type SortField = 'full_name' | 'major' | 'graduation_year' | 'created_at';
type SortDir = 'asc' | 'desc';

const StaffServices = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('CV REVIEW');
    const [students, setStudents] = useState<StaffStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setStudents(await getStaffStudents());
        } catch {
            showToast('Failed to load student data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleVerify = async (student: StaffStudent, verified: boolean) => {
        setActionLoading(p => ({ ...p, [student.id]: true }));
        try {
            await verifyStudent(student.id, verified);
            setStudents(p => p.map(s => s.id === student.id ? { ...s, is_verified: verified } : s));
            showToast(verified ? `${student.full_name} verified.` : `${student.full_name} unverified.`, verified ? 'success' : 'error');
        } catch {
            showToast('Update failed.', 'error');
        } finally {
            setActionLoading(p => ({ ...p, [student.id]: false }));
        }
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const sorted = useMemo(() => {
        const list = [...students].sort((a, b) => {
            const va = (a[sortField] ?? '') as string | number;
            const vb = (b[sortField] ?? '') as string | number;
            const aStr = typeof va === 'string' ? va.toLowerCase() : va;
            const bStr = typeof vb === 'string' ? vb.toLowerCase() : vb;
            const cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
        });
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter(s =>
            s.full_name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            (s.major || '').toLowerCase().includes(q)
        );
    }, [students, sortField, sortDir, search]);

    // Tab-specific filtered sets
    const cvReviewStudents = sorted; // all students — staff reviews their CVs
    const mockInterviewStudents = sorted.filter(s => !s.is_verified); // unverified need prep
    const advisoryStudents = useMemo(() =>
        [...sorted].sort((a, b) => a.graduation_year - b.graduation_year), // soonest graduates first
        [sorted]
    );

    const verified = students.filter(s => s.is_verified).length;
    const unverified = students.length - verified;

    const tabs: { id: Tab; icon: React.ReactNode; badge?: number }[] = [
        { id: 'MOCK INTERVIEW', icon: <Video size={13} />,   badge: mockInterviewStudents.length },
        { id: 'CV REVIEW',     icon: <FileText size={13} />, badge: unverified },
        { id: 'ADVISORY',      icon: <BookOpen size={13} /> },
    ];

    const displayList = tab === 'MOCK INTERVIEW' ? mockInterviewStudents
        : tab === 'CV REVIEW' ? cvReviewStudents
        : advisoryStudents;

    if (loading) return (
        <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="h-12 bg-black/5 rounded-2xl w-64" />
            <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-black/5 rounded-xl w-36" />)}</div>
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-black/5 rounded-[20px]" />)}
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b-[2px] border-black pb-6">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Career Services .</h2>
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">MOCK INTERVIEWS · CV REVIEWS · ADVISORY SESSIONS</p>
                </div>
                <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
                            className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-xl font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap
                                ${tab === t.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}>
                            {t.icon} {t.id}
                            {t.badge !== undefined && t.badge > 0 && (
                                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? 'bg-red-400 text-white' : 'bg-red-100 text-red-500'}`}>{t.badge}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Context banner */}
            {tab === 'MOCK INTERVIEW' && (
                <div className="bg-nile-blue/5 border-[2px] border-nile-blue/20 rounded-[20px] p-4 flex items-start gap-3 anime-fade-in">
                    <Video size={18} className="text-nile-blue flex-shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black text-nile-blue/70 uppercase leading-relaxed">
                        Students shown here have not yet been verified — they likely need mock interview preparation before job applications. Verify a student after completing their session.
                    </p>
                </div>
            )}
            {tab === 'ADVISORY' && (
                <div className="bg-nile-green/10 border-[2px] border-nile-green/30 rounded-[20px] p-4 flex items-start gap-3 anime-fade-in">
                    <GraduationCap size={18} className="text-nile-green flex-shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black text-nile-green/80 uppercase leading-relaxed">
                        Students sorted by graduation year — those graduating soonest are prioritized for career advisory sessions. Use the message button to connect directly.
                    </p>
                </div>
            )}

            {/* Stats strip */}
            <div className="flex flex-wrap gap-3">
                <StatPill label="TOTAL STUDENTS" value={students.length} color="bg-black text-white" />
                <StatPill label="VERIFIED" value={verified} color="bg-nile-green/20 text-nile-green" />
                <StatPill label="NEED REVIEW" value={unverified} color="bg-red-50 text-red-500" />
            </div>

            {/* Search + Sort */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="SEARCH BY NAME, EMAIL OR MAJOR..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white/60 focus:bg-white transition-all" />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[8px] font-black text-black/40 uppercase tracking-widest">SORT:</span>
                    {(['full_name', 'major', 'graduation_year', 'created_at'] as SortField[]).map(f => (
                        <button key={f} onClick={() => toggleSort(f)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-[2px] border-black font-black text-[7px] uppercase tracking-wider transition-all
                                ${sortField === f ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'}`}>
                            <ArrowUpDown size={9} />
                            {f === 'full_name' ? 'NAME' : f === 'major' ? 'MAJOR' : f === 'graduation_year' ? 'GRAD YEAR' : 'DATE'}
                            {sortField === f && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Student List */}
            {displayList.length === 0 ? (
                <div className="py-20 text-center border-[2px] border-dashed border-black/10 rounded-[28px]">
                    <div className="text-black/20 mx-auto mb-3 flex justify-center">
                        {tab === 'MOCK INTERVIEW' ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                    </div>
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">
                        {search ? 'No students match your search' : tab === 'MOCK INTERVIEW' ? 'All students are verified — great work!' : 'No students found'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayList.map(student => (
                        <StudentCard
                            key={student.id}
                            student={student}
                            tab={tab}
                            loading={!!actionLoading[student.id]}
                            onVerify={handleVerify}
                            onMessage={() => navigate('/messages')}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const StudentCard = ({ student, tab, loading, onVerify, onMessage }: {
    student: StaffStudent;
    tab: Tab;
    loading: boolean;
    onVerify: (s: StaffStudent, v: boolean) => void;
    onMessage: () => void;
}) => (
    <div className="bg-white border-[2px] border-black rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
        <div className="flex items-center gap-4 min-w-0 flex-1">
            <Avatar name={student.full_name} size="sm" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-black text-sm uppercase text-black truncate leading-none">{student.full_name}</p>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded border-[1.5px] border-black uppercase ${student.is_verified ? 'bg-nile-green/20 text-nile-green' : 'bg-red-50 text-red-400'}`}>
                        {student.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                    {tab === 'ADVISORY' && student.graduation_year <= new Date().getFullYear() + 1 && (
                        <span className="text-[7px] font-black px-2 py-0.5 rounded bg-yellow-50 text-yellow-600 border border-yellow-200 uppercase">
                            GRADUATING SOON
                        </span>
                    )}
                </div>
                <p className="text-[8px] font-black text-black/40 uppercase tracking-wider truncate">{student.email}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-[7px] font-black text-nile-blue/60 uppercase">{student.major || 'NO MAJOR'}</span>
                    <span className="text-[7px] font-black text-black/30 uppercase">CLASS OF {student.graduation_year || '—'}</span>
                    <span className="text-[7px] font-black text-black/20 uppercase">
                        JOINED {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button onClick={onMessage}
                className="flex items-center gap-1.5 px-3 py-2 bg-nile-blue/10 text-nile-blue border-[2px] border-black rounded-xl font-black text-[8px] uppercase hover:bg-black hover:text-white transition-all">
                <MessageSquare size={12} />
                <span className="hidden sm:inline">MSG</span>
            </button>
            {student.is_verified ? (
                <button onClick={() => onVerify(student, false)} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-black/50 border-[2px] border-black rounded-xl font-black text-[8px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-40">
                    {loading ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} strokeWidth={3} />}
                    <span>UNVERIFY</span>
                </button>
            ) : (
                <button onClick={() => onVerify(student, true)} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[8px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-40">
                    {loading ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} strokeWidth={3} />}
                    <span>{tab === 'MOCK INTERVIEW' ? 'SESSION DONE' : tab === 'ADVISORY' ? 'ADVISED' : 'VERIFY CV'}</span>
                </button>
            )}
        </div>
    </div>
);

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <span className={`flex items-center gap-2 px-4 py-2 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest ${color}`}>
        <span className="text-base font-black">{value}</span> {label}
    </span>
);

export default StaffServices;
