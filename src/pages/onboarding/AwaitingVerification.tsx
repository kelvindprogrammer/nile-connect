import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowLeft, Home } from 'lucide-react';
import Button from '../../components/Button';

const AwaitingVerification = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-nile-white p-4 md:p-8 font-sans">
            <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[40px] overflow-hidden min-h-[500px] anime-fade-in relative text-left">

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-30 w-11 h-11 bg-white border-[2px] border-black rounded-lg shadow-sm flex items-center justify-center hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none transition-all"
                >
                    <ArrowLeft size={16} strokeWidth={3} />
                </button>

                {/* Left Panel */}
                <div className="w-full md:w-[45%] bg-nile-blue text-white border-r-[2px] border-black flex flex-col items-center justify-center p-16 relative overflow-hidden text-center">
                    <div className="absolute top-6 right-6 w-44 h-32 bg-nile-white/20 rounded-[50%_30%_60%_40%] border-2 border-nile-white/10 rotate-12"></div>
                    <div className="absolute bottom-8 left-4 w-52 h-52 bg-nile-white/20 rounded-full border-2 border-nile-white/10"></div>

                    {/* Shield Icon Box */}
                    <div className="relative z-10 w-[100px] h-[100px] bg-white border-[2px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#6CBB56] flex items-center justify-center mb-8">
                        <ShieldCheck size={48} strokeWidth={2} className="text-black" />
                    </div>

                    <p className="relative z-10 text-xl font-black text-nile-white uppercase tracking-[0.25em]">Almost There</p>
                </div>

                {/* Right Panel */}
                <div className="flex-1 flex flex-col justify-center items-center text-center p-10 md:p-14 space-y-8 bg-[radial-gradient(#000_0.5px,transparent_0.5px)] [background-size:20px_20px] [background-position:center] !bg-opacity-5">
                    <div className="w-16 h-16 bg-white border-[2px] border-black rounded-full flex items-center justify-center mb-2 shadow-sm">
                        <Mail size={24} strokeWidth={3} />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-black uppercase leading-none tracking-tighter">
                            AWAITING<br/>VETTING .
                        </h1>
                        <p className="text-[10px] font-black text-nile-green uppercase leading-relaxed tracking-[0.2em] max-w-xs mx-auto">
                            OUR STAFF IS CURRENTLY REVIEWING YOUR PARTNERSHIP REQUEST. ACCESS GRANTED VIA EMAIL INVITATION.
                        </p>
                    </div>

                    <Button
                        size="md"
                        onClick={() => navigate('/onboarding')}
                        className="w-full max-w-xs"
                    >
                        <Home size={16} className="mr-2" /> EXIT TO PORTAL
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AwaitingVerification;
