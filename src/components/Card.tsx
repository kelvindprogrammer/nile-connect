import React from 'react';
import { cn } from '../lib/utils';

interface CardProps {
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    variant?: 'default' | 'elevated' | 'flat' | 'tinted';
    noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    action,
    children,
    className = '',
    bodyClassName = '',
    variant = 'default',
    noPadding = false,
}) => {
    const variants = {
        default:  'bg-white border border-gray-100 shadow-card',
        elevated: 'bg-white border border-gray-100 shadow-soft hover:shadow-card-hover transition-shadow duration-300',
        flat:     'bg-white border border-gray-100',
        tinted:   'bg-nile-blue-50/40 border border-nile-blue-100/60',
    };

    return (
        <div className={cn('rounded-2xl overflow-hidden', variants[variant], className)}>
            {(title || action) && (
                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    {action && <div className="flex-shrink-0">{action}</div>}
                </div>
            )}
            <div className={cn(!noPadding && 'p-5', bodyClassName)}>
                {children}
            </div>
        </div>
    );
};

export default Card;
