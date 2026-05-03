import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'nile' | 'nileGreen' | 'nileBlue';
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:   ButtonVariant;
    size?:      ButtonSize;
    fullWidth?: boolean;
    isLoading?: boolean;
    asChild?:   boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:   'bg-black text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    outline:   'bg-white text-black border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    ghost:     'bg-transparent text-black border-[2px] border-transparent hover:bg-black/5 hover:border-black/10',
    danger:    'bg-red-500 text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    nile:      'bg-nile-blue text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    nileGreen: 'bg-nile-green text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    nileBlue:  'bg-nile-blue text-white border-[2px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
};

const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1    text-[8px]  rounded-lg',
    sm: 'px-4   py-2    text-[9px]  rounded-xl',
    md: 'px-5   py-2.5  text-[10px] rounded-xl',
    lg: 'px-7   py-3.5  text-[11px] rounded-2xl',
};

const Button: React.FC<ButtonProps> = ({
    variant   = 'primary',
    size      = 'md',
    fullWidth = false,
    isLoading = false,
    disabled,
    className,
    children,
    ...props
}) => (
    <button
        disabled={disabled || isLoading}
        className={cn(
            'inline-flex items-center justify-center gap-2',
            'font-black uppercase tracking-widest leading-none',
            'transition-all duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile-green focus-visible:ring-offset-2',
            'disabled:opacity-40 disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none',
            variantClasses[variant],
            sizeClasses[size],
            fullWidth && 'w-full',
            className,
        )}
        {...props}
    >
        {isLoading && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
        {children}
    </button>
);

Button.displayName = 'Button';

export default Button;
export { Button };
export type { ButtonProps };
