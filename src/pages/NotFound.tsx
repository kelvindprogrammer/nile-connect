import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';

const NotFound = () => (
    <div className="min-h-screen bg-nile-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg space-y-8">
            {/* 404 Hero */}
            <div className="bg-nile-blue p-10 rounded-3xl text-center space-y-4 shadow-card">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mx-auto shadow-soft-sm">
                    <MapPin size={28} strokeWidth={3} className="text-nile-blue" />
                </div>
                <h1 className="text-[100px] md:text-[140px] font-semibold text-white leading-none tracking-tight">404</h1>
                <div className="border-t border-white/20 pt-4">
                    <p className="text-xs text-white/60 font-medium tracking-wide">Nile Connect — page not found</p>
                </div>
            </div>

            {/* Message Card */}
            <div className="social-card p-8 space-y-3 text-left">
                <h2 className="text-2xl font-semibold text-gray-900 leading-tight">Lost in the network</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                    This route doesn't exist on the platform. You may have followed a broken link or mistyped the address.
                </p>
            </div>

            {/* CTA */}
            <Link
                to="/onboarding"
                className="flex items-center justify-center gap-3 w-full bg-nile-green text-white font-medium py-4 rounded-full hover:bg-nile-green-500 transition-colors text-sm shadow-green"
            >
                <ArrowLeft size={16} strokeWidth={3} />
                Return to home
            </Link>
        </div>
    </div>
);

export default NotFound;
