import React, { useEffect, useRef, useState } from 'react';
import {
    X, Type, Image as ImageIcon, BarChart3, Loader2, Send,
    Globe, Users, Star, Plus, Trash2, AlertCircle,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { uploadFile } from '../../services/messageService';
import {
    createStory, STORY_BACKGROUNDS, backgroundCss, type StoryKind,
} from '../../services/storiesService';
import { getPrivacySettings, type Audience } from '../../services/socialService';
import { POLL_LIMITS } from '../../services/pollService';

/**
 * The story composer.
 *
 * Three modes — text, media, poll — chosen with a tab strip rather than hidden
 * behind a menu, because the mode determines the whole editing surface and
 * people decide what kind of story they are making before they start.
 *
 * The upload state blocks the Share button and covers the preview, so a slow
 * connection cannot produce a half-made story. A determinate progress bar would
 * be better on Nigerian mobile data and is the obvious next improvement — it
 * needs the upload service to surface XHR progress events, which it does not
 * yet do.
 */

interface StoryComposerProps {
    onClose: () => void;
    onPosted: () => void;
}

const MAX_TEXT = 280;

const AUDIENCE_OPTIONS: { value: Audience; label: string; Icon: typeof Globe }[] = [
    { value: 'everyone', label: 'Everyone', Icon: Globe },
    { value: 'connections', label: 'Connections', Icon: Users },
    { value: 'close_friends', label: 'Close friends', Icon: Star },
];

const StoryComposer: React.FC<StoryComposerProps> = ({ onClose, onPosted }) => {
    const { showToast } = useToast();
    const [mode, setMode] = useState<StoryKind | 'poll'>('text');
    const [text, setText] = useState('');
    const [background, setBackground] = useState<string>(STORY_BACKGROUNDS[0].value);
    const [audience, setAudience] = useState<Audience>('connections');
    const [allowedAudiences, setAllowedAudiences] = useState<Audience[]>(['everyone', 'connections']);

    const [mediaUrl, setMediaUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [pollAnonymous, setPollAnonymous] = useState(false);

    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Only offer close-friends once the list exists; publishing to an empty
    // list silently reaches nobody.
    useEffect(() => {
        let cancelled = false;
        getPrivacySettings()
            .then(res => {
                if (cancelled) return;
                setAllowedAudiences(res.audiences.filter(a => a !== 'only_me'));
                setAudience(res.settings.default_story_audience);
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setUploading(true);
        try {
            const kind = file.type.startsWith('video/') ? 'video' : 'image';

            // Read intrinsic dimensions locally so the viewer can reserve the
            // right aspect box before the media loads.
            if (kind === 'image') {
                const url = URL.createObjectURL(file);
                await new Promise<void>(resolve => {
                    const img = new Image();
                    img.onload = () => {
                        setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
                    img.src = url;
                });
            }

            // ?accept=media confines this endpoint to images and video, so a
            // story upload cannot be used to host arbitrary documents.
            const { url } = await uploadFile(file, 'media');
            setMediaUrl(url);
            setMode(kind);
        } catch (err) {
            setError(getErrorMessage(err, 'That upload failed. Please try again.'));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const validate = (): string | null => {
        if (mode === 'text' && !text.trim()) return 'Write something for your story.';
        if ((mode === 'image' || mode === 'video') && !mediaUrl) return 'Choose a photo or video.';
        if (mode === 'poll') {
            if (!pollQuestion.trim()) return 'Give your poll a question.';
            const filled = pollOptions.map(o => o.trim()).filter(Boolean);
            if (filled.length < POLL_LIMITS.minOptions) return 'A poll needs at least two options.';
        }
        return null;
    };

    const handlePost = async () => {
        const problem = validate();
        if (problem) { setError(problem); return; }
        setPosting(true);
        setError(null);
        try {
            await createStory({
                // A poll story is a text story carrying a poll, so the poll has
                // a readable backdrop rather than floating on nothing.
                kind: mode === 'poll' ? 'text' : mode,
                text: mode === 'poll' ? pollQuestion.trim() : text.trim() || undefined,
                background_color: mode === 'text' || mode === 'poll' ? background : undefined,
                media_url: mediaUrl || undefined,
                width: dimensions?.w,
                height: dimensions?.h,
                audience,
                poll: mode === 'poll'
                    ? {
                        question: pollQuestion.trim(),
                        options: pollOptions.map(o => o.trim()).filter(Boolean),
                        is_anonymous: pollAnonymous,
                    }
                    : undefined,
            });
            showToast('Your story is live for 24 hours', 'success');
            onPosted();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not share your story.'));
        } finally {
            setPosting(false);
        }
    };

    const tabs = [
        { value: 'text' as const, label: 'Text', Icon: Type },
        { value: 'image' as const, label: 'Photo/Video', Icon: ImageIcon },
        { value: 'poll' as const, label: 'Poll', Icon: BarChart3 },
    ];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Create a story"
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-3 border-b border-paper-300">
                    <h2 className="text-base font-semibold text-ink-800">Create a story</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-paper-200 text-paper-700">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex gap-1" role="tablist" aria-label="Story type">
                        {tabs.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                role="tab"
                                aria-selected={mode === value || (value === 'image' && mode === 'video')}
                                onClick={() => { setMode(value); setError(null); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors
                                    ${mode === value || (value === 'image' && mode === 'video')
                                        ? 'bg-nile-blue text-white'
                                        : 'bg-paper-100 text-paper-700 hover:bg-paper-200'}`}
                            >
                                <Icon size={13} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Live preview — people should see what they are publishing. */}
                    <div
                        className="rounded-xl overflow-hidden aspect-[9/16] max-h-64 flex items-center justify-center relative"
                        style={{
                            background: mode === 'image' || mode === 'video'
                                ? '#111'
                                : backgroundCss(background),
                        }}
                    >
                        {mode === 'image' && mediaUrl && (
                            <img src={mediaUrl} alt="Story preview" className="w-full h-full object-contain" />
                        )}
                        {mode === 'video' && mediaUrl && (
                            <video src={mediaUrl} className="w-full h-full object-contain" controls playsInline />
                        )}
                        {(mode === 'text' || mode === 'poll') && (
                            <p className="text-white text-lg font-semibold text-center px-6 break-words">
                                {mode === 'poll' ? pollQuestion || 'Your poll question' : text || 'Your story'}
                            </p>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                                <Loader2 size={22} className="animate-spin text-white" />
                                <p className="text-xs text-white/80">Uploading…</p>
                            </div>
                        )}
                    </div>

                    {mode === 'text' && (
                        <>
                            <div>
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value.slice(0, MAX_TEXT))}
                                    rows={3}
                                    placeholder="What's happening?"
                                    aria-label="Story text"
                                    className="w-full border border-paper-300 rounded-xl p-3 text-sm resize-none outline-none
                                               focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                                />
                                <p className="text-[11px] text-paper-600 text-right mt-1">
                                    {text.length}/{MAX_TEXT}
                                </p>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Background">
                                {STORY_BACKGROUNDS.map(bg => (
                                    <button
                                        key={bg.value}
                                        role="radio"
                                        aria-checked={background === bg.value}
                                        aria-label={bg.label}
                                        onClick={() => setBackground(bg.value)}
                                        style={{ background: bg.css }}
                                        className={`w-9 h-9 rounded-full flex-shrink-0 transition-transform
                                            ${background === bg.value ? 'ring-2 ring-offset-2 ring-nile-blue scale-110' : ''}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {(mode === 'image' || mode === 'video') && (
                        <>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={handleFile}
                            />
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="w-full py-3 border-2 border-dashed border-paper-300 rounded-xl text-xs
                                           font-medium text-paper-700 hover:border-nile-blue hover:text-nile-blue
                                           transition-colors disabled:opacity-50"
                            >
                                {mediaUrl ? 'Choose a different file' : 'Choose a photo or video'}
                            </button>
                            <input
                                value={text}
                                onChange={e => setText(e.target.value.slice(0, MAX_TEXT))}
                                placeholder="Add a caption (optional)"
                                aria-label="Caption"
                                className="w-full border border-paper-300 rounded-xl py-2.5 px-3 text-sm outline-none
                                           focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                            />
                        </>
                    )}

                    {mode === 'poll' && (
                        <div className="space-y-2">
                            <input
                                value={pollQuestion}
                                onChange={e => setPollQuestion(e.target.value.slice(0, POLL_LIMITS.maxQuestionLength))}
                                placeholder="Ask a question"
                                aria-label="Poll question"
                                className="w-full border border-paper-300 rounded-xl py-2.5 px-3 text-sm outline-none
                                           focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                            />
                            {pollOptions.map((option, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={option}
                                        onChange={e => {
                                            const next = [...pollOptions];
                                            next[i] = e.target.value.slice(0, POLL_LIMITS.maxOptionLength);
                                            setPollOptions(next);
                                        }}
                                        placeholder={`Option ${i + 1}`}
                                        aria-label={`Poll option ${i + 1}`}
                                        className="flex-1 border border-paper-300 rounded-xl py-2 px-3 text-sm outline-none
                                                   focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                                    />
                                    {pollOptions.length > POLL_LIMITS.minOptions && (
                                        <button
                                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                                            aria-label={`Remove option ${i + 1}`}
                                            className="px-2 text-paper-600 hover:text-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < POLL_LIMITS.maxOptions && (
                                <button
                                    onClick={() => setPollOptions([...pollOptions, ''])}
                                    className="text-xs font-medium text-nile-blue hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> Add option
                                </button>
                            )}
                            <label className="flex items-center gap-2 text-xs text-paper-700 pt-1">
                                <input
                                    type="checkbox"
                                    checked={pollAnonymous}
                                    onChange={e => setPollAnonymous(e.target.checked)}
                                    className="accent-nile-blue"
                                />
                                Hide who voted for what
                            </label>
                        </div>
                    )}

                    <div>
                        <p className="text-[11px] font-medium text-paper-700 mb-1.5">Who can see this?</p>
                        <div className="flex gap-1.5" role="radiogroup" aria-label="Story audience">
                            {AUDIENCE_OPTIONS.filter(o => allowedAudiences.includes(o.value)).map(({ value, label, Icon }) => (
                                <button
                                    key={value}
                                    role="radio"
                                    aria-checked={audience === value}
                                    onClick={() => setAudience(value)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px]
                                                font-medium transition-colors
                                        ${audience === value
                                            ? 'bg-nile-blue/10 text-nile-blue ring-1 ring-nile-blue/30'
                                            : 'bg-paper-100 text-paper-700 hover:bg-paper-200'}`}
                                >
                                    <Icon size={12} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handlePost}
                        disabled={posting || uploading}
                        className="w-full py-3 rounded-xl bg-nile-blue text-white text-sm font-semibold
                                   flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-nile-blue-600 transition-colors"
                    >
                        {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        {posting ? 'Sharing…' : 'Share to your story'}
                    </button>
                    <p className="text-[11px] text-paper-600 text-center">
                        Your story disappears after 24 hours.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StoryComposer;
