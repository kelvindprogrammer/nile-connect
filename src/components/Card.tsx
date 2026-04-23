import React from 'react';

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'elevated' | 'flat';
}

const Card: React.FC<CardProps> = ({ title, children, className = '', variant = 'elevated' }) => {
    const baseStyles = "bg-white border-[2px] border-black rounded-[24px] overflow-hidden transition-all duration-300";
    
    const variants = {
        elevated: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(30,73,157,0.1)]",
        flat: "shadow-none",
        default: "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {title && (
                <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-3 border-b-[2px] border-black/5">
                    <h3 className="text-[9px] md:text-[11px] font-black text-black uppercase tracking-[0.1em]">{title}</h3>
                </div>
            )}
            <div className={title ? "p-4 md:p-6 pt-2 md:pt-3" : "p-4 md:p-6"}>
                {children}
            </div>
        </div>
    );
};

export default Card;
