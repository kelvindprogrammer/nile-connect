import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { ProfileCompletion } from '../../hooks/useProfile';

/**
 * Profile strength, with the specific sections still outstanding.
 *
 * The old card showed a bare percentage that read 100% on an empty profile
 * (the hook seeded placeholder data that scored full marks). Naming what is
 * missing makes the number checkable by the person looking at it — if it says
 * 100% you can see there is nothing left in the list.
 */
const ProfileStrengthCard: React.FC<{
    completion: ProfileCompletion;
    isLoading?: boolean;
    onComplete: () => void;
    accentText?: string;
    accentBg?: string;
}> = ({ completion, isLoading, onComplete, accentText = 'text-nile-blue', accentBg = 'bg-nile-blue' }) => {
    if (isLoading) {
        return (
            <div className="bg-white border border-paper-300 rounded-xl shadow-card p-4 flex items-center justify-center h-[92px]">
                <Loader2 size={16} className="animate-spin text-paper-500" />
            </div>
        );
    }

    const done = completion.percent >= 100;

    return (
        <div className="bg-white border border-paper-300 rounded-xl shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-ink-700">Profile strength</p>
                <span className={`text-xs font-semibold ${done ? 'text-nile-green' : accentText}`}>
                    {completion.percent}%
                </span>
            </div>

            <div className="w-full h-1.5 bg-paper-200 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-nile-green' : accentBg}`}
                    style={{ width: `${completion.percent}%` }}
                />
            </div>

            {done ? (
                <p className="flex items-center gap-1.5 text-xs text-nile-green font-medium">
                    <CheckCircle2 size={13} /> Your profile is complete
                </p>
            ) : (
                <>
                    <p className="text-[11px] text-paper-700 leading-snug mb-2">
                        Still to add:{' '}
                        <span className="text-ink-700">{completion.missing.slice(0, 3).join(', ')}</span>
                        {completion.missing.length > 3 && (
                            <span className="text-paper-600"> +{completion.missing.length - 3} more</span>
                        )}
                    </p>
                    <button
                        onClick={onComplete}
                        className={`text-xs font-medium ${accentText} hover:underline`}
                    >
                        Complete your profile →
                    </button>
                </>
            )}
        </div>
    );
};

export default ProfileStrengthCard;
