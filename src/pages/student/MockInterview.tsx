import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    ArrowLeft, Mic, MicOff, Send, Loader2, CheckCircle2, RefreshCw,
    Video, ChevronRight, Star, Award, MessageSquare, Brain,
} from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage, type ChatMessage } from '../../services/aiService';
import { formatMarkdown } from '../../utils/formatMarkdown';

type InterviewType = 'behavioral' | 'technical' | 'hr' | 'case';
type Phase = 'setup' | 'interview' | 'feedback';

interface QA {
    question: string;
    answer: string;
    feedback: string;
    score: number;
}

const interviewTypes: { id: InterviewType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    { id: 'behavioral', label: 'Behavioral', desc: 'STAR method questions about past experience', icon: <MessageSquare size={22} />, color: 'bg-nile-blue text-white' },
    { id: 'technical', label: 'Technical', desc: 'Problem-solving & coding concepts', icon: <Brain size={22} />, color: 'bg-black text-white' },
    { id: 'hr', label: 'HR Round', desc: 'Culture fit, motivation & career goals', icon: <Star size={22} />, color: 'bg-nile-green text-white' },
    { id: 'case', label: 'Case Study', desc: 'Business problem-solving & analysis', icon: <Award size={22} />, color: 'bg-yellow-400 text-black' },
];

const SYSTEM_PROMPT = (type: InterviewType, role: string) =>
    `You are an expert ${type} interviewer conducting a mock interview for a ${role || 'recent graduate'} position.
Your job:
1. Ask ONE focused ${type} interview question at a time.
2. After the candidate answers, provide structured feedback: score (1-10), what was good, what to improve.
3. Then ask the next question (max 5 questions per session).
4. Keep responses professional, concise, and encouraging.
5. Format feedback clearly with sections: Score, Strengths, Improvements, Tip.
Start by asking your first question now. Do not include meta-commentary, just the question.`;

const MockInterview = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [phase, setPhase] = useState<Phase>('setup');
    const [interviewType, setInterviewType] = useState<InterviewType>('behavioral');
    const [role, setRole] = useState('');
    const [questionCount, setQuestionCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [qas, setQas] = useState<QA[]>([]);
    const [awaitingFeedback, setAwaitingFeedback] = useState(false);
    const answerRef = useRef<HTMLTextAreaElement>(null);

    const startInterview = async () => {
        setIsLoading(true);
        setPhase('interview');
        const systemMsg: ChatMessage = { role: 'user', content: SYSTEM_PROMPT(interviewType, role) };
        const newHistory = [systemMsg];

        try {
            const resp = await sendChatMessage(
                SYSTEM_PROMPT(interviewType, role),
                [],
                { full_name: user?.name, major: user?.major }
            );
            const question = resp.reply;
            setCurrentQuestion(question);
            setHistory([...newHistory, { role: 'assistant', content: question }]);
            setQuestionCount(1);
        } catch {
            showToast('Failed to start interview. Check your connection.', 'error');
            setPhase('setup');
        } finally {
            setIsLoading(false);
        }
    };

    const submitAnswer = async () => {
        const answer = currentAnswer.trim();
        if (!answer || isLoading) return;

        setIsLoading(true);
        setAwaitingFeedback(true);
        const newHistory: ChatMessage[] = [
            ...history,
            { role: 'user', content: answer },
        ];

        try {
            const feedbackResp = await sendChatMessage(
                `My answer: ${answer}\n\nPlease provide structured feedback (Score /10, Strengths, Areas to Improve, Quick Tip), then immediately ask the next interview question.`,
                newHistory,
                { full_name: user?.name, major: user?.major }
            );

            const feedbackText = feedbackResp.reply;
            const scoreMatch = feedbackText.match(/(\d+)\s*\/\s*10/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;

            const newQA: QA = {
                question: currentQuestion,
                answer,
                feedback: feedbackText,
                score,
            };
            setQas(prev => [...prev, newQA]);

            const updatedHistory: ChatMessage[] = [
                ...newHistory,
                { role: 'assistant', content: feedbackText },
            ];

            if (questionCount >= 5) {
                setHistory(updatedHistory);
                setPhase('feedback');
            } else {
                const nextQuestionResp = await sendChatMessage(
                    'Now ask the next interview question.',
                    updatedHistory,
                    { full_name: user?.name, major: user?.major }
                );
                setCurrentQuestion(nextQuestionResp.reply);
                setHistory([...updatedHistory, { role: 'assistant', content: nextQuestionResp.reply }]);
                setCurrentAnswer('');
                setQuestionCount(prev => prev + 1);
            }
        } catch {
            showToast('AI response failed. Try again.', 'error');
        } finally {
            setIsLoading(false);
            setAwaitingFeedback(false);
        }
    };

    const avgScore = qas.length > 0
        ? Math.round(qas.reduce((s, q) => s + q.score, 0) / qas.length)
        : 0;

    useEffect(() => {
        if (phase === 'interview' && answerRef.current) {
            answerRef.current.focus();
        }
    }, [phase, currentQuestion]);

    if (phase === 'setup') {
        return (
            <DashboardLayout>
                <div className="p-4 md:p-10 space-y-8 font-sans bg-nile-white min-h-full pb-24 text-left anime-fade-in">
                    <div className="flex items-center gap-4 border-b-[2px] border-black pb-6">
                        <button onClick={() => navigate('/student/career')} className="p-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all">
                            <ArrowLeft size={18} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tighter">Mock Interview .</h2>
                            <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-widest mt-1">AI-Powered Interview Simulator</p>
                        </div>
                    </div>

                    <div className="max-w-2xl space-y-8">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-black/50">SELECT INTERVIEW TYPE</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {interviewTypes.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setInterviewType(t.id)}
                                        className={`p-4 md:p-5 border-[2px] border-black rounded-[20px] text-left transition-all
                                            ${interviewType === t.id
                                                ? 'shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] translate-x-[-2px] translate-y-[-2px]'
                                                : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'}
                                            bg-white`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center mb-3 ${t.color}`}>
                                            {t.icon}
                                        </div>
                                        <p className="font-black text-sm uppercase text-black">{t.label}</p>
                                        <p className="text-[8px] font-bold text-nile-blue/50 uppercase tracking-widest mt-1">{t.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-black uppercase tracking-widest">Target Role (optional)</label>
                            <input
                                type="text"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                placeholder="e.g. Software Engineer at Google"
                                className="w-full border-[2px] border-black rounded-xl py-3 px-4 font-bold text-sm outline-none focus:shadow-[3px_3px_0px_0px_#1E499D] transition-all bg-nile-white/40"
                            />
                        </div>

                        <div className="bg-nile-blue/5 border-[2px] border-dashed border-nile-blue/20 rounded-[20px] p-5 space-y-2">
                            <p className="text-[9px] font-black text-nile-blue uppercase tracking-widest">WHAT TO EXPECT</p>
                            <ul className="space-y-1.5">
                                {['5 curated questions based on your type', 'AI evaluates each answer in real time', 'Detailed feedback with score and tips', 'Overall performance report at the end'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-black/70 uppercase">
                                        <CheckCircle2 size={12} className="text-nile-green flex-shrink-0" strokeWidth={3} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button
                            onClick={startInterview}
                            isLoading={isLoading}
                            size="lg"
                            fullWidth
                            className="shadow-[6px_6px_0px_0px_rgba(30,73,157,1)]"
                        >
                            <Video size={18} className="mr-2" />
                            {isLoading ? 'PREPARING SESSION...' : 'START INTERVIEW'}
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (phase === 'feedback') {
        const scoreColor = avgScore >= 8 ? 'text-nile-green' : avgScore >= 6 ? 'text-nile-blue' : 'text-red-500';
        return (
            <DashboardLayout>
                <div className="p-4 md:p-10 space-y-8 font-sans bg-nile-white min-h-full pb-24 text-left anime-fade-in">
                    <div className="flex items-center gap-4 border-b-[2px] border-black pb-6">
                        <button onClick={() => navigate('/student/career')} className="p-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all">
                            <ArrowLeft size={18} strokeWidth={3} />
                        </button>
                        <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tighter">Session Report .</h2>
                    </div>

                    <div className="bg-white border-[2px] border-black rounded-[28px] p-6 md:p-10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-8 items-center">
                        <div className="text-center md:text-left space-y-2">
                            <p className="text-[9px] font-black text-black/40 uppercase tracking-widest">OVERALL SCORE</p>
                            <p className={`text-7xl md:text-9xl font-black leading-none ${scoreColor}`}>{avgScore}<span className="text-3xl">/10</span></p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
                                {avgScore >= 8 ? 'EXCELLENT PERFORMANCE' : avgScore >= 6 ? 'GOOD EFFORT — ROOM TO GROW' : 'KEEP PRACTISING'}
                            </p>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-nile-blue/5 rounded-[16px] border-2 border-black/5">
                                <p className="text-2xl font-black text-nile-blue">{qas.length}</p>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-1">QUESTIONS</p>
                            </div>
                            <div className="text-center p-4 bg-nile-green/5 rounded-[16px] border-2 border-black/5">
                                <p className="text-2xl font-black text-nile-green">{qas.filter(q => q.score >= 7).length}</p>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-1">STRONG</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-[16px] border-2 border-black/5">
                                <p className="text-2xl font-black text-red-500">{qas.filter(q => q.score < 7).length}</p>
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-1">IMPROVE</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {qas.map((qa, i) => (
                            <div key={i} className="bg-white border-[2px] border-black rounded-[20px] p-5 md:p-6 space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-[8px] font-black text-nile-blue/50 uppercase tracking-widest mb-1">Q{i + 1}</p>
                                        <p className="font-black text-sm text-black uppercase leading-snug">{qa.question}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center font-black text-sm flex-shrink-0
                                        ${qa.score >= 8 ? 'bg-nile-green text-white' : qa.score >= 6 ? 'bg-nile-blue text-white' : 'bg-red-100 text-red-600'}`}>
                                        {qa.score}
                                    </div>
                                </div>
                                <div className="bg-nile-white p-4 rounded-xl border border-black/10">
                                    <p className="text-[9px] font-black text-black/40 uppercase tracking-widest mb-2">YOUR ANSWER</p>
                                    <p className="text-[10px] font-bold text-black/70 leading-relaxed">{qa.answer}</p>
                                </div>
                                <div className="bg-nile-blue/5 p-4 rounded-xl border border-nile-blue/10 text-[10px] text-nile-blue font-bold">
                                    <p className="text-[9px] font-black text-nile-blue uppercase tracking-widest mb-2">AI FEEDBACK</p>
                                    {formatMarkdown(qa.feedback, 'text-[10px] font-bold text-nile-blue/80')}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => { setPhase('setup'); setQas([]); setHistory([]); setCurrentAnswer(''); setQuestionCount(0); }} variant="outline" fullWidth>
                            <RefreshCw size={14} className="mr-2" /> NEW SESSION
                        </Button>
                        <Button onClick={() => navigate('/student/career')} fullWidth>
                            <ChevronRight size={14} className="mr-2" /> DONE
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 font-sans bg-nile-white min-h-full pb-24 text-left anime-fade-in flex flex-col gap-6">
                <div className="flex items-center justify-between border-b-[2px] border-black pb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/student/career')} className="p-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all">
                            <ArrowLeft size={16} strokeWidth={3} />
                        </button>
                        <div>
                            <p className="text-[8px] font-black text-nile-blue/50 uppercase tracking-widest">{interviewType.toUpperCase()} INTERVIEW</p>
                            <h2 className="text-xl md:text-2xl font-black text-black uppercase leading-none">Question {questionCount} of 5</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {[1,2,3,4,5].map(n => (
                            <div key={n} className={`w-2 h-2 md:w-3 md:h-3 rounded-full border-2 border-black transition-all
                                ${n < questionCount ? 'bg-nile-green' : n === questionCount ? 'bg-nile-blue' : 'bg-black/10'}`} />
                        ))}
                    </div>
                </div>

                <div className="bg-nile-blue text-white border-[2px] border-black rounded-[24px] p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-nile-green rounded-full animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">AI INTERVIEWER</span>
                    </div>
                    {isLoading && !currentQuestion ? (
                        <div className="flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm font-bold uppercase opacity-70">Preparing your question...</span>
                        </div>
                    ) : (
                        <p className="text-base md:text-xl font-black uppercase leading-snug tracking-tight">{currentQuestion}</p>
                    )}
                </div>

                {awaitingFeedback && (
                    <div className="bg-nile-white border-[2px] border-black rounded-[20px] p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3">
                            <Loader2 size={18} className="animate-spin text-nile-blue" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-nile-blue">AI is evaluating your answer...</span>
                        </div>
                    </div>
                )}

                {!awaitingFeedback && currentQuestion && (
                    <div className="flex-1 space-y-4">
                        <textarea
                            ref={answerRef}
                            value={currentAnswer}
                            onChange={e => setCurrentAnswer(e.target.value)}
                            placeholder="Type your answer here... Be specific and use examples where possible."
                            className="w-full h-40 md:h-52 border-[2px] border-black rounded-[20px] p-5 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#1E499D] transition-all bg-white resize-none"
                            disabled={isLoading}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && e.ctrlKey) submitAnswer();
                            }}
                        />
                        <div className="flex gap-3">
                            <Button
                                onClick={submitAnswer}
                                isLoading={isLoading}
                                fullWidth
                                size="lg"
                                className="shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]"
                            >
                                <Send size={16} className="mr-2" />
                                {questionCount < 5 ? 'SUBMIT ANSWER' : 'FINISH & GET REPORT'}
                            </Button>
                        </div>
                        <p className="text-[8px] font-black text-black/30 uppercase tracking-widest text-center">Press Ctrl+Enter to submit</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MockInterview;
