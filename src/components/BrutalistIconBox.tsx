import React from 'react';

interface BrutalistIconBoxProps {
    children: React.ReactNode;
    className?: string;
}

const BrutalistIconBox: React.FC<BrutalistIconBoxProps> = ({ children, className }) => {
    return (
        <div className={`w-40 h-40 bg-white border-3 border-black shadow-brutalist rounded-[32px] flex items-center justify-center text-6xl ${className}`}>
            {children}
        </div>
    );
};

export default BrutalistIconBox;
