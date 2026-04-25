import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';

const NotFound = () => (
    <div className="min-h-screen bg-nile-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg space-y-8">
            {/* 404 Hero */}
            <div className="bg-nile-blue p-10 rounded-[40px] border-[3px] border-black shadow-[8px_8px_0px_0px_#000] text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-[20px] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] mx-auto">
                    <MapPin size={28} strokeWidth={3} className="text-nile-blue" />
                </div>
                <h1 className="text-[100px] md:text-[140px] font-black text-white leading-none tracking-tighter">404</h1>
                <div className="border-t-[2px] border-white/20 pt-4">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">NILE CONNECT — PAGE NOT FOUND</p>
                </div>
            </div>

            {/* Message Card */}
            <div className="bg-white p-8 rounded-[32px] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-3 text-left">
                <h2 className="text-2xl font-black text-black uppercase tracking-tighter leading-none">Lost in the network .</h2>
                <p className="text-xs font-bold text-nile-blue/60 uppercase tracking-widest leading-relaxed">
                    This route doesn't exist on the platform. You may have followed a broken link or mistyped the address.
                </p>
            </div>

            {/* CTA */}
            <Link
                to="/onboarding"
                className="flex items-center justify-center gap-3 w-full bg-nile-green text-white font-black py-5 rounded-full border-[3px] border-black shadow-[5px_5px_0px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all uppercase text-xs tracking-widest"
            >
                <ArrowLeft size={16} strokeWidth={3} />
                RETURN TO HOME
            </Link>
        </div>
    </div>
);

export default NotFound;
