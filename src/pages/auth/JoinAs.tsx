import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, GraduationCap, Briefcase, Building } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';

const JoinAs = () => {
    const navigate = useNavigate();

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center">
            <div className="relative z-10 w-24 h-24 bg-white border-[2px] border-paper-400 rounded-xl shadow-[4px_4px_0px_0px_#000] flex items-center justify-center mb-10 transition-transform hover:-rotate-6">
                <UserRound size={48} strokeWidth={2.5} className="text-ink-800" />
            </div>
            
            <div className="space-y-1">
                <h2 className="co-display text-3xl text-white leading-tight">Profiles</h2>
                <p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.14em]">Who are you</p>
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="space-y-10 anime-fade-in text-left">
                {/* Heading */}
                <div className="space-y-2">
                    <h1 className="co-display text-4xl text-ink-800">Join as</h1>
                    <p className="text-[11px] font-semibold text-nile-blue uppercase tracking-[0.14em]">
                        Select your user type
                    </p>
                </div>

                {/* Selection Buttons */}
                <div className="space-y-4">
                    {/* Student */}
                    <div 
                        onClick={() => navigate('/student-status')}
                        className="w-full border-[2px] border-paper-400 rounded-xl p-4 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-white/50 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                        <div className="w-11 h-11 border-[2px] border-paper-400 rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:bg-nile-blue group-hover:text-white transition-colors">
                            <GraduationCap size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold tracking-tight text-ink-800 leading-none">STUDENT</h3>
                            <p className="text-[7px] font-semibold tracking-tight text-nile-blue mt-1">CURRENT OR ALUMNI</p>
                        </div>
                    </div>

                    {/* Staff */}
                    <div 
                        onClick={() => navigate('/register?role=staff')}
                        className="w-full border-[2px] border-paper-400 rounded-xl p-4 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-green/10 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                        <div className="w-11 h-11 border-[2px] border-paper-400 rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:bg-nile-green transition-colors">
                            <Briefcase size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold tracking-tight text-ink-800 leading-none">STAFF</h3>
                            <p className="text-[7px] font-semibold tracking-tight text-nile-blue mt-1">ADMIN & SERVICES</p>
                        </div>
                    </div>

                    {/* Employer */}
                    <div 
                        onClick={() => navigate('/register?role=employer')}
                        className="w-full border-[2px] border-paper-400 rounded-xl p-4 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-blue/10 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                        <div className="w-11 h-11 border-[2px] border-paper-400 rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:bg-nile-blue transition-colors group-hover:text-white">
                            <Building size={18} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold tracking-tight text-ink-800 leading-none">EMPLOYER</h3>
                            <p className="text-[7px] font-semibold tracking-tight text-nile-blue mt-1">COMPANY PARTNERS</p>
                        </div>
                    </div>
                </div>

                {/* Footer Sign In */}
                <div className="pt-6 border-t-[2px] border-paper-400/5 text-center">
                    <button 
                        onClick={() => navigate('/login')} 
                        className="text-[11px] font-semibold text-nile-blue/40 hover:text-ink-800 transition-colors uppercase tracking-[0.14em] border-b-[1px] border-transparent hover:border-paper-400/20 pb-0.5"
                    >
                        ALREADY HAVE AN ACCOUNT? SIGN IN
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
};

export default JoinAs;
