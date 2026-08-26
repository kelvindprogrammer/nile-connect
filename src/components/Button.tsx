import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'nile' | 'nileGreen' | 'nileBlue' | 'subtle';
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:   ButtonVariant;
    size?:      ButtonSize;
    fullWidth?: boolean;
    isLoading?: boolean;
    asChild?:   boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:   'bg-app-accent text-white hover:bg-harbour-600 shadow-soft-xs',
    outline:   'bg-white text-ink-800 border border-paper-300 hover:border-paper-400 hover:bg-paper-100 shadow-soft-xs',
    ghost:     'bg-transparent text-ink-700 hover:bg-paper-100',
    danger:    'bg-red-600 text-white hover:bg-red-700 shadow-soft-xs',
    nile:      'bg-app-accent text-white hover:bg-harbour-600 shadow-blue',
    nileGreen: 'bg-green-600 text-white hover:bg-green-700 shadow-green',
    nileBlue:  'bg-app-accent text-white hover:bg-harbour-600 shadow-blue',
    subtle:    'bg-app-tint text-app-accent hover:bg-harbour-50',
};

const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2.5  py-1    text-[11px] rounded-md   gap-1 min-h-[24px]',
    sm: 'px-3.5  py-1.5  text-xs     rounded-md   gap-1.5 min-h-[28px]',
    md: 'px-4.5  py-2    text-xs     rounded-lg   gap-2 min-h-[36px]',
    lg: 'px-6    py-2.5  text-sm     rounded-lg   gap-2 min-h-[44px]',
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
            'inline-flex items-center justify-center',
            'font-semibold tracking-wide leading-none',
            'transition-all duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nile-blue focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:pointer-events-none',
            'active:scale-[0.98]',
            variantClasses[variant],
            sizeClasses[size],
            fullWidth && 'w-full',
            className,
        )}
        {...props}
    >
        {isLoading && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
        {children}
    </button>
);

Button.displayName = 'Button';

export default Button;
export { Button };
export type { ButtonProps };
