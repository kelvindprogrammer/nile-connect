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
    primary:   'bg-gray-900 text-white hover:bg-gray-800 shadow-soft-xs',
    outline:   'bg-white text-gray-800 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 shadow-soft-xs',
    ghost:     'bg-transparent text-gray-700 hover:bg-gray-100',
    danger:    'bg-red-500 text-white hover:bg-red-600 shadow-soft-xs',
    nile:      'bg-nile-blue text-white hover:bg-nile-blue-600 shadow-blue',
    nileGreen: 'bg-nile-green text-white hover:bg-nile-green-500 shadow-green',
    nileBlue:  'bg-nile-blue text-white hover:bg-nile-blue-600 shadow-blue',
    subtle:    'bg-nile-blue-50 text-nile-blue hover:bg-nile-blue-100',
};

const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-3    py-1.5  text-[11px] rounded-lg   gap-1',
    sm: 'px-4    py-2    text-xs     rounded-lg   gap-1.5',
    md: 'px-5    py-2.5  text-xs     rounded-xl   gap-2',
    lg: 'px-6    py-3    text-sm     rounded-xl   gap-2',
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
