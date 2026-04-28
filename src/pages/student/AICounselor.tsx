import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Cpu, Zap, Target, BookOpen, CheckCircle2,
    AlertCircle, Sparkles, Send, MessageSquare, X, Upload,
    ChevronDown, Loader2,
} from 'lucide-react';
import { formatMarkdown } from '../../utils/formatMarkdown';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import {
    sendChatMessage,
    reviewCV,
    type ChatMessage,
    type CVReviewResponse,
    type StudentProfile,
} from '../../services/aiService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a StudentProfile from the AuthContext user (best-effort mapping) */
const buildProfile = (user: ReturnType<typeof useAuth>['user']): StudentProfile => ({
    full_name: user?.name,
    department: user?.major || user?.department,
    major: user?.major,
    graduation_year: user?.graduationYear,
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Badge = ({ label }: { label: string }) => (
    <span className="px-3 py-1 bg-nile-white border-2 border-black rounded-lg text-[8px] md:text-[9px] font-black text-black uppercase tracking-widest shadow-sm">
        {label}
    </span>
);

const AnalysisCard = ({
    icon, title, items, alert = false,
}: {
    icon: React.ReactNode; title: string; items: string[]; alert?: boolean;
}) => (
    <div
        className={`bg-white border-3 border-black rounded-[28px] p-6 md:p-8 flex flex-col transition-all hover:translate-x-[2px] hover:translate-y-[2px] shadow-brutalist-sm text-left ${alert ? 'border-red-500/20' : ''}`}
    >
        <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-nile-white border-2 border-black rounded-xl">{icon}</div>
            <h4 className="text-[11px] md:text-sm font-black text-black uppercase tracking-widest">{title}</h4>
        </div>
        <ul className="space-y-3 flex-1">
            {items.map((it, i) => (
                <li key={i} className="flex items-start space-x-2 text-[9px] md:text-[10px] font-black text-nile-blue/60 uppercase group">
                    <ChevronDown size={14} className="-rotate-90 text-black/20 group-hover:text-black transition-colors" />
                    <span className="group-hover:text-black transition-colors">{it}</span>
                </li>
            ))}
        </ul>
    </div>
);

const OptimizationStep = ({ num, task, desc }: { num: string; task: string; desc: string }) => (
    <div className="flex gap-6 group text-left">
        <div className="flex-shrink-0 w-10 md:w-12 h-10 md:h-12 bg-white text-black border-2 border-black rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-nile-green transition-colors">
            {num}
        </div>
        <div className="space-y-1">
            <h5 className="text-xs md:text-sm font-black text-nile-green uppercase tracking-tight">{task}</h5>
            <p className="text-[9px] md:text-[10px] font-bold text-white/50 uppercase leading-relaxed tracking-wider">{desc}</p>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AICounselor = () => {
    const { showToast } = useToast();
    const { user } = useAuth();

    // CV upload & review
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [cvReview, setCvReview] = useState<CVReviewResponse | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Human consultation
    const [requestedConsultation, setRequestedConsultation] = useState(false);

    // Chat
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<{ id: number; role: 'user' | 'bot'; text: string }[]>([
        {
            id: 1,
            role: 'bot',
            text: 'HELLO. I AM THE CAREER ARCHITECT. UPLOAD YOUR CV TO BEGIN, OR ASK ME ANYTHING ABOUT YOUR CAREER PATH.',
        },
    ]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => {
        if (showChat) scrollToBottom();
    }, [messages, showChat]);

    // -----------------------------------------------------------------------
    // CV review
    // -----------------------------------------------------------------------

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Only PDF files are accepted.', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('File must be under 5 MB.', 'error');
            return;
        }
        setCvFile(file);
    };

    const handleAnalyze = async () => {
        if (!cvFile) {
            showToast('Please upload a PDF CV first.', 'error');
            fileInputRef.current?.click();
            return;
        }
        setAnalyzing(true);
        try {
            const profile = buildProfile(user);
            const result = await reviewCV(cvFile, '', profile);
            setCvReview(result);
            showToast('AI Analysis Complete!', 'success');
        } catch (err: any) {
            const msg =
                err?.response?.data?.error ||
                'AI review failed. Please try again.';
            showToast(msg, 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleRequestConsultation = () => {
        setRequestedConsultation(true);
        showToast('Consultation request sent to Career Services.', 'success');
    };

    // -----------------------------------------------------------------------
    // Chat
    // -----------------------------------------------------------------------

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text || chatLoading) return;

        const userMsg = { id: Date.now(), role: 'user' as const, text };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue('');
        setChatLoading(true);

        const newHistory: ChatMessage[] = [
            ...chatHistory,
            { role: 'user', content: text },
        ];
        setChatHistory(newHistory);

        try {
            const profile = buildProfile(user);
            const resp = await sendChatMessage(text, chatHistory, profile);
            const botMsg = {
                id: Date.now() + 1,
                role: 'bot' as const,
                text: resp.reply,
            };
            setMessages((prev) => [...prev, botMsg]);
            setChatHistory([...newHistory, { role: 'assistant', content: resp.reply }]);
        } catch (err: any) {
            const errMsg = err?.response?.data?.error || 'AI chat unavailable. Try again.';
            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 2, role: 'bot', text: `ERROR: ${errMsg.toUpperCase()}` },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Parse the AI review text into display sections
    // -----------------------------------------------------------------------

    const parseReview = (text: string) => {
        const keepMatch = text.match(/\*{0,2}Keep[:\*]*([\s\S]*?)(?=\*{0,2}Add[:\*]|\*{0,2}Fix[:\*]|$)/i);
        const addMatch = text.match(/\*{0,2}Add[:\*]*([\s\S]*?)(?=\*{0,2}Fix[:\*]|Nile-Specific|$)/i);
        const fixMatch = text.match(/\*{0,2}Fix[:\*]*([\s\S]*?)(?=Nile-Specific|$)/i);
        const tipMatch = text.match(/Nile-Specific Tip[:\*]*([\s\S]*?)$/i);

        const toItems = (raw: string | undefined): string[] =>
            (raw || '')
                .split('\n')
                .map((l) => l.replace(/^[-•*\d.]+\s*/, '').trim())
                .filter(Boolean)
                .slice(0, 4);

        const scoreMatch = text.match(/Match Score[:\s]+(\d+)/i);
        const gradeMatch = text.match(/\b([A-F][+-]?)\b/);

        return {
            score: scoreMatch ? parseInt(scoreMatch[1]) : null,
            grade: gradeMatch ? gradeMatch[1] : null,
            keep: toItems(keepMatch?.[1]),
            add: toItems(addMatch?.[1]),
            fix: toItems(fixMatch?.[1]),
            tip: tipMatch?.[1]?.trim() || '',
            raw: text,
        };
    };

    const parsed = cvReview ? parseReview(cvReview.review) : null;
    const resultReady = !!cvReview;

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    // Show chat open by default so the Architect is immediately visible
    useEffect(() => { setShowChat(true); }, []);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 font-sans bg-nile-white min-h-full pb-24 md:pb-4 text-left">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-[2px] border-black pb-5 mb-6">
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-nile-green mb-1">
                            <Cpu size={18} strokeWidth={2.5} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">NEURAL ENGINE V2.0</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tighter">Career Architect .</h2>
                        <p className="text-xs font-bold text-nile-blue/70 uppercase tracking-widest max-w-xl">
                            AI-driven CV analysis, skill mapping, and the Career Architect chat — always on.
                        </p>
                    </div>
                    {resultReady && !requestedConsultation && (
                        <div className="flex flex-col items-end gap-2 animate-bounce">
                            <span className="text-[8px] font-black text-nile-blue uppercase">Need human advice?</span>
                            <Button
                                onClick={handleRequestConsultation}
                                variant="primary"
                                size="sm"
                                className="bg-black text-white hover:bg-nile-blue"
                            >
                                <Send size={18} className="mr-2" /> REQUEST CONSULTATION
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── TWO-COLUMN LAYOUT: CV work (left) + Chat always visible (right) ── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* ── LEFT: CV upload / results ── */}
                <div className="xl:col-span-8">
                {/* ---- PRE-RESULT: Upload + Launch ---- */}
                {!resultReady ? (
                    <div className="max-w-4xl mx-auto space-y-12 py-12 text-center">
                        {/* Drop zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`cursor-pointer border-3 border-dashed rounded-[40px] p-12 flex flex-col items-center justify-center space-y-4 transition-all group
                                ${cvFile
                                    ? 'border-nile-green bg-nile-green/5'
                                    : 'border-black/20 hover:border-nile-green hover:bg-nile-green/5'}`}
                        >
                            <div className="w-24 h-24 bg-white border-4 border-black rounded-[28px] flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(108,187,86,1)] relative overflow-hidden">
                                {analyzing ? (
                                    <Loader2 size={40} className="text-nile-green animate-spin" />
                                ) : cvFile ? (
                                    <CheckCircle2 size={40} className="text-nile-green" />
                                ) : (
                                    <Upload size={40} className="text-black group-hover:text-nile-green transition-colors" />
                                )}
                            </div>
                            <div>
                                <p className="font-black uppercase text-black text-lg">
                                    {cvFile ? cvFile.name : 'Upload Your CV (PDF)'}
                                </p>
                                <p className="text-[10px] font-black text-nile-blue/30 uppercase tracking-[0.2em] mt-1">
                                    {cvFile ? 'FILE READY · CLICK TO REPLACE' : 'DRAG & DROP OR CLICK · MAX 5MB'}
                                </p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <div className="space-y-4">
                            <h3 className="text-2xl md:text-4xl font-black text-black uppercase tracking-tight leading-none">
                                {cvFile ? 'Ready to Analyse.' : 'Upload to Begin.'}
                            </h3>
                            <p className="text-[10px] md:text-xs font-black text-nile-blue/40 uppercase tracking-[0.2em] leading-relaxed max-w-md mx-auto italic">
                                "Analysis should be intentional. Once you're ready, let the Architect map your professional future."
                            </p>
                        </div>

                        <Button
                            onClick={handleAnalyze}
                            isLoading={analyzing}
                            size="lg"
                            className="px-12 md:px-20 text-xl shadow-[8px_8px_0px_0px_rgba(30,73,157,1)]"
                        >
                            {analyzing ? 'SCANNING NEURAL PATHS...' : 'LAUNCH AI ANALYSIS'}
                        </Button>

                        {/* Quick chat available before review too */}
                        <button
                            onClick={() => setShowChat(true)}
                            className="text-[10px] font-black text-nile-blue/50 hover:text-nile-green uppercase tracking-widest underline underline-offset-4 transition-colors"
                        >
                            OR ASK THE ARCHITECT DIRECTLY →
                        </button>
                    </div>
                ) : (
                    /* ---- POST-RESULT: Full Report ---- */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-4">
                        {/* LEFT: Report Card */}
                        <div className="lg:col-span-8 space-y-8 md:space-y-12">
                            {/* Executive Summary */}
                            <div className="bg-white border-3 border-black rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-8 items-start">
                                <div className="space-y-6 flex-1">
                                    <h4 className="text-xs font-black text-nile-blue/40 uppercase tracking-[0.3em]">EXECUTIVE SUMMARY</h4>
                                    <p className="text-base md:text-xl font-black text-black leading-snug uppercase">
                                        {parsed?.tip || 'AI ANALYSIS COMPLETE. REVIEW YOUR RESULTS BELOW.'}
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        {parsed?.score && <Badge label={`MATCH SCORE: ${parsed.score}/100`} />}
                                        <Badge label={`CV REVIEWED: ${cvReview.pages_parsed || 1} PAGE(S)`} />
                                        {parsed?.grade && <Badge label={`CV GRADE: ${parsed.grade}`} />}
                                    </div>
                                </div>
                                {parsed?.grade && (
                                    <div className="w-full md:w-32 flex flex-col items-center justify-center p-6 bg-black text-white rounded-[24px] border-2 border-black border-dashed">
                                        <span className="text-4xl font-black">{parsed.grade}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest mt-2">CV GRADE</span>
                                    </div>
                                )}
                            </div>

                            {/* Analysis Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {parsed?.keep && parsed.keep.length > 0 && (
                                    <AnalysisCard
                                        icon={<CheckCircle2 className="text-nile-green" />}
                                        title="WHAT TO KEEP"
                                        items={parsed.keep}
                                    />
                                )}
                                {parsed?.add && parsed.add.length > 0 && (
                                    <AnalysisCard
                                        icon={<Target className="text-nile-blue" />}
                                        title="ADD / MISSING"
                                        items={parsed.add}
                                        alert
                                    />
                                )}
                                {parsed?.fix && parsed.fix.length > 0 && (
                                    <AnalysisCard
                                        icon={<AlertCircle className="text-red-500" />}
                                        title="FIX / IMPROVE"
                                        items={parsed.fix}
                                        alert
                                    />
                                )}
                                <AnalysisCard
                                    icon={<BookOpen className="text-nile-green" />}
                                    title="NEXT ACTIONS"
                                    items={[
                                        'UPDATE CV WITH AI FEEDBACK',
                                        'COMPLETE MISSING CERTIFICATIONS',
                                        'BOOK A CAREER ADVISOR SESSION',
                                        'APPLY TO MATCHED JOB LISTINGS',
                                    ]}
                                />
                            </div>

                            {/* Full Review Text */}
                            <div className="bg-black text-white border-4 border-black rounded-[32px] md:rounded-[40px] p-8 md:p-12 shadow-[12px_12px_0px_0px_#6CBB56]">
                                <div className="flex items-center space-x-4 mb-8">
                                    <Sparkles className="text-nile-green" size={28} />
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">FULL AI REVIEW</h3>
                                </div>
                                <div className="text-[11px] md:text-xs text-white/80 leading-relaxed">
                                    {formatMarkdown(cvReview.review, 'text-white/80')}
                                </div>
                            </div>

                            {/* Upload another */}
                            <button
                                onClick={() => { setCvReview(null); setCvFile(null); }}
                                className="text-[10px] font-black text-nile-blue/50 hover:text-nile-green uppercase tracking-widest underline underline-offset-4 transition-colors"
                            >
                                ← UPLOAD A DIFFERENT CV
                            </button>
                        </div>

                        {/* RIGHT: Sidebar */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-white border-3 border-black rounded-[32px] p-8 shadow-brutalist space-y-6">
                                <div className="flex items-center space-x-3 pb-4 border-b-2 border-dashed border-black/10">
                                    <Avatar name="Career AI" size="sm" />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-black">AI ARCHITECT</p>
                                        <p className="text-[8px] font-black text-nile-blue/40 uppercase tracking-widest">PERSONALIZED INSIGHTS</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-xs font-bold text-nile-blue/70 uppercase leading-relaxed italic text-left">
                                        "Your CV has been analysed. Chat with me to explore career paths, salary benchmarks, and skill improvements."
                                    </p>
                                    <button
                                        onClick={() => setShowChat(true)}
                                        className="w-full py-4 bg-nile-blue text-white border-2 border-black rounded-xl font-black text-[10px] hover:bg-black transition-all uppercase flex items-center justify-center space-x-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        <MessageSquare size={14} />
                                        <span>CHAT WITH ARCHITECT</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-nile-green/5 border-3 border-black border-dashed rounded-[32px] p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-white border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <Zap size={28} className="text-nile-green" />
                                </div>
                                <div className="space-y-2">
                                    <h5 className="text-sm font-black text-black uppercase tracking-tight">Expert Consultation</h5>
                                    <p className="text-[10px] font-bold text-nile-blue/40 uppercase tracking-widest leading-relaxed">
                                        Get customized feedback from a professional advisor.
                                    </p>
                                </div>
                                {!requestedConsultation ? (
                                    <Button onClick={handleRequestConsultation} fullWidth size="sm" variant="outline">
                                        REQUEST HUMAN REVIEW
                                    </Button>
                                ) : (
                                    <div className="text-[10px] font-black text-nile-green uppercase tracking-widest border-2 border-nile-green py-2 rounded-xl">
                                        SYSTEM STATUS: SENT
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                </div>{/* end left column */}

                {/* ── RIGHT: Career Architect Chat — ALWAYS VISIBLE ── */}
                <div className="xl:col-span-4">
                    <div className="sticky top-20 flex flex-col bg-white border-[3px] border-black rounded-[28px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-[calc(100vh-180px)] min-h-[480px]">
                        {/* Chat header */}
                        <div className="p-4 border-b-[3px] border-black flex items-center gap-3 bg-black text-white flex-shrink-0">
                            <div className="w-9 h-9 bg-nile-green rounded-xl flex items-center justify-center border-2 border-white flex-shrink-0">
                                <Cpu size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-tight leading-none">Career Architect</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse" />
                                    <span className="text-[7px] font-black opacity-50 uppercase tracking-widest">
                                        {chatLoading ? 'THINKING...' : 'ONLINE · READY TO HELP'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-[7px] font-black text-white/30 uppercase">AI</div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-nile-white/30 custom-scrollbar">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {m.role === 'bot' && (
                                        <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mr-2 mt-auto mb-1">
                                            <Cpu size={10} className="text-nile-green" />
                                        </div>
                                    )}
                                    <div className={`max-w-[82%] px-3.5 py-3 border-2 border-black rounded-2xl text-[10px] leading-relaxed
                                        ${m.role === 'user'
                                            ? 'bg-nile-blue text-white rounded-tr-sm shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] font-black uppercase'
                                            : 'bg-white text-black rounded-tl-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold'}`}
                                    >
                                        {m.role === 'bot' ? formatMarkdown(m.text, 'text-[10px]') : m.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mr-2">
                                        <Cpu size={10} className="text-nile-green" />
                                    </div>
                                    <div className="px-4 py-3 border-2 border-black rounded-2xl rounded-tl-sm bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                                        <Loader2 size={12} className="text-nile-blue animate-spin" />
                                        <span className="text-[8px] font-black text-black/40 uppercase tracking-wider">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t-[3px] border-black bg-white flex-shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask about skills, salary, career paths..."
                                    disabled={chatLoading}
                                    className="w-full bg-nile-white border-[2px] border-black rounded-xl py-2.5 pl-4 pr-11 font-bold text-[10px] outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={chatLoading || !inputValue.trim()}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-nile-green text-white rounded-lg hover:bg-nile-blue transition-colors disabled:opacity-40 disabled:bg-black"
                                >
                                    <Send size={13} />
                                </button>
                            </div>
                            <p className="text-[7px] font-black text-black/25 uppercase tracking-widest text-center mt-2">
                                UPLOAD CV ABOVE FOR PERSONALISED ADVICE
                            </p>
                        </form>
                    </div>
                </div>
                </div>{/* end grid */}
            </div>
        </DashboardLayout>
    );
};

export default AICounselor;
