import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';
import StoryViewer from './StoryViewer';
import StoryComposer from './StoryComposer';
import StoryInsights from './StoryInsights';
import { useAuth } from '../../context/AuthContext';
import {
    getStoryTray, type Story, type StoryTray as Tray,
} from '../../services/storiesService';
import type { PersonSummary } from '../../services/socialService';

/**
 * The horizontal story rail.
 *
 * Ordering is the server's (own first, then unseen, then seen) so every client
 * agrees. The unseen state is carried by the ring: a coloured gradient ring for
 * unseen, a flat grey ring once watched — the convention people already read
 * without being taught.
 *
 * Renders nothing at all when there are no stories and the user has none of
 * their own to add, rather than an empty rail taking up space above the feed.
 */

const StoryTrayRail: React.FC = () => {
    const { user } = useAuth();
    const [trays, setTrays] = useState<Tray[]>([]);
    const [authors, setAuthors] = useState<Record<string, PersonSummary>>({});
    const [loading, setLoading] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);

    const [viewing, setViewing] = useState<{ trayIndex: number; storyIndex: number } | null>(null);
    const [composing, setComposing] = useState(false);
    const [insightsFor, setInsightsFor] = useState<Story | null>(null);

    const reload = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        getStoryTray()
            .then(res => {
                if (cancelled) return;
                setTrays(res.trays);
                setAuthors(res.authors);
            })
            .catch(() => { if (!cancelled) setTrays([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [reloadToken]);

    const ownTray = trays.find(t => t.is_self);
    const activeTray = viewing !== null ? trays[viewing.trayIndex] : null;

    // Advancing past the last story in one tray moves to the next tray that
    // still has something unseen, which is what makes the rail feel continuous.
    const advanceTray = useCallback(() => {
        if (viewing === null) return;
        for (let i = viewing.trayIndex + 1; i < trays.length; i++) {
            if (trays[i].items.length > 0) {
                setViewing({ trayIndex: i, storyIndex: 0 });
                return;
            }
        }
        setViewing(null);
        reload(); // refresh seen-state rings
    }, [viewing, trays, reload]);

    const handleDeleted = (storyId: string) => {
        setTrays(prev =>
            prev
                .map(t => ({ ...t, items: t.items.filter(s => s.id !== storyId) }))
                .filter(t => t.items.length > 0),
        );
    };

    if (loading) {
        return (
            <div className="flex gap-3 px-1 py-2 overflow-hidden" aria-busy="true" aria-label="Loading stories">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-paper-200 animate-pulse" />
                        <div className="w-12 h-2 rounded bg-paper-200 animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    // Nothing to show and nothing to add — take up no space.
    if (trays.length === 0 && !user) return null;

    return (
        <>
            <div
                className="flex gap-3 px-1 py-2 overflow-x-auto no-scrollbar"
                role="list"
                aria-label="Stories"
            >
                {/* Add-your-story button, always first */}
                <button
                    onClick={() => setComposing(true)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                    aria-label="Add to your story"
                >
                    <div className="relative w-16 h-16">
                        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-paper-300">
                            <Avatar name={user?.name || 'You'} size="lg" isSelf />
                        </div>
                        <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-nile-blue text-white
                                         flex items-center justify-center ring-2 ring-white group-hover:scale-110 transition-transform">
                            <Plus size={12} strokeWidth={3} />
                        </span>
                    </div>
                    <span className="text-[11px] text-paper-700 font-medium">Your story</span>
                </button>

                {trays.filter(t => !t.is_self || t.items.length > 0).map((tray, i) => {
                    const author = authors[tray.author_id];
                    const trayIndex = trays.indexOf(tray);
                    return (
                        <button
                            key={tray.author_id}
                            role="listitem"
                            onClick={() => setViewing({ trayIndex, storyIndex: 0 })}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                            aria-label={`${tray.is_self ? 'Your' : author?.name ?? 'Member'}'s stories${tray.has_unseen ? ', unseen' : ''}`}
                        >
                            <div
                                className={`w-16 h-16 rounded-full p-[2px] transition-transform group-active:scale-95 ${
                                    tray.has_unseen
                                        ? 'bg-gradient-to-tr from-nile-blue via-nile-green to-nile-blue'
                                        : 'bg-paper-300'
                                }`}
                            >
                                <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white bg-white">
                                    <Avatar name={author?.name ?? 'Member'} size="lg" isSelf={tray.is_self} />
                                </div>
                            </div>
                            <span className="text-[11px] text-paper-700 max-w-[68px] truncate">
                                {tray.is_self ? 'You' : author?.name?.split(' ')[0] ?? 'Member'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeTray && (
                <StoryViewer
                    stories={activeTray.items}
                    author={authors[activeTray.author_id]}
                    startIndex={viewing?.storyIndex ?? 0}
                    isOwn={activeTray.is_self}
                    onClose={() => { setViewing(null); reload(); }}
                    onFinished={advanceTray}
                    onDeleted={handleDeleted}
                    onOpenInsights={setInsightsFor}
                />
            )}

            {composing && (
                <StoryComposer
                    onClose={() => setComposing(false)}
                    onPosted={() => { setComposing(false); reload(); }}
                />
            )}

            {insightsFor && (
                <StoryInsights story={insightsFor} onClose={() => setInsightsFor(null)} />
            )}
        </>
    );
};

export default StoryTrayRail;
