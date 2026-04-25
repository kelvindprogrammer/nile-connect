import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Upload, Video, ArrowUpRight, BookOpen, Star, ChevronRight, Cpu, Sparkles } from 'lucide-react';

const CareerCenter = () => {
    const navigate = useNavigate();

    return (
        <DashboardLayout>
            <div className="p-4 md:p-10 space-y-6 md:space-y-10 font-sans bg-nile-white min-h-full pb-20">
                {/* Header */}
                <div className="border-b-[2px] border-black pb-6 md:pb-8">
                    <h2 className="text-3xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Careers .</h2>
                    <p className="text-[10px] md:text-lg font-bold text-nile-blue/70 uppercase mt-2 tracking-widest">Accelerate your professional readiness .</p>
                </div>

                {/* Career Readiness Banner */}
                <div className="bg-nile-green text-white p-6 md:p-10 rounded-[28px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[4px_4px_0px_0px_#000] md:shadow-brutalist flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
                    <div className="space-y-4 md:space-y-5 flex-1">
                        <p className="text-[9px] md:text-xs font-black text-white/60 uppercase tracking-[0.3em]">OVERALL READINESS</p>
                        <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">CV Career Readiness</h3>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 h-3 bg-white/20 rounded-full border border-white/30 overflow-hidden max-w-xs">
                                <div className="h-full bg-white rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <span className="font-black text-white text-lg">75%</span>
                        </div>
                        <p className="text-[9px] md:text-xs font-bold text-white/70 uppercase tracking-widest">COMPLETE YOUR PROFILE TO UNLOCK MORE OPPORTUNITIES.</p>
                    </div>
                    <button className="bg-white text-nile-green font-black py-3 md:py-4 px-6 md:px-8 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] md:text-xs whitespace-nowrap flex-shrink-0">
                        BOOK ADVISOR
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10">
                    {/* AI Architect Card */}
                    <div className="bg-white p-6 md:p-10 rounded-[28px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[4px_4px_0px_0px_#000] md:shadow-brutalist space-y-6 md:space-y-8 text-left">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl md:text-2xl font-black text-black uppercase tracking-tighter">AI Architect .</h3>
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-nile-green text-white rounded-xl md:rounded-2xl border-[2px] border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center flex-shrink-0">
                                <Cpu size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/student/career/ai')}
                            className="aspect-video border-[2px] md:border-3 border-black border-dashed rounded-[20px] md:rounded-[30px] flex flex-col items-center justify-center space-y-4 cursor-pointer hover:bg-nile-green/5 transition-all group"
                        >
                            <Sparkles size={40} strokeWidth={2} className="text-nile-blue/40 group-hover:text-nile-green group-hover:scale-110 transition-all" />
                            <div className="text-center">
                                <p className="font-black uppercase text-black text-sm">Scan &amp; Evolve</p>
                                <p className="text-[9px] md:text-[10px] font-black text-nile-blue/30 uppercase tracking-[0.2em] mt-1">AI-Powered Career Mapping</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/student/career/ai')}
                            className="w-full bg-nile-green text-white font-black py-4 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] md:text-xs tracking-widest"
                        >
                            LAUNCH NEURAL ANALYSIS
                        </button>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6 md:space-y-8">
                        {/* Mock Interview */}
                        <div className="bg-white p-6 md:p-8 rounded-[28px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[4px_4px_0px_0px_#000] md:shadow-brutalist">
                            <div className="flex justify-between items-center mb-5 md:mb-6">
                                <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-tighter">Mock Interview .</h3>
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-nile-blue text-white rounded-xl md:rounded-2xl border-[2px] border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center flex-shrink-0">
                                    <Video size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="font-bold text-nile-blue/70 uppercase text-[10px] md:text-xs mb-6 leading-relaxed tracking-wider">
                                PRACTICE ANSWERING COMMON INTERVIEW QUESTIONS WITH OUR AI COACH.
                            </p>
                            <button className="w-full bg-nile-blue text-white font-black py-3 md:py-4 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center space-x-2">
                                <span>START SESSION</span>
                                <ArrowUpRight size={16} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Upcoming Advisor Sessions */}
                        <div className="bg-white p-6 md:p-8 rounded-[28px] md:rounded-[40px] border-[2px] md:border-3 border-black shadow-[4px_4px_0px_0px_#000] md:shadow-brutalist">
                            <div className="flex justify-between items-center mb-5 md:mb-6">
                                <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-tighter">Advisors .</h3>
                                <button className="text-[9px] md:text-[10px] font-black text-nile-blue underline underline-offset-4 hover:text-nile-green transition-colors uppercase tracking-widest">SEE ALL</button>
                            </div>
                            <div className="space-y-3 md:space-y-4">
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
    <div className="flex items-center justify-between p-4 md:p-5 border-[2px] border-black rounded-[20px] hover:translate-x-[2px] transition-all shadow-[2px_2px_0px_0px_#000] group cursor-pointer hover:shadow-none hover:translate-y-[2px]">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
            <div className="w-10 h-10 rounded-full border-[2px] border-black bg-nile-blue text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                {name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="min-w-0">
                <p className="font-black text-black text-[11px] md:text-xs uppercase leading-none mb-1 truncate">{name}</p>
                <p className="text-[8px] md:text-[9px] font-black text-nile-blue/60 uppercase tracking-widest truncate">{speciality}</p>
            </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0 ml-3">
            <div className="hidden sm:flex items-center space-x-1">
                <Star size={11} strokeWidth={3} className="text-yellow-400" fill="#facc15" />
                <span className="text-[8px] font-black">{rating}</span>
            </div>
            <span className="text-[8px] md:text-[9px] font-black bg-nile-green text-white px-2 md:px-3 py-1 rounded-full uppercase border border-black">{time}</span>
            <ChevronRight size={14} strokeWidth={3} className="text-nile-blue/40 hidden sm:block" />
        </div>
    </div>
);

export default CareerCenter;
