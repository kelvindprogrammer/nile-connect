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
        default:  'bg-white border border-paper-300 shadow-soft-xs',
        elevated: 'bg-white border border-paper-300 shadow-soft hover:shadow-card-hover transition-shadow duration-300',
        flat:     'bg-white border border-paper-300',
        tinted:   'bg-paper-100 border border-paper-300',
    };

    return (
        <div className={cn('rounded-xl overflow-hidden', variants[variant], className)}>
            {(title || action) && (
                <div className="px-5 py-4 flex items-center justify-between border-b border-paper-200">
                    <div>
                        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
                        {subtitle && <p className="text-xs text-paper-600 mt-0.5">{subtitle}</p>}
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
