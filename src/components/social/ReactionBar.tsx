import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThumbsUp, Loader2 } from 'lucide-react';
import {
    react, REACTION_FALLBACK, emptyReactionSummary,
    type ReactionKind, type ReactionMeta, type ReactionSubject, type ReactionSummary,
} from '../../services/socialService';

/**
 * The reaction control: a primary button that likes on tap, and a picker that
 * opens on long-press (touch) or hover (pointer).
 *
 * Interaction choice: a tap must stay a like. Forcing a picker on every
 * interaction turns a one-tap action into a two-step one, which is the mistake
 * that makes richer reactions feel worse than a plain like button. The extra
 * reactions are discoverable but never mandatory.
 *
 * Optimistic updates are applied immediately and rolled back on failure, with
 * the server's authoritative summary always winning once it arrives.
 */

const LONG_PRESS_MS = 350;

interface ReactionBarProps {
    subjectType: ReactionSubject;
    subjectId: string;
    summary: ReactionSummary;
    onChange: (summary: ReactionSummary) => void;
    onError?: (message: string) => void;
    /** Rendered smaller inside comment threads. */
    compact?: boolean;
    disabled?: boolean;
}

// The catalog is fetched once per session and shared by every bar on the page,
// so a feed of 20 posts makes one request rather than 20.
let catalogCache: ReactionMeta[] | null = null;
let catalogPromise: Promise<ReactionMeta[]> | null = null;

const loadCatalog = (): Promise<ReactionMeta[]> => {
    if (catalogCache) return Promise.resolve(catalogCache);
    if (!catalogPromise) {
        catalogPromise = import('../../services/socialService')
            .then(m => m.getReactionCatalog())
            .then(list => {
                catalogCache = list.length ? list : REACTION_FALLBACK;
                return catalogCache;
            })
            .catch(() => {
                // Falling back keeps the picker usable offline rather than
                // rendering an empty popover.
                catalogCache = REACTION_FALLBACK;
                return catalogCache;
            });
    }
    return catalogPromise;
};

const ReactionBar: React.FC<ReactionBarProps> = ({
    subjectType, subjectId, summary, onChange, onError, compact = false, disabled = false,
}) => {
    const [catalog, setCatalog] = useState<ReactionMeta[]>(catalogCache ?? REACTION_FALLBACK);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        loadCatalog().then(list => { if (!cancelled) setCatalog(list); });
        return () => { cancelled = true; };
    }, []);

    // Close the picker on an outside tap or Escape.
    useEffect(() => {
        if (!pickerOpen) return;
        const onPointer = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setPickerOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false); };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [pickerOpen]);

    useEffect(() => () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    }, []);

    const safeSummary = summary ?? emptyReactionSummary();
    const mine = safeSummary.mine;
    const mineMeta = catalog.find(c => c.kind === mine);

    const apply = useCallback(async (kind: ReactionKind) => {
        if (disabled || busy) return;
        setPickerOpen(false);

        // Optimistic: compute what the server will almost certainly return.
        const before = safeSummary;
        const counts = { ...(before.counts ?? {}) };
        let total = before.total;
        let nextMine: ReactionKind | undefined = kind;

        if (before.mine === kind) {
            counts[kind] = Math.max(0, (counts[kind] ?? 1) - 1);
            total = Math.max(0, total - 1);
            nextMine = undefined;
        } else {
            if (before.mine) {
                counts[before.mine] = Math.max(0, (counts[before.mine] ?? 1) - 1);
            } else {
                total += 1;
            }
            counts[kind] = (counts[kind] ?? 0) + 1;
        }
        onChange({ ...before, counts, total, mine: nextMine });

        setBusy(true);
        try {
            const res = await react(subjectType, subjectId, kind);
            onChange(res.summary); // the server's answer always wins
        } catch {
            onChange(before); // roll back exactly
            onError?.('Could not save your reaction. Please try again.');
        } finally {
            setBusy(false);
        }
    }, [disabled, busy, safeSummary, onChange, onError, subjectType, subjectId]);

    const startPress = () => {
        if (disabled) return;
        pressTimer.current = setTimeout(() => setPickerOpen(true), LONG_PRESS_MS);
    };
    const cancelPress = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const size = compact ? 13 : 15;
    const label = mineMeta ? mineMeta.label : 'Like';

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                disabled={disabled || busy}
                onPointerDown={startPress}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onClick={() => apply(mine ?? 'like')}
                onContextMenu={e => { e.preventDefault(); setPickerOpen(true); }}
                aria-label={mine ? `Remove your ${label} reaction` : 'Like this'}
                aria-pressed={!!mine}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                className={`flex items-center gap-1.5 rounded-lg transition-colors disabled:opacity-50
                    ${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}
                    ${mine ? 'text-nile-blue font-semibold bg-nile-blue/5' : 'text-paper-700 hover:bg-paper-100'}`}
            >
                {busy ? (
                    <Loader2 size={size} className="animate-spin" />
                ) : mineMeta ? (
                    <span aria-hidden className={compact ? 'text-[13px]' : 'text-[15px]'}>{mineMeta.emoji}</span>
                ) : (
                    <ThumbsUp size={size} strokeWidth={2} />
                )}
                <span>{label}</span>
                {safeSummary.total > 0 && (
                    <span className={mine ? 'text-nile-blue' : 'text-paper-600'}>{safeSummary.total}</span>
                )}
            </button>

            {pickerOpen && (
                <div
                    role="menu"
                    aria-label="Choose a reaction"
                    className="absolute bottom-full left-0 mb-2 z-30 flex items-center gap-0.5 bg-white border border-paper-300 rounded-full shadow-soft-md px-1.5 py-1 animate-in fade-in slide-in-from-bottom-1 duration-150"
                >
                    {catalog.map(meta => (
                        <button
                            key={meta.kind}
                            type="button"
                            role="menuitem"
                            onClick={() => apply(meta.kind)}
                            title={meta.label}
                            aria-label={meta.label}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg
                                        transition-transform hover:scale-125 active:scale-110
                                        ${meta.kind === mine ? 'bg-nile-blue/10' : 'hover:bg-paper-100'}`}
                        >
                            <span aria-hidden>{meta.emoji}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * The compact facepile of reaction emoji plus a total, shown above the action
 * row. Renders nothing when there are no reactions, so an untouched post has
 * no empty scaffolding.
 */
export const ReactionCount: React.FC<{
    summary: ReactionSummary;
    onClick?: () => void;
}> = ({ summary, onClick }) => {
    const safe = summary ?? emptyReactionSummary();
    if (safe.total <= 0) return null;

    const catalog = catalogCache ?? REACTION_FALLBACK;
    const top = (safe.top ?? []).slice(0, 3);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            aria-label={`${safe.total} ${safe.total === 1 ? 'reaction' : 'reactions'}`}
            className="flex items-center gap-1 text-[11px] text-paper-700 hover:text-ink-700 transition-colors disabled:hover:text-paper-700 disabled:cursor-default"
        >
            <span className="flex -space-x-1" aria-hidden>
                {top.map(kind => {
                    const meta = catalog.find(c => c.kind === kind);
                    return (
                        <span
                            key={kind}
                            className="w-4 h-4 rounded-full bg-white ring-1 ring-paper-300 flex items-center justify-center text-[10px]"
                        >
                            {meta?.emoji ?? '👍'}
                        </span>
                    );
                })}
            </span>
            <span>{safe.total}</span>
        </button>
    );
};

export default ReactionBar;
