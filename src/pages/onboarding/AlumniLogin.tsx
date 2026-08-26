import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';

const AlumniLogin = () => {
    const navigate = useNavigate();
    const [studentId, setStudentId] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/student');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-nile-white p-4 md:p-8 font-sans">
            {/* Card Container */}
            <div className="w-full max-w-5xl flex flex-col md:flex-row bg-white border-3 border-paper-400 shadow-soft-sm rounded-[40px] overflow-hidden min-h-[500px] anime-fade-in relative">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/onboarding')}
                    className="absolute top-6 left-6 z-30 w-11 h-11 bg-white border-3 border-paper-400 rounded-xl shadow-soft-xs flex items-center justify-center hover:-translate-y-0.5 hover:shadow-soft-sm transition-all"
                >
                    <ArrowLeft size={18} strokeWidth={3} />
                </button>

                {/* Left Panel — Gray with organic shapes */}
                <div className="w-full md:w-[45%] bg-nile-blue text-white border-r-3 border-paper-400 flex flex-col items-center justify-center p-16 relative overflow-hidden">
                    {/* Organic blob shapes in background */}
                    <div className="absolute top-6 right-6 w-44 h-32 bg-nile-white/20 border-white rounded-[50%_30%_60%_40%] border-2 border-paper-400/20 rotate-12"></div>
                    <div className="absolute bottom-8 left-4 w-52 h-52 bg-nile-white/20 border-white rounded-full border-2 border-paper-400/20"></div>
                    <div className="absolute top-32 left-20 w-28 h-20 bg-nile-white/20 border-white rounded-[40%_60%_40%_60%] border-2 border-paper-400/20 -rotate-6"></div>

                    {/* Login Icon Box */}
                    <div className="relative z-10 w-[140px] h-[140px] bg-white border-3 border-paper-400 rounded-[28px] shadow-soft-sm flex items-center justify-center mb-10">
                        <LogIn size={64} strokeWidth={2} className="text-ink-800 ml-2" />
                    </div>

                    <p className="relative z-10 text-2xl font-semibold text-nile-white uppercase tracking-[0.14em]">ALUMNI ACCESS</p>
                </div>

                {/* Right Panel — Form */}
                <div className="flex-1 flex flex-col justify-center p-12 md:p-16 space-y-10">
                    {/* Heading */}
                    <div className="space-y-3">
                        <h1 className="co-display text-4xl md:text-5xl text-ink-800">Alumni login</h1>
                        <p className="text-sm font-semibold text-nile-blue uppercase tracking-[0.14em]">
                            Verify your past enrolment
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Student ID */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-ink-800 uppercase tracking-[0.14em]">
                                USERNAME / ID
                            </label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={e => setStudentId(e.target.value)}
                                placeholder="Student ID"
                                required
                                className="w-full py-4 px-6 rounded-[16px] border-3 border-paper-400 font-bold text-sm outline-none focus:shadow-soft-xs focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-all placeholder:text-nile-blue/70 bg-white"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-ink-800 uppercase tracking-[0.14em]">
                                PERSONAL EMAIL
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="email@provider.com"
                                required
                                className="w-full py-4 px-6 rounded-[16px] border-3 border-paper-400 font-bold text-sm outline-none focus:shadow-soft-xs focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-all placeholder:text-nile-blue/70 bg-white"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-nile-green text-nile-white font-semibold py-5 rounded-[16px] border-3 border-paper-400 shadow-soft-sm hover:-translate-y-0.5 hover:shadow-soft-sm active:scale-95 transition-all text-sm tracking-tight mt-4"
                        >
                            LOGIN
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AlumniLogin;
