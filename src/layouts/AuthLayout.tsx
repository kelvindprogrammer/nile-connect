import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    leftContent?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, leftContent }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-nile-white p-6 font-sans overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[40%] h-full bg-nile-blue/5 -skew-x-12 translate-x-1/2" />
            
            {/* Main Container - Shared with Login Hub design */}
            <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(30,73,157,1)] rounded-[40px] overflow-hidden min-h-[500px] anime-fade-in relative z-10">
                
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-30 w-11 h-11 bg-white border-[2px] border-black rounded-lg shadow-sm flex items-center justify-center hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                    <ArrowLeft size={16} strokeWidth={3} />
                </button>

                {/* Brand Side Panel */}
                <div className="w-full md:w-[42%] bg-nile-blue text-white border-r-[2px] border-black flex flex-col items-center justify-center p-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                    
                    <div className="relative z-10 w-full flex flex-col items-center">
                        {leftContent}
                    </div>
                </div>

                {/* Form Side Panel */}
                <div className="flex-1 flex flex-col justify-center p-10 md:p-14 bg-white bg-[radial-gradient(#000_0.5px,transparent_0.5px)] [background-size:24px_24px] [background-position:center] !bg-opacity-[0.02]">
                    <div className="max-w-sm mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
