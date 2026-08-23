import React, { useEffect, useState } from 'react';
import { BarChart3, Check, Loader2, Users, Lock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { getPoll, votePoll, timeRemaining, type Poll } from '../../services/pollService';

/**
 * An interactive poll, rendered inside a feed post or over a story.
 *
 * The results-visibility rule is the server's, not the client's: when a poll
 * hides results until you vote, the API simply omits the counts. This component
 * therefore cannot leak standings even if it wanted to — there is nothing in
 * the payload to leak.
 */

interface PollCardProps {
    pollId: string;
    variant?: 'feed' | 'story';
    /** Supply a preloaded poll to avoid a fetch when the feed already has it. */
    initial?: Poll;
}

const PollCard: React.FC<PollCardProps> = ({ pollId, variant = 'feed', initial }) => {
    const { showToast } = useToast();
    const [poll, setPoll] = useState<Poll | null>(initial ?? null);
    const [loading, setLoading] = useState(!initial);
    const [voting, setVoting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initial) return;
        let cancelled = false;
        getPoll(pollId)
            .then(p => { if (!cancelled) setPoll(p); })
            .catch(err => {
                if (!cancelled) setError(getErrorMessage(err, 'Could not load this poll.'));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [pollId, initial]);

    const handleVote = async (optionId: string) => {
        if (!poll || !poll.can_vote || voting) return;
        setVoting(optionId);
        try {
            const updated = await votePoll(poll.id, optionId);
            setPoll(updated);
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not record your vote.'), 'error');
        } finally {
            setVoting(null);
        }
    };

    const isStory = variant === 'story';

    if (loading) {
        return (
            <div className={`rounded-2xl p-4 flex items-center justify-center ${isStory ? 'bg-black/50 backdrop-blur' : 'border border-gray-100 bg-gray-50'}`}>
                <Loader2 size={16} className={`animate-spin ${isStory ? 'text-white/70' : 'text-gray-300'}`} />
            </div>
        );
    }

    if (error || !poll) {
        return (
            <div className={`rounded-2xl p-4 text-center text-xs ${isStory ? 'bg-black/50 text-white/80 backdrop-blur' : 'border border-gray-100 bg-gray-50 text-gray-500'}`}>
                {error ?? 'This poll is no longer available.'}
            </div>
        );
    }

    const remaining = timeRemaining(poll);

    const surface = isStory
        ? 'bg-black/55 backdrop-blur-sm border border-white/20'
        : 'bg-gray-50 border border-gray-100';
    const titleColor = isStory ? 'text-white' : 'text-gray-900';
    const metaColor = isStory ? 'text-white/70' : 'text-gray-500';

    return (
        <div className={`rounded-2xl p-4 ${surface}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <p className={`text-sm font-semibold leading-snug ${titleColor}`}>{poll.question}</p>
                {poll.is_anonymous && (
                    <span
                        className={`flex items-center gap-1 text-[10px] flex-shrink-0 ${metaColor}`}
                        title="Nobody can see who voted for what"
                    >
                        <Lock size={10} /> Anonymous
                    </span>
                )}
            </div>

            <div className="space-y-2">
                {poll.options.map(option => {
                    const showBar = poll.results_visible && option.percent !== undefined;
                    const pct = option.percent ?? 0;
                    const isVoting = voting === option.id;

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={!poll.can_vote || !!voting}
                            aria-label={
                                showBar
                                    ? `${option.text}, ${Math.round(pct)} percent${option.chosen ? ', your choice' : ''}`
                                    : option.text
                            }
                            className={`relative w-full text-left rounded-xl overflow-hidden transition-all
                                ${isStory ? 'border border-white/25' : 'border border-gray-200 bg-white'}
                                ${poll.can_vote ? 'hover:border-nile-blue cursor-pointer' : 'cursor-default'}
                                ${option.chosen ? 'border-nile-blue ring-1 ring-nile-blue/30' : ''}`}
                        >
                            {/* The result bar is a background layer, so the label
                                stays readable at every percentage. */}
                            {showBar && (
                                <span
                                    aria-hidden
                                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                        option.chosen
                                            ? 'bg-nile-blue/25'
                                            : isStory ? 'bg-white/15' : 'bg-gray-100'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                />
                            )}
                            <span className="relative flex items-center justify-between gap-2 px-3.5 py-2.5">
                                <span className={`text-sm flex items-center gap-1.5 min-w-0 ${titleColor}`}>
                                    {isVoting && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
                                    {option.chosen && !isVoting && (
                                        <Check size={13} className="text-nile-blue flex-shrink-0" strokeWidth={3} />
                                    )}
                                    <span className="truncate">{option.text}</span>
                                </span>
                                {showBar && (
                                    <span className={`text-xs font-semibold flex-shrink-0 ${titleColor}`}>
                                        {Math.round(pct)}%
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className={`flex items-center justify-between gap-2 mt-3 text-[11px] ${metaColor}`}>
                <span className="flex items-center gap-1">
                    <Users size={11} />
                    {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
                </span>
                <span className="flex items-center gap-2">
                    {poll.multi_choice && <span>Pick several</span>}
                    {remaining && <span>{remaining}</span>}
                </span>
            </div>

            {/* Explain WHY results are hidden. An unexplained blank looks broken. */}
            {!poll.results_visible && (
                <p className={`text-[11px] mt-2 flex items-center gap-1.5 ${metaColor}`}>
                    <BarChart3 size={11} />
                    Vote to see the results
                </p>
            )}
        </div>
    );
};

export default PollCard;
