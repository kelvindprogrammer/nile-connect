import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FileText, Users, BarChart2, Search, CheckCircle2, XCircle,
    Loader2, Download, ArrowUpDown, MessageSquare, ShieldCheck,
    AlertCircle, RefreshCw
} from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import {
    getStaffStudents,
    verifyStudent,
    getStaffApplications,
    getStaffJobs,
    getStaffEmployers,
    getDashboardStats,
    StaffStudent,
    DashboardStats,
} from '../../services/staffService';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'CV REVIEW' | 'STUDENTS' | 'REPORTING';
type SortField = 'full_name' | 'major' | 'created_at';
type SortDir = 'asc' | 'desc';
type ReportType = 'student_engagement' | 'application_pipeline' | 'job_market' | 'employer_activity';
type DateRange = 'this_month' | 'this_quarter' | 'all_time';

// ── Loading Skeleton ──────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-14 bg-black/5 rounded-2xl w-64" />
        <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-black/5 rounded-xl w-32" />)}
        </div>
        <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-black/5 rounded-[20px]" />)}
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const StaffServices = () => {
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    const queryTab = new URLSearchParams(location.search).get('tab');
    const initialTab: TabId = queryTab === 'students'
        ? 'STUDENTS'
        : queryTab === 'reporting'
            ? 'REPORTING'
            : 'CV REVIEW';

    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const [students, setStudents] = useState<StaffStudent[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Filters for CV Review / Students
    const [search, setSearch] = useState('');
    const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

    // Students tab sorting
    const [sortField, setSortField] = useState<SortField>('full_name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Reporting
    const [reportType, setReportType] = useState<ReportType>('student_engagement');
    const [dateRange, setDateRange] = useState<DateRange>('this_quarter');
    const [reportSummary, setReportSummary] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [s, ds] = await Promise.all([getStaffStudents(), getDashboardStats()]);
            setStudents(s);
            setStats(ds);
        } catch {
            showToast('Failed to load student data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Sync URL tab param to state
    useEffect(() => {
        const qTab = new URLSearchParams(location.search).get('tab');
        if (qTab === 'students') setActiveTab('STUDENTS');
        else if (qTab === 'reporting') setActiveTab('REPORTING');
        else if (qTab === null && activeTab !== 'CV REVIEW') {/* leave as-is */ }
    }, [location.search]);

    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab);
        const paramMap: Record<TabId, string | null> = {
            'CV REVIEW': null,
            'STUDENTS': 'students',
            'REPORTING': 'reporting',
        };
        const param = paramMap[tab];
        navigate(param ? `/staff/services?tab=${param}` : '/staff/services', { replace: true });
    };

    const handleVerify = async (student: StaffStudent, verified: boolean) => {
        setActionLoading(prev => ({ ...prev, [student.id]: true }));
        try {
            await verifyStudent(student.id, verified);
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_verified: verified } : s));
            showToast(
                verified ? `${student.full_name} has been verified.` : `${student.full_name} verification removed.`,
                verified ? 'success' : 'error'
            );
        } catch {
            showToast(`Failed to update ${student.full_name}.`, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, [student.id]: false }));
        }
    };

    // Filtered students for CV Review tab
    const filteredCVStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = !search ||
                s.full_name.toLowerCase().includes(search.toLowerCase()) ||
                s.major.toLowerCase().includes(search.toLowerCase());
            const matchesFilter =
                verifiedFilter === 'all' ||
                (verifiedFilter === 'verified' && s.is_verified) ||
                (verifiedFilter === 'unverified' && !s.is_verified);
            return matchesSearch && matchesFilter;
        });
    }, [students, search, verifiedFilter]);

    // Sorted students for Students tab
    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            let va = a[sortField] as string | number;
            let vb = b[sortField] as string | number;
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
        }).filter(s => {
            if (!search) return true;
            return s.full_name.toLowerCase().includes(search.toLowerCase()) ||
                s.email.toLowerCase().includes(search.toLowerCase()) ||
                s.major.toLowerCase().includes(search.toLowerCase());
        });
    }, [students, sortField, sortDir, search]);

    const verifiedCount = students.filter(s => s.is_verified).length;
    const pendingCount = students.length - verifiedCount;

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // Major breakdown
    const majorBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        students.forEach(s => {
            const m = s.major || 'UNKNOWN';
            map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [students]);

    // CSV Download
    const downloadCSV = async () => {
        setIsDownloading(true);
        try {
            let rows: string[][] = [];
            let filename = '';

            if (reportType === 'student_engagement') {
                const data = await getStaffStudents();
                rows = [
                    ['ID', 'Full Name', 'Email', 'Major', 'Graduation Year', 'Verified', 'Joined'],
                    ...data.map(s => [s.id, s.full_name, s.email, s.major, String(s.graduation_year), s.is_verified ? 'Yes' : 'No', s.created_at])
                ];
                filename = 'student_engagement.csv';
            } else if (reportType === 'application_pipeline') {
                const data = await getStaffApplications();
                rows = [
                    ['ID', 'Student', 'Job Title', 'Company', 'Status', 'Applied At'],
                    ...data.map(a => [a.id, a.student_name, a.job_title, a.company, a.status, a.applied_at ?? ''])
                ];
                filename = 'application_pipeline.csv';
            } else if (reportType === 'job_market') {
                const data = await getStaffJobs();
                rows = [
                    ['ID', 'Title', 'Company', 'Type', 'Location', 'Status', 'Posted At'],
                    ...data.map(j => [j.id, j.title, j.company, j.type, j.location, j.status, j.posted_at])
                ];
                filename = 'job_market.csv';
            } else {
                const data = await getStaffEmployers();
                rows = [
                    ['ID', 'Company', 'Industry', 'Location', 'Contact Email', 'Status', 'Registered'],
                    ...data.map(e => [e.id, e.company_name, e.industry, e.location, e.contact_email, e.status, e.created_at])
                ];
                filename = 'employer_activity.csv';
            }

            const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`${filename} downloaded successfully.`, 'success');
        } catch {
            showToast('Failed to generate report.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const generateSummary = () => {
        if (!stats) { showToast('No data available.', 'error'); return; }
        const summaries: Record<ReportType, string> = {
            student_engagement: `STUDENT ENGAGEMENT REPORT\n\nTotal Students: ${stats.total_students}\nVerified: ${verifiedCount}\nPending Verification: ${pendingCount}\nTop Major: ${majorBreakdown[0]?.[0] ?? 'N/A'} (${majorBreakdown[0]?.[1] ?? 0} students)\n\nGenerated: ${new Date().toLocaleDateString()}`,
            application_pipeline: `APPLICATION PIPELINE REPORT\n\nTotal Applications: ${stats.total_applications}\nActive Jobs: ${stats.active_jobs}\nPending Jobs: ${stats.pending_jobs}\n\nGenerated: ${new Date().toLocaleDateString()}`,
            job_market: `JOB MARKET REPORT\n\nActive Jobs: ${stats.active_jobs}\nPending Approval: ${stats.pending_jobs}\nTotal Employers: ${stats.total_employers}\n\nGenerated: ${new Date().toLocaleDateString()}`,
            employer_activity: `EMPLOYER ACTIVITY REPORT\n\nTotal Employers: ${stats.total_employers}\nPending Verification: ${stats.pending_employers}\nApproval Rate: ${stats.total_employers > 0 ? Math.round(((stats.total_employers - stats.pending_employers) / stats.total_employers) * 100) : 0}%\n\nGenerated: ${new Date().toLocaleDateString()}`,
        };
        setReportSummary(summaries[reportType]);
        showToast('Summary generated.', 'success');
    };

    const tabs: { id: TabId; icon: React.ReactNode; count?: number }[] = [
        { id: 'CV REVIEW', icon: <FileText size={14} />, count: pendingCount },
        { id: 'STUDENTS', icon: <Users size={14} /> },
        { id: 'REPORTING', icon: <BarChart2 size={14} /> },
    ];

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b-[2px] border-black pb-6">
                <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">
                        Career Operations Hub
                    </h2>
                    <p className="text-[9px] md:text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">
                        TALENT, PLACEMENT &amp; PARTNERSHIPS
                    </p>
                </div>

                <div className="flex flex-wrap gap-1 bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabChange(t.id)}
                            className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all flex items-center gap-2 whitespace-nowrap
                                ${activeTab === t.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_#6CBB56]' : 'text-black/40 hover:text-black'}`}
                        >
                            {t.icon}
                            <span>{t.id}</span>
                            {t.count !== undefined && t.count > 0 && (
                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[7px] font-black
                                    ${activeTab === t.id ? 'bg-red-500 text-white' : 'bg-red-100 text-red-500'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── CV REVIEW TAB ─────────────────────────────────────── */}
            {activeTab === 'CV REVIEW' && (
                <div className="space-y-6 anime-fade-in">
                    {/* Stats bar */}
                    <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-nile-green/20 text-nile-green border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest">
                            {verifiedCount} VERIFIED
                        </span>
                        <span className="px-4 py-2 bg-red-50 text-red-500 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest">
                            {pendingCount} PENDING VERIFICATION
                        </span>
                        <span className="px-4 py-2 bg-black/5 text-black border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest">
                            {students.length} TOTAL
                        </span>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH BY NAME OR MAJOR..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all bg-nile-white/60 focus:bg-white"
                            />
                        </div>
                        <select
                            value={verifiedFilter}
                            onChange={e => setVerifiedFilter(e.target.value as any)}
                            className="py-3 px-4 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none bg-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <option value="all">ALL STUDENTS</option>
                            <option value="verified">VERIFIED ONLY</option>
                            <option value="unverified">UNVERIFIED ONLY</option>
                        </select>
                    </div>

                    {/* Student Cards */}
                    {filteredCVStudents.length === 0 ? (
                        <EmptyState label="No students match your filters" icon={<AlertCircle size={28} />} />
                    ) : (
                        <div className="space-y-3">
                            {filteredCVStudents.map(student => (
                                <div key={student.id} className="bg-white border-[2px] border-black rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:translate-y-[-2px] transition-all">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <Avatar name={student.full_name} size="sm" />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="font-black text-sm uppercase text-black leading-none truncate">{student.full_name}</p>
                                                <span className={`text-[7px] font-black px-2 py-0.5 rounded border-[1.5px] border-black uppercase ${student.is_verified ? 'bg-nile-green/20 text-nile-green' : 'bg-red-50 text-red-400'}`}>
                                                    {student.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                                                </span>
                                            </div>
                                            <p className="text-[8px] font-black text-black/40 uppercase tracking-wider truncate">
                                                {student.email}
                                            </p>
                                            <p className="text-[8px] font-black text-nile-blue/60 uppercase tracking-wider truncate">
                                                {student.major} &bull; CLASS OF {student.graduation_year}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                        {student.is_verified ? (
                                            <button
                                                onClick={() => handleVerify(student, false)}
                                                disabled={actionLoading[student.id]}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-black/60 border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50"
                                            >
                                                {actionLoading[student.id] ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} strokeWidth={3} />}
                                                <span>UNVERIFY</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleVerify(student, true)}
                                                disabled={actionLoading[student.id]}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-nile-green text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50"
                                            >
                                                {actionLoading[student.id] ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} strokeWidth={3} />}
                                                <span>VERIFY</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── STUDENTS TAB ──────────────────────────────────────── */}
            {activeTab === 'STUDENTS' && (
                <div className="space-y-6 anime-fade-in">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatMini label="TOTAL" value={students.length} color="bg-black text-white" />
                        <StatMini label="VERIFIED" value={verifiedCount} color="bg-nile-green/20 text-nile-green" />
                        <StatMini label="PENDING" value={pendingCount} color="bg-red-50 text-red-500" />
                        <StatMini label="TOP MAJOR" value={majorBreakdown[0]?.[0] ?? 'N/A'} isText color="bg-nile-blue/10 text-nile-blue" />
                    </div>

                    {/* Major breakdown */}
                    {majorBreakdown.length > 0 && (
                        <div className="bg-white border-[2px] border-black rounded-[20px] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-4">MAJOR BREAKDOWN</h4>
                            <div className="space-y-3">
                                {majorBreakdown.map(([major, count]) => (
                                    <div key={major} className="flex items-center gap-3">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-black/60 w-36 truncate shrink-0">{major}</span>
                                        <div className="flex-1 h-3 bg-nile-white border-[2px] border-black rounded-full overflow-hidden p-0.5">
                                            <div
                                                className="h-full bg-black rounded-full transition-all duration-700"
                                                style={{ width: `${students.length > 0 ? Math.round((count / students.length) * 100) : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-black text-black w-8 text-right">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="SEARCH STUDENTS..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-black font-black text-[9px] tracking-widest uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all bg-nile-white/60 focus:bg-white"
                        />
                    </div>

                    {/* Sort controls */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-[8px] font-black text-black/40 uppercase tracking-widest self-center">SORT BY:</span>
                        {(['full_name', 'major', 'created_at'] as SortField[]).map(f => (
                            <button
                                key={f}
                                onClick={() => toggleSort(f)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[2px] border-black font-black text-[8px] uppercase tracking-widest transition-all
                                    ${sortField === f ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'}`}
                            >
                                <ArrowUpDown size={10} />
                                {f === 'full_name' ? 'NAME' : f === 'major' ? 'MAJOR' : 'DATE JOINED'}
                                {sortField === f && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Students list */}
                    {sortedStudents.length === 0 ? (
                        <EmptyState label="No students found" icon={<Users size={28} />} />
                    ) : (
                        <div className="space-y-3">
                            {sortedStudents.map(student => (
                                <div key={student.id} className="bg-white border-[2px] border-black rounded-[20px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                                            {student.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                <p className="font-black text-sm uppercase text-black leading-none truncate">{student.full_name}</p>
                                                <span className={`text-[7px] font-black px-2 py-0.5 rounded border-[1.5px] border-black uppercase ${student.is_verified ? 'bg-nile-green/20 text-nile-green' : 'bg-red-50 text-red-400'}`}>
                                                    {student.is_verified ? 'VERIFIED' : 'PENDING'}
                                                </span>
                                            </div>
                                            <p className="text-[8px] font-black text-black/40 uppercase tracking-wider truncate">{student.email}</p>
                                            <div className="flex flex-wrap gap-3 mt-1">
                                                <span className="text-[7px] font-black text-nile-blue/60 uppercase">{student.major}</span>
                                                <span className="text-[7px] font-black text-black/30 uppercase">CLASS OF {student.graduation_year}</span>
                                                <span className="text-[7px] font-black text-black/20 uppercase">
                                                    JOINED {new Date(student.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/staff/messages')}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-nile-blue/10 text-nile-blue border-[2px] border-black rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-black hover:text-white transition-all shrink-0"
                                    >
                                        <MessageSquare size={12} />
                                        <span className="hidden sm:inline">MESSAGE</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── REPORTING TAB ─────────────────────────────────────── */}
            {activeTab === 'REPORTING' && (
                <div className="max-w-4xl space-y-6 anime-fade-in">
                    <Card title="DATA GENERATION BOARD">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6">
                            {/* Controls */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-black/60 tracking-[0.2em] uppercase">REPORT TYPE</label>
                                    <select
                                        value={reportType}
                                        onChange={e => { setReportType(e.target.value as ReportType); setReportSummary(null); }}
                                        className="w-full bg-nile-white/60 border-[2px] border-black rounded-xl py-3 px-4 font-black text-[10px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                                    >
                                        <option value="student_engagement">STUDENT ENGAGEMENT</option>
                                        <option value="application_pipeline">APPLICATION PIPELINE</option>
                                        <option value="job_market">JOB MARKET REPORT</option>
                                        <option value="employer_activity">EMPLOYER ACTIVITY</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-black/60 tracking-[0.2em] uppercase">DATE RANGE</label>
                                    <select
                                        value={dateRange}
                                        onChange={e => setDateRange(e.target.value as DateRange)}
                                        className="w-full bg-nile-white/60 border-[2px] border-black rounded-xl py-3 px-4 font-black text-[10px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                                    >
                                        <option value="this_month">THIS MONTH</option>
                                        <option value="this_quarter">THIS QUARTER</option>
                                        <option value="all_time">ALL TIME</option>
                                    </select>
                                </div>

                                {/* Preview stats */}
                                {stats && (
                                    <div className="bg-nile-white border-[2px] border-black rounded-xl p-4 space-y-2">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-black/40">PREVIEW STATS</p>
                                        {reportType === 'student_engagement' && (
                                            <>
                                                <PreviewStat label="Total Students" value={stats.total_students} />
                                                <PreviewStat label="Verified" value={verifiedCount} />
                                                <PreviewStat label="Pending" value={pendingCount} />
                                            </>
                                        )}
                                        {reportType === 'application_pipeline' && (
                                            <>
                                                <PreviewStat label="Total Applications" value={stats.total_applications} />
                                                <PreviewStat label="Active Jobs" value={stats.active_jobs} />
                                                <PreviewStat label="Pending Jobs" value={stats.pending_jobs} />
                                            </>
                                        )}
                                        {reportType === 'job_market' && (
                                            <>
                                                <PreviewStat label="Active Jobs" value={stats.active_jobs} />
                                                <PreviewStat label="Pending Approval" value={stats.pending_jobs} />
                                                <PreviewStat label="Total Employers" value={stats.total_employers} />
                                            </>
                                        )}
                                        {reportType === 'employer_activity' && (
                                            <>
                                                <PreviewStat label="Total Employers" value={stats.total_employers} />
                                                <PreviewStat label="Pending Verification" value={stats.pending_employers} />
                                                <PreviewStat label="Upcoming Events" value={stats.upcoming_events} />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Download area */}
                            <div className="bg-nile-blue/5 border-[2px] border-dashed border-black/10 rounded-[24px] p-6 flex flex-col justify-center items-center text-center gap-4">
                                <div className="w-14 h-14 bg-white border-[2px] border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                    <Download size={24} className="text-nile-blue" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-black">READY TO EXPORT</p>
                                    <p className="text-[8px] font-bold text-black/40 uppercase mt-1">REAL DATA FROM API</p>
                                </div>
                                <p className="text-[9px] text-black/30 font-bold leading-relaxed">
                                    Downloads a CSV with live data from the NileConnect platform.
                                </p>
                            </div>
                        </div>

                        <div className="pt-5 border-t-[2px] border-black/5 flex flex-col sm:flex-row gap-3">
                            <Button
                                fullWidth
                                size="md"
                                onClick={downloadCSV}
                                isLoading={isDownloading}
                            >
                                <Download size={14} className="mr-2" />
                                DOWNLOAD CSV
                            </Button>
                            <Button variant="outline" fullWidth size="md" onClick={generateSummary}>
                                <RefreshCw size={14} className="mr-2" />
                                GENERATE SUMMARY
                            </Button>
                        </div>
                    </Card>

                    {/* Summary output */}
                    {reportSummary && (
                        <div className="bg-white border-[2px] border-black rounded-[20px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 anime-fade-in">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-4">GENERATED SUMMARY</h4>
                            <pre className="font-black text-[10px] text-black whitespace-pre-wrap leading-relaxed bg-nile-white/60 border-[2px] border-black/10 rounded-xl p-4">
                                {reportSummary}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const EmptyState = ({ label, icon }: { label: string; icon: React.ReactNode }) => (
    <div className="py-20 text-center border-2 border-dashed border-black/10 rounded-[28px]">
        <div className="text-black/20 mx-auto mb-3 flex justify-center">{icon}</div>
        <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">{label}</p>
    </div>
);

const StatMini = ({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) => (
    <div className={`border-[2px] border-black rounded-[16px] p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${color.includes('bg-') ? '' : 'bg-white'}`}>
        <p className={`${isText ? 'text-base' : 'text-2xl'} font-black leading-none truncate`}>{isText ? value : Number(value).toLocaleString()}</p>
        <p className="text-[7px] font-black uppercase tracking-widest opacity-60 mt-1">{label}</p>
    </div>
);

const PreviewStat = ({ label, value }: { label: string; value: number }) => (
    <div className="flex justify-between items-center">
        <span className="text-[8px] font-black uppercase tracking-wider text-black/50">{label}</span>
        <span className="text-[10px] font-black text-black">{value.toLocaleString()}</span>
    </div>
);

export default StaffServices;
