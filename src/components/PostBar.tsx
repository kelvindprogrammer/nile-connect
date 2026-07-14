import React, { useRef, useState } from 'react';
import Avatar from './Avatar';
import { Image as ImageIcon, X, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfilePicture } from '../hooks/useProfilePicture';
import { useToast } from '../context/ToastContext';
import { createPost, type Post, type PostKind } from '../services/feedService';
import { uploadFile } from '../services/messageService';
import { resizeImage } from '../utils/imageResize';

interface PostBarProps {
    onPostCreated: (post: Post) => void;
    prefillJobId?: string;
    prefillContent?: string;
}

const KIND_OPTIONS: { value: PostKind; label: string; studentAllowed: boolean }[] = [
    { value: 'text', label: 'General', studentAllowed: true },
    { value: 'achievement', label: 'Achievement', studentAllowed: true },
    { value: 'announcement', label: 'Announcement', studentAllowed: false },
];

const PostBar: React.FC<PostBarProps> = ({ onPostCreated, prefillJobId, prefillContent }) => {
    const { user } = useAuth();
    const { picture } = useProfilePicture();
    const { showToast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);

    const [expanded, setExpanded] = useState(!!prefillJobId);
    const [content, setContent] = useState(prefillContent || '');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [kind, setKind] = useState<PostKind>(prefillJobId ? 'job' : 'text');

    const availableKinds = KIND_OPTIONS.filter(k => user?.role !== 'student' || k.studentAllowed);

    const firstName = user?.name ? user.name.split(' ')[0] : 'there';
    const displayName = user?.name || 'User';

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
            const resized = await resizeImage(f);
            setMediaFile(resized);
            setMediaPreview(URL.createObjectURL(resized));
            setExpanded(true);
        } catch {
            showToast('Could not load that image.', 'error');
        }
    };

    const removeMedia = () => {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaFile(null);
        setMediaPreview(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleCancel = () => {
        setContent('');
        removeMedia();
        setExpanded(!!prefillJobId);
        setKind(prefillJobId ? 'job' : 'text');
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile && kind !== 'job') return;
        setPosting(true);
        try {
            let mediaUrl: string | undefined;
            if (mediaFile) {
                const result = await uploadFile(mediaFile);
                mediaUrl = result.url;
            }
            const post = await createPost(content.trim() || 'Check out this opportunity', {
                mediaUrl, kind, jobId: kind === 'job' ? prefillJobId : undefined,
            });
            onPostCreated(post);
            handleCancel();
            showToast('Post published!', 'success');
        } catch {
            showToast('Could not publish post.', 'error');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="social-card p-4">
            <div className="flex items-start gap-3">
                <Avatar name={displayName} size="sm" src={picture || undefined} />
                <div className="flex-1 min-w-0">
                    {!expanded ? (
                        <button
                            onClick={() => setExpanded(true)}
                            className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-full py-2.5 px-4 text-sm text-gray-400 transition-colors"
                        >
                            What's on your mind, {firstName}?
                        </button>
                    ) : (
                        <textarea
                            autoFocus
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder={`What's on your mind, ${firstName}?`}
                            rows={3}
                            className="w-full border border-gray-200 rounded-2xl p-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all resize-none"
                        />
                    )}

                    {mediaPreview && (
                        <div className="social-media relative mt-3">
                            <img src={mediaPreview} alt="Attachment preview" />
                            <button
                                onClick={removeMedia}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {expanded && !prefillJobId && (
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                            {availableKinds.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setKind(opt.value)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                        kind === opt.value
                                            ? 'bg-nile-blue text-white border-nile-blue'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {expanded && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <button onClick={() => fileRef.current?.click()} className="action-btn">
                                <ImageIcon size={16} /> Photo
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={posting || (!content.trim() && !mediaFile)}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-nile-blue text-white rounded-full text-sm font-medium hover:bg-nile-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Post
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostBar;
