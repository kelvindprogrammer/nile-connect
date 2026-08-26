import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
    label: string;
    icon: LucideIcon;
    to: string;
    /** Optional count badge, e.g. items awaiting review. */
    badge?: number;
}

/**
 * The mobile home used to render nothing but the post feed, so the small-screen
 * experience carried none of the shortcuts, stats or upcoming-events context
 * the desktop rails provide. This is the condensed stand-in: a scannable
 * shortcut grid plus a stat strip, shown only below `lg` where the rails are
 * hidden.
 */
const MobileQuickActions: React.FC<{
    greeting?: string;
    name?: string;
    subLabel?: string;
    actions: QuickAction[];
    stats?: { label: string; value: string | number; to?: string }[];
    accent?: string;
}> = ({ greeting, name, subLabel, actions, stats = [], accent = 'text-nile-blue' }) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-4">
            {(greeting || name) && (
                <div>
                    {greeting && <p className="text-xs text-paper-600">{greeting},</p>}
                    {name && <h1 className="text-lg font-semibold text-ink-800 leading-tight">{name}</h1>}
                    {subLabel && <p className="text-xs text-paper-600 mt-0.5">{subLabel}</p>}
                </div>
            )}

            {stats.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {stats.map(s => (
                        <button
                            key={s.label}
                            onClick={() => s.to && navigate(s.to)}
                            disabled={!s.to}
                            className="bg-white border border-paper-300 rounded-xl shadow-card px-3 py-2.5 text-left disabled:cursor-default enabled:hover:border-paper-300 transition-colors"
                        >
                            <p className={`text-base font-semibold leading-none ${accent}`}>{s.value}</p>
                            <p className="text-[10px] text-paper-600 mt-1 leading-tight">{s.label}</p>
                        </button>
                    ))}
                </div>
            )}

            {actions.length > 0 && (
                <div className="bg-white border border-paper-300 rounded-xl shadow-card p-2">
                    <div className="grid grid-cols-4 gap-1">
                        {actions.map(({ label, icon: Icon, to, badge }) => (
                            <button
                                key={to}
                                onClick={() => navigate(to)}
                                className="relative flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl hover:bg-paper-100 active:scale-[0.97] transition-all"
                            >
                                <Icon size={18} className={accent} strokeWidth={1.9} />
                                <span className="text-[10px] font-medium text-paper-700 leading-tight text-center">{label}</span>
                                {!!badge && badge > 0 && (
                                    <span className="absolute top-1 right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileQuickActions;
