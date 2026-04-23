import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, GraduationCap, Briefcase, Building } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';

const JoinAs = () => {
    const navigate = useNavigate();

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center">
            <div className="relative z-10 w-24 h-24 bg-white border-[2px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] flex items-center justify-center mb-10 transition-transform hover:-rotate-6">
                <UserRound size={48} strokeWidth={2.5} className="text-black" />
            </div>
            
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white leading-none uppercase tracking-[0.2em]">
                    PROFILES .
                </h2>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em]">WHO ARE YOU?</p>
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="space-y-10 anime-fade-in text-left">
                {/* Heading */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight">JOIN AS...</h1>
                    <p className="text-[9px] font-black text-nile-blue uppercase tracking-[0.25em]">
                        SELECT YOUR USER TYPE
                    </p>
                </div>

                {/* Selection Buttons */}
                <div className="space-y-4">
                    {/* Student */}
                    <div 
                        onClick={() => navigate('/student-status')}
                        className="w-full border-[2px] border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-white/50 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                        <div className="w-11 h-11 border-[2px] border-black rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:bg-nile-blue group-hover:text-white transition-colors">
                            <GraduationCap size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-black uppercase tracking-widest text-black leading-none">STUDENT</h3>
                            <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue mt-1">CURRENT OR ALUMNI</p>
                        </div>
                    </div>

                    {/* Staff */}
                    <div 
                        onClick={() => navigate('/register?role=staff')}
                        className="w-full border-[2px] border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-green/10 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                        <div className="w-11 h-11 border-[2px] border-black rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:bg-nile-green transition-colors">
                            <Briefcase size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-black uppercase tracking-widest text-black leading-none">STAFF</h3>
                            <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue mt-1">ADMIN & SERVICES</p>
                        </div>
                    </div>

                    {/* Employer */}
                    <div 
                        onClick={() => navigate('/register?role=employer')}
                        className="w-full border-[2px] border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-blue/10 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                        <div className="w-11 h-11 border-[2px] border-black rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:bg-nile-blue transition-colors group-hover:text-white">
                            <Building size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-black uppercase tracking-widest text-black leading-none">EMPLOYER</h3>
                            <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue mt-1">COMPANY PARTNERS</p>
                        </div>
                    </div>
                </div>

                {/* Footer Sign In */}
                <div className="pt-6 border-t-[2px] border-black/5 text-center">
                    <button 
                        onClick={() => navigate('/login')} 
                        className="text-[9px] font-black text-nile-blue/40 hover:text-black transition-colors uppercase tracking-[0.2em] border-b-[1px] border-transparent hover:border-black/20 pb-0.5"
                    >
                        ALREADY HAVE AN ACCOUNT? SIGN IN
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
};

export default JoinAs;
