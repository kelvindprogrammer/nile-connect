import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    isLoading?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    isLoading = false,
    className = '', 
    children, 
    ...props 
}) => {
    const baseStyles = "relative inline-flex items-center justify-center gap-1.5 font-bold uppercase tracking-[0.02em] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none appearance-none select-none";
    
    const variants = {
        primary: "bg-nile-green text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]",
        secondary: "bg-nile-blue text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]",
        outline: "bg-white text-black border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(30,73,157,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]",
        ghost: "bg-transparent text-black border-[2px] border-transparent hover:border-black hover:bg-black/5 shadow-none",
        danger: "bg-red-500 text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
    };

    const sizes = {
        xs: "py-1 px-3 text-[9px] rounded-md",
        sm: "py-2 px-4 text-[10px] rounded-lg",
        md: "py-2.5 px-5 text-[11px] rounded-xl",
        lg: "py-3.5 px-8 text-xs rounded-2xl"
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 size={12} className="animate-spin" />}
            <span className={isLoading ? 'opacity-80' : ''}>{children}</span>
        </button>
    );
};

export default Button;
