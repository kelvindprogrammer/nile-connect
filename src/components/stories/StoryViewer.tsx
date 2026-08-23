import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Trash2, Eye, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';
import PollCard from '../social/PollCard';
import ReactionBar from '../social/ReactionBar';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { timeAgo } from '../../utils/formatDate';
import {
    markStoryViewed, replyToStory, deleteStory, backgroundCss,
    type Story,
} from '../../services/storiesService';
import type { PersonSummary, ReactionSummary } from '../../services/socialService';
import { emptyReactionSummary } from '../../services/socialService';

/**
 * The full-screen story viewer.
 *
 * Interaction model, matching what people already know from Instagram and
 * WhatsApp — deviating here makes the feature feel broken rather than novel:
 *
 *   tap right third   -> next story
 *   tap left third    -> previous story
 *   press and hold    -> pause (and hide the chrome so the media is unobscured)
 *   swipe down        -> close
 *   Escape / arrows   -> the same, for keyboard users
 *
 * Timing: images advance after IMAGE_DURATION_MS; videos advance when the
 * video ends, so a 30-second clip is never cut off at 5 seconds.
 */

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 50;
/** A press longer than this is a hold, not a tap. */
const HOLD_THRESHOLD_MS = 200;

interface StoryViewerProps {
    stories: Story[];
    author?: PersonSummary;
    startIndex?: number;
    isOwn: boolean;
    onClose: () => void;
    /** Advance to the next author's tray when this one finishes. */
    onFinished?: () => void;
    onDeleted?: (storyId: string) => void;
    onOpenInsights?: (story: Story) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
    stories, author, startIndex = 0, isOwn, onClose, onFinished, onDeleted, onOpenInsights,
}) => {
    const { showToast } = useToast();
    const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, stories.length - 1)));
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [reactions, setReactions] = useState<Record<string, ReactionSummary>>({});

    const videoRef = useRef<HTMLVideoElement>(null);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heldRef = useRef(false);
    const touchStartY = useRef<number | null>(null);
    // Tracks which stories have already been reported as viewed, so scrubbing
    // back and forth does not fire the same request repeatedly.
    const reportedRef = useRef<Set<string>>(new Set());

    const current = stories[index];

    const goNext = useCallback(() => {
        setProgress(0);
        setIndex(i => {
            if (i + 1 < stories.length) return i + 1;
            // Finished this author's tray.
            if (onFinished) onFinished();
            else onClose();
            return i;
        });
    }, [stories.length, onFinished, onClose]);

    const goPrev = useCallback(() => {
        setProgress(0);
        setIndex(i => Math.max(0, i - 1));
    }, []);

    // Record the view once per story. `completed` is only true when the
    // progress bar actually reached the end — that is what makes the author's
    // completion-rate metric mean anything.
    const report = useCallback((story: Story, completed: boolean) => {
        if (!story) return;
        const key = `${story.id}:${completed}`;
        if (reportedRef.current.has(key)) return;
        reportedRef.current.add(key);
        markStoryViewed(story.id, completed).catch(() => {
            // A failed view record is not worth interrupting playback for.
            reportedRef.current.delete(key);
        });
    }, []);

    useEffect(() => {
        if (current) report(current, false);
    }, [current, report]);

    // Progress timer. Videos drive their own progress from timeupdate, so this
    // only runs for images and text.
    useEffect(() => {
        if (!current || paused) return;
        if (current.kind === 'video') return;

        const step = (TICK_MS / IMAGE_DURATION_MS) * 100;
        const timer = setInterval(() => {
            setProgress(p => {
                if (p + step >= 100) {
                    report(current, true);
                    goNext();
                    return 0;
                }
                return p + step;
            });
        }, TICK_MS);
        return () => clearInterval(timer);
    }, [current, paused, goNext, report]);

    // Keep the video element in step with the paused state.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (paused) video.pause();
        else void video.play().catch(() => undefined);
    }, [paused, index]);

    // Keyboard controls, and a focus trap via the dialog role.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape': onClose(); break;
                case 'ArrowRight': goNext(); break;
                case 'ArrowLeft': goPrev(); break;
                case ' ': e.preventDefault(); setPaused(p => !p); break;
            }
        };
        document.addEventListener('keydown', onKey);
        // Stop the page behind scrolling while the viewer is open.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose, goNext, goPrev]);

    useEffect(() => () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    }, []);

    if (!current) return null;

    const startPress = () => {
        heldRef.current = false;
        pressTimer.current = setTimeout(() => {
            heldRef.current = true;
            setPaused(true);
        }, HOLD_THRESHOLD_MS);
    };

    const endPress = (zone: 'left' | 'right') => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        if (heldRef.current) {
            heldRef.current = false;
            setPaused(false);
            return; // it was a hold, not a tap
        }
        if (zone === 'right') goNext();
        else goPrev();
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = reply.trim();
        if (!text || sending) return;
        setSending(true);
        try {
            await replyToStory(current.id, text);
            setReply('');
            showToast('Reply sent', 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not send your reply.'), 'error');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this story? This cannot be undone.')) return;
        try {
            await deleteStory(current.id);
            onDeleted?.(current.id);
            if (stories.length <= 1) onClose();
            else goNext();
            showToast('Story deleted', 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not delete that story.'), 'error');
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Stories from ${author?.name ?? 'this person'}`}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none"
            onTouchStart={e => { touchStartY.current = e.touches[0]?.clientY ?? null; }}
            onTouchEnd={e => {
                // A downward swipe closes, matching every story UI people know.
                const start = touchStartY.current;
                const end = e.changedTouches[0]?.clientY;
                if (start !== null && end !== undefined && end - start > 90) onClose();
                touchStartY.current = null;
            }}
        >
            <div className="relative w-full h-full max-w-[480px] max-h-screen bg-black overflow-hidden">
                {/* Progress bars — one segment per story */}
                <div className={`absolute top-0 inset-x-0 z-30 flex gap-1 p-2 transition-opacity ${paused ? 'opacity-0' : 'opacity-100'}`}>
                    {stories.map((s, i) => (
                        <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{
                                    width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                                    transition: i === index ? 'width 50ms linear' : undefined,
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className={`absolute top-4 inset-x-0 z-30 flex items-center justify-between px-3 pt-2 transition-opacity ${paused ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={author?.name ?? 'Member'} size="sm" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {isOwn ? 'Your story' : author?.name ?? 'Member'}
                            </p>
                            <p className="text-[11px] text-white/70">{timeAgo(current.created_at)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isOwn && (
                            <>
                                <button
                                    onClick={() => onOpenInsights?.(current)}
                                    aria-label="Story insights"
                                    className="p-2 rounded-full text-white/80 hover:bg-white/10 flex items-center gap-1"
                                >
                                    <Eye size={16} />
                                    <span className="text-xs">{current.views_count ?? 0}</span>
                                </button>
                                <button
                                    onClick={handleDelete}
                                    aria-label="Delete story"
                                    className="p-2 rounded-full text-white/80 hover:bg-white/10"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            aria-label="Close stories"
                            className="p-2 rounded-full text-white hover:bg-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Media */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {current.kind === 'text' ? (
                        <div
                            className="w-full h-full flex items-center justify-center p-10"
                            style={{ background: backgroundCss(current.background_color) }}
                        >
                            <p className="text-white text-2xl md:text-3xl font-semibold text-center leading-snug break-words">
                                {current.text}
                            </p>
                        </div>
                    ) : current.kind === 'video' ? (
                        <video
                            ref={videoRef}
                            src={current.media_url}
                            poster={current.thumbnail_url}
                            className="w-full h-full object-contain"
                            autoPlay
                            playsInline
                            // Videos start muted so autoplay is not blocked; the
                            // viewer can unmute with the native controls.
                            muted
                            onTimeUpdate={e => {
                                const v = e.currentTarget;
                                if (v.duration > 0) setProgress((v.currentTime / v.duration) * 100);
                            }}
                            onEnded={() => { report(current, true); goNext(); }}
                        />
                    ) : (
                        <img
                            src={current.media_url}
                            alt={current.text || 'Story'}
                            className="w-full h-full object-contain"
                            draggable={false}
                        />
                    )}

                    {/* A text overlay on top of media */}
                    {current.kind !== 'text' && current.text && (
                        <div className="absolute bottom-24 inset-x-0 px-6">
                            <p className="text-white text-lg font-medium text-center drop-shadow-lg break-words">
                                {current.text}
                            </p>
                        </div>
                    )}
                </div>

                {/* Attached poll sits above the tap zones so it stays tappable */}
                {current.poll_id && (
                    <div className="absolute bottom-28 inset-x-0 px-4 z-30" onPointerDown={e => e.stopPropagation()}>
                        <PollCard pollId={current.poll_id} variant="story" />
                    </div>
                )}

                {/* Tap zones. Deliberately below the chrome in z-order so the
                    header buttons and the poll remain clickable. */}
                <button
                    aria-label="Previous story"
                    className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-default"
                    onPointerDown={startPress}
                    onPointerUp={() => endPress('left')}
                    onPointerLeave={() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } setPaused(false); }}
                />
                <button
                    aria-label="Next story"
                    className="absolute right-0 top-0 bottom-0 w-2/3 z-10 cursor-default"
                    onPointerDown={startPress}
                    onPointerUp={() => endPress('right')}
                    onPointerLeave={() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } setPaused(false); }}
                />

                {/* Desktop arrows — a mouse user should not have to guess at
                    invisible tap zones. */}
                <button
                    onClick={goPrev}
                    disabled={index === 0}
                    aria-label="Previous"
                    className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full
                               bg-white/10 hover:bg-white/20 text-white items-center justify-center
                               disabled:opacity-0 transition-opacity"
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={goNext}
                    aria-label="Next"
                    className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full
                               bg-white/10 hover:bg-white/20 text-white items-center justify-center"
                >
                    <ChevronRight size={18} />
                </button>

                {/* Reply + reactions. Hidden on your own story: replying to
                    yourself is meaningless, and the space is better spent on
                    the insights affordance in the header. */}
                {!isOwn && (
                    <div
                        className={`absolute bottom-0 inset-x-0 z-30 p-3 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity ${paused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <form onSubmit={handleReply} className="flex-1 flex items-center gap-2">
                            <input
                                value={reply}
                                onChange={e => setReply(e.target.value)}
                                onFocus={() => setPaused(true)}
                                onBlur={() => setPaused(false)}
                                placeholder="Reply privately…"
                                aria-label="Reply to this story"
                                maxLength={1000}
                                className="flex-1 h-10 rounded-full bg-white/15 border border-white/25 px-4
                                           text-sm text-white placeholder:text-white/60 outline-none
                                           focus:bg-white/25 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!reply.trim() || sending}
                                aria-label="Send reply"
                                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white
                                           flex items-center justify-center disabled:opacity-40 transition-colors"
                            >
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </form>
                        <div className="[&_button]:text-white">
                            <ReactionBar
                                subjectType="story"
                                subjectId={current.id}
                                summary={reactions[current.id] ?? emptyReactionSummary()}
                                onChange={s => setReactions(prev => ({ ...prev, [current.id]: s }))}
                                onError={msg => showToast(msg, 'error')}
                                compact
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryViewer;
