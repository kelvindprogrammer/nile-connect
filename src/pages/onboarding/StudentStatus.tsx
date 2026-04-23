import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';

const StudentStatus = () => {
    const navigate = useNavigate();

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center">
            <div className="relative z-10 w-24 h-24 bg-white border-[2px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#6CBB56] flex items-center justify-center mb-10 transition-transform hover:rotate-2">
                <GraduationCap size={48} strokeWidth={2.5} className="text-black" />
            </div>
            
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white leading-none uppercase tracking-[0.2em]">
                    GRADES .
                </h2>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em]">ACADEMIC STANDING</p>
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="space-y-12 anime-fade-in text-left">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight">STUDENT TYPE</h1>
                    <p className="text-[9px] font-black text-nile-blue uppercase tracking-[0.25em]">
                        CHOOSE YOUR ENROLLMENT STATUS
                    </p>
                </div>

                <div className="space-y-4">
                    {/* CURRENT */}
                    <button 
                        onClick={() => navigate('/register?role=student&type=current')}
                        className="w-full border-[2px] border-black rounded-2xl py-8 shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none bg-white hover:bg-nile-white/50 flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-black">CURRENT</h3>
                        <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue/50 mt-1">ACTIVE NILE UNIVERSITY EMAIL</p>
                    </button>

                    {/* ALUMNI */}
                    <button 
                        onClick={() => navigate('/register?role=student&type=alumni')}
                        className="w-full border-[2px] border-black rounded-2xl py-8 shadow-[4px_4px_0px_0px_#000] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-nile-blue active:scale-[0.98] bg-black group"
                    >
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">ALUMNI</h3>
                        <p className="text-[7px] font-black uppercase tracking-widest text-nile-blue/70 mt-1">GRADUATED PROFESSIONALS</p>
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
};

export default StudentStatus;
