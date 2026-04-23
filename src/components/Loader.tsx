import React from 'react';

const Loader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6 border-2',
        md: 'w-10 h-10 border-3',
        lg: 'w-16 h-16 border-4'
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`${sizeClasses[size]} border-black border-t-nile-green rounded-full animate-spin shadow-brutalist-sm`}></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black animate-pulse">Loading...</p>
        </div>
    );
};

export default Loader;
