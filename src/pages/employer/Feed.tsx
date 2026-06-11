import React from 'react';
import { MessageCircle } from 'lucide-react';
import Feed from '../../components/Feed';

const EmployerFeed = () => {
    return (
        <div className="max-w-2xl mx-auto py-6 md:py-10 px-4 md:px-6 space-y-6 anime-fade-in min-h-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-nile-green rounded-2xl flex items-center justify-center text-white shadow-green flex-shrink-0">
                    <MessageCircle size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 leading-none">Community feed</h1>
                    <p className="text-sm text-gray-400 mt-1">Share updates and connect with students</p>
                </div>
            </div>

            <Feed />
        </div>
    );
};

export default EmployerFeed;
