import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { 
    BookOpen, CheckCircle2, Clock, Trash2, 
    ExternalLink, Plus, Zap, AlertCircle, TrendingUp,
    Play, Trophy, Star
} from 'lucide-react';
import { Button } from '../../components/Button';
import { useLearningPath, type LearningTask } from '../../hooks/useLearningPath';
import { useToast } from '../../context/ToastContext';

const LearningPath = () => {
    const { tasks, updateTaskStatus, deleteTask } = useLearningPath();
    const { showToast } = useToast();

    const stats = {
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    };

    const completionRate = tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0;

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-8 anime-fade-in text-left max-w-6xl mx-auto pb-24 md:pb-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-[2px] border-black pb-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tighter">Learning Path .</h2>
                        <p className="text-[10px] font-black text-nile-blue/50 uppercase tracking-[0.2em]">AI-DRIVEN SKILL DEVELOPMENT & TRACKING</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="nileGreen" size="sm">
                            <Plus size={14} className="mr-2" /> ADD GOAL
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard label="GOALS SET" value={tasks.length} icon={<Target size={18} />} />
                    <StatCard label="IN PROGRESS" value={stats.inProgress} icon={<Clock size={18} />} color="text-nile-blue" />
                    <StatCard label="COMPLETED" value={stats.completed} icon={<Trophy size={18} />} color="text-nile-green" />
                    <div className="bg-black text-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] flex flex-col justify-between">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50">COMPLETION RATE</p>
                        <div className="flex items-end justify-between mt-4">
                            <h4 className="text-4xl font-black">{completionRate}%</h4>
                            <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center">
                                <TrendingUp size={20} className="text-nile-green" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main List */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black/40">YOUR CURRICULUM</h3>
                            <div className="flex gap-2">
                                <button className="text-[8px] font-black uppercase tracking-widest text-nile-blue underline underline-offset-4">ACTIVE</button>
                                <button className="text-[8px] font-black uppercase tracking-widest text-black/30 hover:text-black">COMPLETED</button>
                            </div>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="py-20 text-center border-[3px] border-dashed border-black/10 rounded-[32px] bg-white space-y-4">
                                <BookOpen size={48} className="mx-auto text-black/10" strokeWidth={1.5} />
                                <div className="space-y-1">
                                    <p className="font-black text-sm uppercase text-black">Your learning path is empty</p>
                                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Upload your CV to the AI Architect to get recommendations</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.location.href = '/career/ai'}>
                                    GO TO AI ARCHITECT
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tasks.map(task => (
                                    <TaskItem 
                                        key={task.id} 
                                        task={task} 
                                        onStatusUpdate={updateTaskStatus}
                                        onDelete={deleteTask}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Side Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-nile-blue text-white border-[2px] border-black rounded-[28px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap size={18} className="text-yellow-400" fill="currentColor" />
                                <h4 className="text-sm font-black uppercase tracking-tight">AI RECOMMENDATION</h4>
                            </div>
                            <p className="text-xs font-bold text-white/70 leading-relaxed uppercase italic">
                                "Based on your interest in Software Engineering, I recommend taking the 'Advanced System Design' course on Udemy to improve your architectural skills."
                            </p>
                            <Button variant="outline" size="sm" fullWidth className="mt-6 border-white/20 text-white hover:bg-white hover:text-black">
                                <ExternalLink size={14} className="mr-2" /> BROWSE UDEMY
                            </Button>
                        </div>

                        <div className="bg-white border-[2px] border-black rounded-[28px] p-6 shadow-[4px_4px_0px_0px_rgba(30,73,157,1)]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-4">QUICK TIPS</h4>
                            <div className="space-y-4">
                                <TipItem icon={<Star size={14} />} text="Complete 2 tasks this week to earn the 'Active Learner' badge." />
                                <TipItem icon={<AlertCircle size={14} />} text="Your 'React Testing' course is 80% complete. Finish it today!" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const TaskItem = ({ task, onStatusUpdate, onDelete }: { 
    task: LearningTask, 
    onStatusUpdate: (id: string, status: LearningTask['status']) => void,
    onDelete: (id: string) => void
}) => {
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in_progress';

    return (
        <div className={`
            group flex items-start gap-4 p-5 bg-white border-[2px] border-black rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all
            ${isCompleted ? 'opacity-60 grayscale' : ''}
        `}>
            <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-black
                ${task.category === 'course' ? 'bg-nile-blue text-white' : 'bg-yellow-400 text-black'}
            `}>
                {task.category === 'course' ? <Play size={20} /> : <Zap size={20} />}
            </div>

            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-sm uppercase truncate leading-none">{task.title}</p>
                    <span className="text-[7px] font-black px-2 py-0.5 bg-black/5 rounded-full border border-black/10 uppercase tracking-widest">
                        {task.source}
                    </span>
                </div>
                <p className="text-[9px] font-black text-black/30 uppercase mt-1.5 tracking-widest">
                    RECOMMENDED ON {new Date(task.recommendedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
                </p>
                
                <div className="flex gap-2 mt-4">
                    {!isCompleted && (
                        <>
                            {isInProgress ? (
                                <Button size="xs" variant="nileGreen" onClick={() => onStatusUpdate(task.id, 'completed')}>
                                    <CheckCircle2 size={12} className="mr-1.5" /> MARK DONE
                                </Button>
                            ) : (
                                <Button size="xs" variant="nileBlue" onClick={() => onStatusUpdate(task.id, 'in_progress')}>
                                    <Play size={12} className="mr-1.5" /> START
                                </Button>
                            )}
                        </>
                    )}
                    {isCompleted && (
                        <p className="text-[8px] font-black text-nile-green uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <CheckCircle2 size={12} /> COMPLETED
                        </p>
                    )}
                </div>
            </div>

            <button 
                onClick={() => onDelete(task.id)}
                className="p-2 text-black/10 hover:text-red-500 transition-colors"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

const StatCard = ({ label, value, icon, color = 'text-black' }: { label: string, value: number, icon: React.ReactNode, color?: string }) => (
    <div className="bg-white border-[2px] border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg bg-nile-white border border-black/10 ${color}`}>{icon}</div>
            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">{label}</p>
        </div>
        <h4 className="text-4xl font-black text-black">{value}</h4>
    </div>
);

const TipItem = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex gap-3 items-start">
        <div className="p-1.5 bg-black text-white rounded-lg border border-black flex-shrink-0">
            {icon}
        </div>
        <p className="text-[9px] font-bold text-black/60 uppercase leading-relaxed tracking-wider">{text}</p>
    </div>
);

const Target = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);

export default LearningPath;
