import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, Briefcase,
    Loader2, AlertCircle, MessageCircle, FileText, Star, ChevronDown, Clock,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import {
    getEmployerApplicationDetail, updateApplicationStage, upsertApplicationNote,
    EmployerApplicationDetail,
} from '../../services/employerService';
import { APPLICATION_STAGES } from '../../types/application';

const stageBadge: Record<string, string> = {
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

const CandidateDetail = () => {
    // Route param is /employer/candidates/:id, where :id is an application id
    // (the backend's application-detail endpoint is keyed by application, not
    // student — a candidate with multiple applications has one detail page per
    // application, linked to from Applications.tsx / Candidates.tsx).
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [app, setApp] = useState<EmployerApplicationDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [savingStage, setSavingStage] = useState(false);
    const [noteBody, setNoteBody] = useState('');
    const [noteRating, setNoteRating] = useState(0);
    const [savingNote, setSavingNote] = useState(false);

    const load = useCallback(() => {
        if (!id) { setError(true); setIsLoading(false); return; }
        setIsLoading(true);
        getEmployerApplicationDetail(id)
            .then(data => {
                setApp(data);
                setNoteBody(data.note?.body || '');
                setNoteRating(data.note?.rating || 0);
            })
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, [id]);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    const handleStageChange = async (stage: string) => {
        if (!app) return;
        setSavingStage(true);
        try {
            await updateApplicationStage(app.id, { stage });
            setApp(prev => prev && { ...prev, stage });
            showToast(`Moved to ${stageLabel(stage)}`, 'success');
        } catch {
            showToast('Failed to update stage', 'error');
        } finally {
            setSavingStage(false);
        }
    };

    const handleSaveNote = async () => {
        if (!app) return;
        setSavingNote(true);
        try {
            const saved = await upsertApplicationNote(app.id, { body: noteBody, rating: noteRating });
            setApp(prev => prev && { ...prev, note: saved });
            showToast('Note saved', 'success');
        } catch {
            showToast('Failed to save note', 'error');
        } finally {
            setSavingNote(false);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-full py-24">
            <Loader2 size={32} className="animate-spin text-nile-blue/40" />
        </div>
    );

    if (error || !app) return (
        <div className="p-8 anime-fade-in text-left space-y-6">
            <button onClick={() => navigate('/employer/candidates')}
                className="flex items-center gap-2 text-black/40 font-semibold text-[9px] hover:text-black transition-colors">
                <ArrowLeft size={14} strokeWidth={3} /> BACK TO TALENT POOL
            </button>
            <div className="py-24 text-center border-[2px] border-dashed border-black/10 rounded-[32px]">
                <AlertCircle size={32} className="text-black/20 mx-auto mb-4" />
                <p className="text-[9px] font-semibold text-black/30">Candidate not found or no applications</p>
            </div>
        </div>
    );

    const badge = stageBadge[app.stage] || 'bg-black/5 text-black/40 border-black/10';

    return (
        <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans pb-20 text-left min-h-full">

            {/* Nav */}
            <button onClick={() => navigate('/employer/candidates')}
                className="flex items-center gap-2 text-black/40 font-semibold text-[9px] hover:text-black transition-colors">
                <ArrowLeft size={14} strokeWidth={3} /> BACK TO TALENT POOL
            </button>

            {/* Header Card */}
            <Card className="!p-6 md:!p-8 border-nile-green/30">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] border border-gray-100 shadow-blue overflow-hidden flex-shrink-0">
                            <Avatar name={app.student_name || 'Candidate'} size="lg" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-semibold text-black leading-none">
                                    {app.student_name || 'Unknown Candidate'}
                                </h1>
                            </div>
                            <p className="text-[9px] font-semibold text-nile-blue/50">
                                {app.major || 'Student'}{app.graduation_year ? ` · Class of ${app.graduation_year}` : ''}{app.gpa ? ` · GPA ${app.gpa.toFixed(2)}` : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {app.student_email && (
                                    <span className="flex items-center gap-1 text-[8px] font-semibold text-black/40">
                                        <Mail size={10} className="text-nile-blue" /> {app.student_email}
                                    </span>
                                )}
                                <span className={`text-[7px] font-semibold px-2.5 py-0.5 rounded-full border ${badge}`}>
                                    {stageLabel(app.stage).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" size="md"
                            onClick={() => navigate('/employer/messages', { state: { startConversationWith: { id: app.student_id, full_name: app.student_name } } })}
                            className="flex-1 md:flex-none flex items-center gap-2">
                            <MessageCircle size={14} /> MESSAGE
                        </Button>
                        <div className="relative flex-1 md:flex-none">
                            <select
                                value={app.stage}
                                disabled={savingStage}
                                onChange={e => handleStageChange(e.target.value)}
                                className={`w-full appearance-none pl-4 pr-9 py-3 border-[2px] rounded-xl font-semibold text-[9px] tracking-wider cursor-pointer outline-none ${badge} border-current`}
                            >
                                {APPLICATION_STAGES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>
                                ))}
                            </select>
                            {savingStage
                                ? <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
                                : <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {/* Application info */}
                    <Card className="!p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-nile-blue flex-shrink-0" />
                            <h4 className="font-semibold text-sm tracking-tight">{app.job_title}</h4>
                        </div>
                        {app.applied_at && (
                            <p className="text-[8px] font-semibold text-black/30">
                                Applied {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                        {app.cover_letter && (
                            <div className="pt-3 border-t border-black/5">
                                <p className="text-[8px] font-semibold text-black/30 mb-1.5">COVER LETTER</p>
                                <p className="text-[10px] font-medium text-black/70 whitespace-pre-line leading-relaxed">{app.cover_letter}</p>
                            </div>
                        )}
                    </Card>

                    {/* Documents */}
                    <Card className="!p-5 space-y-3">
                        <h3 className="text-[10px] font-semibold text-black/40">DOCUMENTS</h3>
                        {(app.documents?.length || 0) === 0 && !app.resume_url ? (
                            <p className="text-[9px] font-semibold text-black/30">No documents submitted.</p>
                        ) : (
                            <div className="space-y-2">
                                {app.resume_url && (!app.documents || !app.documents.some(d => d.type === 'resume')) && (
                                    <a href={app.resume_url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:shadow-card transition-all">
                                        <FileText size={14} className="text-nile-blue flex-shrink-0" />
                                        <span className="text-[9px] font-semibold text-black truncate">Resume / CV</span>
                                    </a>
                                )}
                                {app.documents?.map(doc => (
                                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:shadow-card transition-all">
                                        <FileText size={14} className="text-nile-blue flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-semibold text-black truncate">{doc.title}</p>
                                            <p className="text-[7px] font-semibold text-black/30 uppercase">{doc.type.replace(/_/g, ' ')}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Stage history */}
                    <Card className="!p-5 space-y-3">
                        <h3 className="text-[10px] font-semibold text-black/40">STAGE HISTORY</h3>
                        {(app.history?.length || 0) === 0 ? (
                            <p className="text-[9px] font-semibold text-black/30">No stage changes yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {app.history.map((h, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <Clock size={12} className="text-black/20 flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-semibold text-black">
                                                {h.from_stage ? `${stageLabel(h.from_stage)} → ${stageLabel(h.to_stage)}` : `Applied (${stageLabel(h.to_stage)})`}
                                            </p>
                                            {h.note && <p className="text-[8px] font-semibold text-black/40 mt-0.5">{h.note}</p>}
                                            <p className="text-[7px] font-semibold text-black/20 mt-0.5">
                                                {new Date(h.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Academic info */}
                    <Card className="!p-5 space-y-3">
                        <h3 className="text-[10px] font-semibold text-black/40">ACADEMIC PROFILE</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {app.major && (
                                <div>
                                    <p className="text-[8px] font-semibold text-black/30 mb-0.5">Major</p>
                                    <p className="font-semibold text-sm">{app.major}</p>
                                </div>
                            )}
                            {app.graduation_year > 0 && (
                                <div>
                                    <p className="text-[8px] font-semibold text-black/30 mb-0.5">Graduation</p>
                                    <p className="font-semibold text-sm">{app.graduation_year}</p>
                                </div>
                            )}
                            {app.gpa > 0 && (
                                <div>
                                    <p className="text-[8px] font-semibold text-black/30 mb-0.5">GPA</p>
                                    <p className="font-semibold text-sm">{app.gpa.toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Notes + rating */}
                    <Card className="!p-5 space-y-4">
                        <h3 className="text-[10px] font-semibold text-black/40">PRIVATE NOTES &amp; RATING</h3>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} type="button" onClick={() => setNoteRating(n)}>
                                    <Star
                                        size={20}
                                        className={n <= noteRating ? 'text-yellow-500' : 'text-black/15'}
                                        fill={n <= noteRating ? 'currentColor' : 'none'}
                                    />
                                </button>
                            ))}
                            {noteRating > 0 && (
                                <button type="button" onClick={() => setNoteRating(0)} className="text-[8px] font-semibold text-black/30 ml-2 hover:text-red-400">
                                    CLEAR
                                </button>
                            )}
                        </div>
                        <textarea
                            value={noteBody}
                            onChange={e => setNoteBody(e.target.value)}
                            rows={4}
                            placeholder="Private notes about this candidate (only visible to your team)..."
                            className="w-full border border-gray-100 rounded-xl p-3 font-medium text-[10px] outline-none focus:shadow-blue bg-[#F8F9FB]/60 focus:bg-white transition-all resize-none"
                        />
                        <Button size="sm" fullWidth isLoading={savingNote} onClick={handleSaveNote}>
                            SAVE NOTE
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CandidateDetail;
