import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Upload, Calendar, Video, ArrowUpRight, BookOpen, Award, Star, ChevronRight, Cpu, Sparkles } from 'lucide-react';

const CareerCenter = () => {
    const navigate = useNavigate();
    const [cvUploaded, setCvUploaded] = useState(false);

    return (
        <DashboardLayout>
            <div className="p-10 space-y-10 font-sans bg-nile-white min-h-full">
                {/* Header */}
                <div>
                    <h2 className="text-6xl font-black text-black leading-none uppercase">Careers .</h2>
                    <p className="text-lg font-bold text-nile-blue/70 uppercase mt-2">Accelerate your professional readiness .</p>
                </div>

                {/* Career Readiness Banner */}
                <div className="bg-nile-green text-nile-white p-10 rounded-[40px] border-3 border-black shadow-brutalist flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-5 flex-1">
                        <p className="text-xs font-black text-nile-blue/70 uppercase tracking-[0.3em]">OVERALL READINESS</p>
                        <h3 className="text-4xl font-black">CV CAREER READINESS</h3>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 h-4 bg-white/20 rounded-full border-2 border-white/40 overflow-hidden">
                                <div className="h-full bg-nile-green rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <span className="font-black text-nile-green text-xl">75%</span>
                        </div>
                        <p className="text-sm font-bold text-nile-blue/70">COMPLETE YOUR PROFILE TO UNLOCK MORE OPPORTUNITIES .</p>
                    </div>
                    <button className="bg-nile-green text-white font-black py-5 px-10 rounded-full border-3 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase whitespace-nowrap">
                        BOOK ADVISOR
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {/* CV Upload / AI Link */}
                    <div className="bg-white p-10 rounded-[40px] border-3 border-black shadow-brutalist space-y-8 text-left">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-black uppercase tracking-tighter">AI Architect .</h3>
                            <div className="w-12 h-12 bg-nile-green text-white rounded-2xl border-3 border-black shadow-brutalist-sm flex items-center justify-center">
                                <Cpu size={22} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/student/career/ai')}
                            className="aspect-video border-3 border-black border-dashed rounded-[30px] flex flex-col items-center justify-center space-y-4 cursor-pointer md:hover:bg-nile-green/10 transition-all group"
                        >
                            <Sparkles size={48} strokeWidth={2} className="text-nile-blue/50 group-hover:text-nile-green group-hover:scale-110 transition-all" />
                            <div className="text-center">
                                <p className="font-black uppercase text-black">Scan & Evolve</p>
                                <p className="text-[10px] font-black text-nile-blue/30 uppercase tracking-[0.2em] mt-1">AI-Powered Career Mapping</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/student/career/ai')}
                            className="w-full bg-nile-green text-white font-black py-5 rounded-full border-3 border-black shadow-brutalist-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase lg:text-sm"
                        >
                            LAUNCH NEURAL ANALYSIS
                        </button>
                    </div>

                    {/* Right Column: Mock Interview + Events */}
                    <div className="space-y-8">
                        {/* Mock Interview */}
                        <div className="bg-white p-10 rounded-[40px] border-3 border-black shadow-brutalist">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-nile-white uppercase">Mock Interview .</h3>
                                <div className="w-12 h-12 bg-nile-green text-nile-white rounded-2xl border-3 border-black shadow-brutalist-sm flex items-center justify-center">
                                    <Video size={22} strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="font-bold text-nile-blue/70 uppercase text-sm mb-8 leading-snug">PRACTICE ANSWERING COMMON INTERVIEW QUESTIONS WITH OUR AI COACH .</p>
                            <button className="w-full bg-nile-blue text-white font-black py-5 rounded-full border-3 border-black shadow-brutalist-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase flex items-center justify-center space-x-3">
                                <span>START SESSION</span>
                                <ArrowUpRight size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Upcoming Advisor Sessions */}
                        <div className="bg-white p-10 rounded-[40px] border-3 border-black shadow-brutalist">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-nile-white uppercase">Advisors .</h3>
                                <button className="text-sm font-black underline underline-offset-4">SEE ALL</button>
                            </div>
                            <div className="space-y-4">
                                <AdvisorCard name="Dr. Amara Osei" speciality="CV & Portfolio Review" time="FRI 2PM" rating={4.9} />
                                <AdvisorCard name="Mr. Kelvin Eze" speciality="Tech Career Coaching" time="SAT 10AM" rating={4.7} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const AdvisorCard = ({ name, speciality, time, rating }: { name: string, speciality: string, time: string, rating: number }) => (
    <div className="flex items-center justify-between p-5 border-3 border-black rounded-[25px] hover:translate-x-1 transition-all shadow-brutalist-sm group cursor-pointer">
        <div className="flex items-center space-x-5">
            <div className="w-12 h-12 rounded-full border-3 border-black bg-nile-white flex items-center justify-center font-black text-base">
                {name.split(' ').map(w => w[0]).join('')}
            </div>
            <div>
                <p className="font-black text-black text-sm uppercase leading-none mb-1">{name}</p>
                <p className="text-[9px] font-black text-nile-blue/70 uppercase tracking-widest">{speciality}</p>
            </div>
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
                <Star size={12} strokeWidth={3} className="text-yellow-400" fill="#facc15" />
                <span className="text-[9px] font-black">{rating}</span>
            </div>
            <span className="text-[9px] font-black bg-nile-green text-white px-3 py-1 rounded-full uppercase">{time}</span>
            <ChevronRight size={16} strokeWidth={3} className="text-nile-blue/50" />
        </div>
    </div>
);

export default CareerCenter;
