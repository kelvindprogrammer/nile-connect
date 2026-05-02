import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3, Download, RefreshCw, Loader2, Users, Briefcase,
    ClipboardList, Building2, TrendingUp, FileText, Calendar,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    getDashboardStats, getStaffStudents, getStaffApplications,
    getStaffJobs, getStaffEmployers, getEvents,
    DashboardStats,
} from '../../services/staffService';

type ReportType = 'student_engagement' | 'application_pipeline' | 'job_market' | 'employer_activity' | 'event_summary';

const reportMeta: Record<ReportType, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
    student_engagement: {
        label: 'Student Engagement',
        desc: 'All students, verification status, majors, graduation years.',
        icon: <Users size={18} />,
        color: 'bg-nile-blue/10 text-nile-blue',
    },
    application_pipeline: {
        label: 'Application Pipeline',
        desc: 'Every student application, company, status and date.',
        icon: <ClipboardList size={18} />,
        color: 'bg-purple-50 text-purple-600',
    },
    job_market: {
        label: 'Job Market',
        desc: 'All job listings, employers, types, locations, status.',
        icon: <Briefcase size={18} />,
        color: 'bg-nile-green/10 text-nile-green',
    },
    employer_activity: {
        label: 'Employer Activity',
        desc: 'Registered companies, verification status, industries.',
        icon: <Building2 size={18} />,
        color: 'bg-yellow-50 text-yellow-600',
    },
    event_summary: {
        label: 'Event Summary',
        desc: 'Campus events, registrations, capacity, organiser type.',
        icon: <Calendar size={18} />,
        color: 'bg-red-50 text-red-500',
    },
};

const StaffReports = () => {
    const { showToast } = useToast();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [reportType, setReportType] = useState<ReportType>('student_engagement');
    const [isDownloading, setIsDownloading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const loadStats = useCallback(async () => {
        setLoadingStats(true);
        try { setStats(await getDashboardStats()); }
        catch { showToast('Failed to load stats.', 'error'); }
        finally { setLoadingStats(false); }
    }, [showToast]);

    useEffect(() => { loadStats(); }, [loadStats]);

    const kpis = useMemo(() => stats ? [
        { label: 'STUDENTS', value: stats.total_students, icon: <Users size={16} />, color: 'bg-nile-blue/10 text-nile-blue' },
        { label: 'EMPLOYERS', value: stats.total_employers, icon: <Building2 size={16} />, color: 'bg-yellow-50 text-yellow-600' },
        { label: 'ACTIVE JOBS', value: stats.active_jobs, icon: <Briefcase size={16} />, color: 'bg-nile-green/10 text-nile-green' },
        { label: 'APPLICATIONS', value: stats.total_applications, icon: <ClipboardList size={16} />, color: 'bg-purple-50 text-purple-600' },
        { label: 'PENDING JOBS', value: stats.pending_jobs, icon: <TrendingUp size={16} />, color: 'bg-orange-50 text-orange-500' },
        { label: 'EVENTS', value: stats.upcoming_events, icon: <Calendar size={16} />, color: 'bg-red-50 text-red-500' },
    ] : [], [stats]);

    const downloadCSV = async () => {
        setIsDownloading(true);
        try {
            let rows: string[][] = [];
            let filename = '';

            switch (reportType) {
                case 'student_engagement': {
                    const data = await getStaffStudents();
                    rows = [
                        ['ID', 'Full Name', 'Email', 'Major', 'Graduation Year', 'Verified', 'Joined'],
                        ...data.map(s => [s.id, s.full_name, s.email, s.major, String(s.graduation_year), s.is_verified ? 'Yes' : 'No', s.created_at]),
                    ];
                    filename = 'nile_student_engagement.csv';
                    break;
                }
                case 'application_pipeline': {
                    const data = await getStaffApplications();
                    rows = [
                        ['ID', 'Student', 'Job Title', 'Company', 'Status', 'Applied At'],
                        ...data.map(a => [a.id, a.student_name, a.job_title, a.company, a.status, a.applied_at ?? '']),
                    ];
                    filename = 'nile_application_pipeline.csv';
                    break;
                }
                case 'job_market': {
                    const data = await getStaffJobs();
                    rows = [
                        ['ID', 'Title', 'Company', 'Type', 'Location', 'Status', 'Posted At'],
                        ...data.map(j => [j.id, j.title, j.company, j.type, j.location, j.status, j.posted_at]),
                    ];
                    filename = 'nile_job_market.csv';
                    break;
                }
                case 'employer_activity': {
                    const data = await getStaffEmployers();
                    rows = [
                        ['ID', 'Company', 'Industry', 'Location', 'Contact Email', 'Status', 'Registered'],
                        ...data.map(e => [e.id, e.company_name, e.industry, e.location, e.contact_email, e.status, e.created_at]),
                    ];
                    filename = 'nile_employer_activity.csv';
                    break;
                }
                case 'event_summary': {
                    const data = await getEvents();
                    rows = [
                        ['ID', 'Title', 'Category', 'Date', 'Time', 'Location', 'Capacity', 'Registered', 'Status', 'Featured'],
                        ...data.map(e => [e.id, e.title, e.category, e.date, e.time, e.location, String(e.capacity), String(e.registrations_count), e.status, e.is_featured ? 'Yes' : 'No']),
                    ];
                    filename = 'nile_event_summary.csv';
                    break;
                }
            }

            const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
            showToast(`${filename} downloaded!`, 'success');
        } catch {
            showToast('Failed to generate report.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const generateSummary = async () => {
        if (!stats) { showToast('Stats not loaded yet.', 'error'); return; }
        setGenerating(true);
        setSummary(null);
        await new Promise(r => setTimeout(r, 600)); // brief UX delay

        const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const summaries: Record<ReportType, string> = {
            student_engagement:
                `STUDENT ENGAGEMENT REPORT\nGenerated: ${date}\n\n` +
                `Total Students       ${stats.total_students}\n` +
                `Pending Verification ${stats.total_students}\n\n` +
                `Note: verification rates reflect CV review completion by career services staff.`,
            application_pipeline:
                `APPLICATION PIPELINE REPORT\nGenerated: ${date}\n\n` +
                `Total Applications   ${stats.total_applications}\n` +
                `Active Job Listings  ${stats.active_jobs}\n` +
                `Pending Jobs         ${stats.pending_jobs}\n\n` +
                `Pipeline health: ${stats.active_jobs > 0 ? 'ACTIVE — jobs are live and accepting applications.' : 'No active listings.'}`,
            job_market:
                `JOB MARKET REPORT\nGenerated: ${date}\n\n` +
                `Active Jobs          ${stats.active_jobs}\n` +
                `Pending Approval     ${stats.pending_jobs}\n` +
                `Total Employers      ${stats.total_employers}\n` +
                `Pending Employers    ${stats.pending_employers}\n\n` +
                `Approval queue: ${stats.pending_jobs} listing(s) awaiting review.`,
            employer_activity:
                `EMPLOYER ACTIVITY REPORT\nGenerated: ${date}\n\n` +
                `Total Employers      ${stats.total_employers}\n` +
                `Pending Verification ${stats.pending_employers}\n` +
                `Approval Rate        ${stats.total_employers > 0 ? Math.round(((stats.total_employers - stats.pending_employers) / stats.total_employers) * 100) : 0}%\n\n` +
                `${stats.pending_employers} employer(s) still awaiting verification.`,
            event_summary:
                `EVENT SUMMARY REPORT\nGenerated: ${date}\n\n` +
                `Upcoming Events      ${stats.upcoming_events}\n\n` +
                `Use the CSV download to get full event registrations and attendance data.`,
        };
        setSummary(summaries[reportType]);
        setGenerating(false);
        showToast('Summary generated.', 'success');
    };

    const meta = reportMeta[reportType];

    return (
        <div className="p-4 md:p-8 space-y-8 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Header */}
            <div className="border-b-[2px] border-black pb-6">
                <h2 className="text-3xl md:text-5xl font-black text-black uppercase leading-none tracking-tighter">Reports .</h2>
                <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] mt-1">REAL DATA · CSV EXPORTS · PLATFORM ANALYTICS</p>
            </div>

            {/* KPI Strip */}
            {loadingStats ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 animate-pulse">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-black/5 rounded-[16px]" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {kpis.map(k => (
                        <div key={k.label} className={`border-[2px] border-black rounded-[16px] p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${k.color.includes('bg-') ? k.color : `bg-white ${k.color}`}`}>
                            <div className="flex items-center gap-2 mb-2 opacity-60">{k.icon}</div>
                            <p className="text-2xl font-black leading-none">{k.value.toLocaleString()}</p>
                            <p className="text-[7px] font-black uppercase tracking-[0.15em] mt-1 opacity-60">{k.label}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* Left: Report builder */}
                <div className="xl:col-span-7 space-y-6">
                    <div className="bg-white border-[2px] border-black rounded-[28px] p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-5">REPORT BUILDER</h3>

                        {/* Report type selection */}
                        <div className="space-y-3 mb-6">
                            {(Object.entries(reportMeta) as [ReportType, typeof reportMeta[ReportType]][]).map(([type, m]) => (
                                <button key={type} onClick={() => { setReportType(type); setSummary(null); }}
                                    className={`w-full flex items-center gap-4 p-4 border-[2px] border-black rounded-[16px] transition-all text-left
                                        ${reportType === type ? 'shadow-[3px_3px_0px_0px_#6CBB56] bg-black text-white' : 'bg-nile-white hover:bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 ${reportType === type ? 'bg-white/10 border-white/20' : `${m.color} border-black/10`}`}>
                                        {m.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-black text-xs uppercase tracking-wider ${reportType === type ? 'text-white' : 'text-black'}`}>{m.label}</p>
                                        <p className={`text-[8px] font-bold uppercase mt-0.5 truncate ${reportType === type ? 'text-white/50' : 'text-black/40'}`}>{m.desc}</p>
                                    </div>
                                    {reportType === type && <FileText size={14} className="text-nile-green flex-shrink-0" />}
                                </button>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t-[2px] border-black/5">
                            <button onClick={downloadCSV} disabled={isDownloading}
                                className="flex-1 py-4 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[4px_4px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_#6CBB56] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {isDownloading ? 'GENERATING...' : 'DOWNLOAD CSV'}
                            </button>
                            <button onClick={generateSummary} disabled={generating || loadingStats}
                                className="flex-1 py-4 bg-white text-black border-[2px] border-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                {generating ? 'GENERATING...' : 'TEXT SUMMARY'}
                            </button>
                        </div>
                    </div>

                    {/* Summary output */}
                    {summary && (
                        <div className="bg-white border-[2px] border-black rounded-[24px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 anime-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={14} className="text-nile-blue" />
                                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-black/50">GENERATED SUMMARY</h4>
                            </div>
                            <pre className="font-mono text-[10px] text-black whitespace-pre-wrap leading-relaxed bg-nile-white/60 border-[2px] border-black/10 rounded-xl p-5">
                                {summary}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Right: Export info + stats */}
                <div className="xl:col-span-5 space-y-5">
                    {/* Export preview */}
                    <div className="bg-nile-blue text-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${meta.color} border-2 border-white/20`}>
                            {meta.icon}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight">{meta.label}</h3>
                        <p className="text-[9px] font-bold text-white/50 uppercase mt-1 leading-relaxed">{meta.desc}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">WHAT YOU GET</p>
                            <p className="text-[9px] font-bold text-white/70 leading-relaxed">
                                A CSV file with all live platform data — ready for Excel, Google Sheets or further analysis.
                            </p>
                        </div>
                    </div>

                    {/* Quick stats */}
                    {stats && (
                        <div className="bg-white border-[2px] border-black rounded-[24px] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 pb-3 border-b-[2px] border-black/5">PLATFORM SNAPSHOT</h3>
                            {[
                                { label: 'Placement activity', value: `${stats.active_jobs} active jobs`, bar: Math.min(100, stats.active_jobs * 5) },
                                { label: 'Employer pipeline', value: `${stats.total_employers - stats.pending_employers}/${stats.total_employers} verified`, bar: stats.total_employers > 0 ? Math.round(((stats.total_employers - stats.pending_employers) / stats.total_employers) * 100) : 0 },
                                { label: 'Application load', value: `${stats.total_applications} total`, bar: Math.min(100, stats.total_applications * 2) },
                                { label: 'Upcoming events', value: `${stats.upcoming_events} events`, bar: Math.min(100, stats.upcoming_events * 10) },
                            ].map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-[8px] font-black uppercase text-black/50 mb-1.5">
                                        <span>{item.label}</span>
                                        <span className="text-black">{item.value}</span>
                                    </div>
                                    <div className="h-2 bg-nile-white border-[1.5px] border-black rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-black rounded-full transition-all duration-700" style={{ width: `${item.bar}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffReports;
