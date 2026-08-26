import React, { useEffect, useRef, useState } from 'react';
import {
    MoreHorizontal, Flag, EyeOff, VolumeX, UserX, Bookmark, BookmarkCheck,
    Trash2, Link2, Loader2, Check,
} from 'lucide-react';
import {
    sendFeedSignal, muteUser, blockUser, saveBookmark, removeBookmark,
} from '../../services/socialService';
import ReportModal from './ReportModal';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';

/**
 * The per-post overflow menu.
 *
 * Every safety action a reader needs is one tap from the content itself:
 * hide, not-interested, mute, block, report. Burying these in a settings page
 * is the difference between a safety feature that gets used and one that does
 * not — someone being harassed will not go hunting for a menu.
 *
 * The destructive actions (mute/block) confirm inline rather than acting
 * immediately, because both are easy to hit by accident and surprising to undo.
 */

interface PostActionsMenuProps {
    postId: string;
    authorId: string;
    authorName: string;
    isOwnPost: boolean;
    canDelete: boolean;
    bookmarked: boolean;
    onHidden: (postId: string) => void;
    onBookmarkChange: (postId: string, bookmarked: boolean) => void;
    onDelete?: (postId: string) => void;
}

type Confirming = 'mute' | 'block' | null;

const PostActionsMenu: React.FC<PostActionsMenuProps> = ({
    postId, authorId, authorName, isOwnPost, canDelete, bookmarked,
    onHidden, onBookmarkChange, onDelete,
}) => {
    const { showToast } = useToast();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<Confirming>(null);
    const [reporting, setReporting] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setConfirming(null);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setOpen(false); setConfirming(null); }
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const run = async (key: string, fn: () => Promise<void>, successMessage?: string) => {
        setBusy(key);
        try {
            await fn();
            if (successMessage) showToast(successMessage, 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Something went wrong. Please try again.'), 'error');
        } finally {
            setBusy(null);
            setOpen(false);
            setConfirming(null);
        }
    };

    const handleHide = () =>
        run('hide', async () => {
            await sendFeedSignal('hide_post', 'post', postId);
            onHidden(postId);
        }, 'Post hidden. You will not see it again.');

    const handleNotInterested = () =>
        run('not_interested', async () => {
            await sendFeedSignal('not_interested', 'post', postId);
            onHidden(postId);
        }, 'Thanks — we will show you fewer posts like this.');

    const handleMute = () =>
        run('mute', async () => {
            await muteUser(authorId, 'all');
            onHidden(postId);
        }, `You will not see posts from ${authorName}. They are not notified.`);

    const handleBlock = () =>
        run('block', async () => {
            await blockUser(authorId);
            onHidden(postId);
        }, `${authorName} is blocked. They can no longer see or contact you.`);

    const handleBookmark = () =>
        run('bookmark', async () => {
            if (bookmarked) {
                await removeBookmark('post', postId);
                onBookmarkChange(postId, false);
            } else {
                await saveBookmark('post', postId);
                onBookmarkChange(postId, true);
            }
        }, bookmarked ? 'Removed from saved' : 'Saved');

    const handleCopyLink = async () => {
        const url = `${window.location.origin}/student?post=${postId}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showToast('Could not copy the link', 'error');
        }
    };

    const itemClass =
        'w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs text-ink-700 ' +
        'hover:bg-paper-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <>
            <div className="relative" ref={ref}>
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    aria-label="Post options"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="p-1.5 rounded-lg text-paper-600 hover:text-ink-700 hover:bg-paper-100 transition-colors"
                >
                    <MoreHorizontal size={16} />
                </button>

                {open && (
                    <div
                        role="menu"
                        className="absolute right-0 top-full mt-1 z-40 w-60 bg-white border border-paper-300 rounded-xl shadow-soft-md overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                        <button role="menuitem" className={itemClass} onClick={handleBookmark} disabled={busy === 'bookmark'}>
                            {busy === 'bookmark'
                                ? <Loader2 size={14} className="animate-spin" />
                                : bookmarked ? <BookmarkCheck size={14} className="text-nile-blue" /> : <Bookmark size={14} />}
                            {bookmarked ? 'Remove from saved' : 'Save post'}
                        </button>

                        <button role="menuitem" className={itemClass} onClick={handleCopyLink}>
                            {copied ? <Check size={14} className="text-nile-green" /> : <Link2 size={14} />}
                            {copied ? 'Link copied' : 'Copy link'}
                        </button>

                        {!isOwnPost && (
                            <>
                                <div className="h-px bg-paper-100 my-1" />

                                <button role="menuitem" className={itemClass} onClick={handleNotInterested} disabled={busy === 'not_interested'}>
                                    {busy === 'not_interested' ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                                    Not interested
                                </button>

                                <button role="menuitem" className={itemClass} onClick={handleHide} disabled={busy === 'hide'}>
                                    {busy === 'hide' ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                                    Hide this post
                                </button>

                                {/* Mute and block confirm inline: both are easy to
                                    mis-tap and unpleasant to undo by surprise. */}
                                {confirming === 'mute' ? (
                                    <div className="px-3.5 py-2.5 bg-paper-100">
                                        <p className="text-[11px] text-paper-700 mb-2">
                                            Mute {authorName}? You will stop seeing their posts. They are never told.
                                        </p>
                                        <div className="flex gap-2">
                                            <button onClick={handleMute} disabled={busy === 'mute'}
                                                className="flex-1 py-1.5 rounded-lg bg-ink-900 text-white text-[11px] font-medium disabled:opacity-50">
                                                {busy === 'mute' ? 'Muting…' : 'Mute'}
                                            </button>
                                            <button onClick={() => setConfirming(null)}
                                                className="flex-1 py-1.5 rounded-lg border border-paper-300 text-[11px] font-medium">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button role="menuitem" className={itemClass} onClick={() => setConfirming('mute')}>
                                        <VolumeX size={14} />
                                        Mute {authorName}
                                    </button>
                                )}

                                {confirming === 'block' ? (
                                    <div className="px-3.5 py-2.5 bg-red-50">
                                        <p className="text-[11px] text-red-700 mb-2">
                                            Block {authorName}? They will not be able to see your profile,
                                            your posts, or contact you — and you will not see theirs.
                                        </p>
                                        <div className="flex gap-2">
                                            <button onClick={handleBlock} disabled={busy === 'block'}
                                                className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-medium disabled:opacity-50">
                                                {busy === 'block' ? 'Blocking…' : 'Block'}
                                            </button>
                                            <button onClick={() => setConfirming(null)}
                                                className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-600 text-[11px] font-medium">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button role="menuitem" className={`${itemClass} text-red-600`} onClick={() => setConfirming('block')}>
                                        <UserX size={14} />
                                        Block {authorName}
                                    </button>
                                )}

                                <button role="menuitem" className={`${itemClass} text-red-600`}
                                    onClick={() => { setOpen(false); setReporting(true); }}>
                                    <Flag size={14} />
                                    Report post
                                </button>
                            </>
                        )}

                        {canDelete && onDelete && (
                            <>
                                <div className="h-px bg-paper-100 my-1" />
                                <button role="menuitem" className={`${itemClass} text-red-600`}
                                    onClick={() => { setOpen(false); onDelete(postId); }}>
                                    <Trash2 size={14} />
                                    Delete post
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {reporting && (
                <ReportModal
                    subjectType="post"
                    subjectId={postId}
                    subjectLabel={`${authorName}'s post`}
                    onClose={() => setReporting(false)}
                />
            )}
        </>
    );
};

export default PostActionsMenu;
