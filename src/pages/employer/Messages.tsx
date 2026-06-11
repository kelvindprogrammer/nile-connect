import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Search, ChevronLeft, MessageCircle, Plus, Loader2, X, Paperclip, Smile,
    Check, CheckCheck, FileText, Download,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import EmojiPicker from '../../components/EmojiPicker';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useHeartbeat } from '../../hooks/useHeartbeat';
import {
    getConversations, getThread, sendMessage as apiSendMessage, sendTyping, uploadFile, searchUsers,
    type Conversation, type Message, type UserProfile,
} from '../../services/messageService';
import { resizeImage } from '../../utils/imageResize';
import { formatClockTime, presenceLabel, isOnline } from '../../utils/formatDate';

const POLL_MS = 3000; // Poll the open thread for new messages / typing every 3s
const TYPING_THROTTLE_MS = 2000; // At most one "typing" ping every 2s

const EmployerMessages = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [search, setSearch] = useState('');
    const [convLoading, setConvLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);

    useHeartbeat();

    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch {
            /* ignore - backend may not have messages yet */
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        getConversations()
            .then(data => { if (!cancelled) setConversations(data); })
            .catch(() => { if (!cancelled) setConversations([]); })
            .finally(() => { if (!cancelled) setConvLoading(false); });

        const id = setInterval(loadConversations, 5000);
        return () => { cancelled = true; clearInterval(id); };
    }, [loadConversations]);

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (!q.trim()) { setSearchResults([]); return; }
        setSearching(true);
        try {
            setSearchResults(await searchUsers(q));
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const startConvo = (u: UserProfile) => {
        setSelected({ user_id: u.id, full_name: u.full_name, last_msg: '', last_time: '', unread: 0, last_active_at: u.last_active_at });
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const filtered = conversations.filter(c =>
        !search || c.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full bg-white overflow-hidden anime-fade-in font-sans pb-20 md:pb-0">

            {/* Conversation list */}
            <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-gray-100`}>
                <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
                        <button
                            onClick={() => { setShowSearch(s => !s); setSearchQuery(''); setSearchResults([]); }}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-nile-blue transition-colors"
                            title={showSearch ? 'Close' : 'New message'}
                        >
                            {showSearch ? <X size={18} /> : <Plus size={18} />}
                        </button>
                    </div>

                    {showSearch ? (
                        <div className="space-y-1">
                            <div className="relative">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input
                                    autoFocus
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Search students or staff..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:bg-white focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                                />
                            </div>
                            {searching ? (
                                <div className="flex justify-center py-3">
                                    <Loader2 size={16} className="animate-spin text-gray-300" />
                                </div>
                            ) : searchQuery && searchResults.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-3">No users found</p>
                            ) : (
                                searchResults.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => startConvo(u)}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <Avatar name={u.full_name} size="sm" presence={u.last_active_at ? (isOnline(u.last_active_at) ? 'online' : 'offline') : undefined} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                                            <p className="text-xs text-gray-400 capitalize">{u.role}{u.major ? ` · ${u.major}` : ''}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:bg-white focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {convLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 size={24} className="animate-spin text-gray-300" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
                            <MessageCircle size={28} className="text-gray-200" />
                            <p className="text-sm text-gray-400">{search ? 'No matches found' : 'No conversations yet'}</p>
                            {!search && (
                                <button onClick={() => setShowSearch(true)} className="text-sm font-medium text-nile-blue hover:underline">
                                    Start a conversation
                                </button>
                            )}
                        </div>
                    ) : filtered.map(c => (
                        <div
                            key={c.user_id}
                            onClick={() => setSelected(c)}
                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-b border-gray-50
                                ${selected?.user_id === c.user_id ? 'bg-nile-blue/5' : 'hover:bg-gray-50'}`}
                        >
                            <Avatar
                                name={c.full_name}
                                size="md"
                                presence={c.last_active_at ? (isOnline(c.last_active_at) ? 'online' : 'offline') : undefined}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline gap-2">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">{c.full_name}</h4>
                                    {c.last_time && <span className="text-[11px] text-gray-400 flex-shrink-0">{formatClockTime(c.last_time)}</span>}
                                </div>
                                <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                    {c.last_msg || 'No messages yet'}
                                </p>
                            </div>
                            {c.unread > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 bg-nile-blue text-white rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                                    {c.unread > 9 ? '9+' : c.unread}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat view */}
            <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white min-w-0`}>
                {selected ? (
                    <>
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
                            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-700 rounded-lg flex-shrink-0 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <Avatar
                                name={selected.full_name}
                                size="md"
                                presence={selected.last_active_at ? (isOnline(selected.last_active_at) ? 'online' : 'offline') : undefined}
                            />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">{selected.full_name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{presenceLabel(selected.last_active_at) || 'Offline'}</p>
                            </div>
                        </div>

                        <ThreadPane key={selected.user_id} toUserId={selected.user_id} onActivity={loadConversations} />
                    </>
                ) : (
                    <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-12 gap-3">
                        <div className="w-16 h-16 bg-nile-blue/5 rounded-2xl flex items-center justify-center text-nile-blue/20">
                            <MessageCircle size={32} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Your messages</h3>
                            <p className="text-sm text-gray-400 mt-1 max-w-xs">
                                Connect with students and career services — select a conversation or start a new one
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSearch(true)}
                            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-nile-blue text-white hover:bg-nile-blue-600 transition-colors"
                        >
                            <Plus size={14} /> New message
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Thread pane: messages, typing, read receipts, emoji & attachments ──────
// Mounted with key={toUserId} so each conversation gets a fresh loading
// state and poll loop without needing a synchronous setState in an effect.
interface ThreadPaneProps {
    toUserId: string;
    onActivity: () => void;
}

const ThreadPane: React.FC<ThreadPaneProps> = ({ toUserId, onActivity }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [messages, setMessages] = useState<Message[]>([]);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastTypingSentRef = useRef(0);

    const loadThread = useCallback(() => {
        getThread(toUserId)
            .then(({ messages, partnerTyping }) => {
                setMessages(messages);
                setPartnerTyping(partnerTyping);
            })
            .catch(() => { /* ignore */ });
    }, [toUserId]);

    useEffect(() => {
        let cancelled = false;
        getThread(toUserId)
            .then(({ messages, partnerTyping }) => {
                if (cancelled) return;
                setMessages(messages);
                setPartnerTyping(partnerTyping);
                onActivity();
            })
            .catch(() => { /* ignore */ })
            .finally(() => { if (!cancelled) setLoading(false); });

        pollRef.current = setInterval(loadThread, POLL_MS);
        return () => {
            cancelled = true;
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [toUserId, loadThread, onActivity]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInputChange = (value: string) => {
        setMsg(value);
        const now = Date.now();
        if (value.trim() && now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
            lastTypingSentRef.current = now;
            sendTyping(toUserId).catch(() => { /* ignore */ });
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = msg.trim();
        if (!content || sending) return;

        setMsg('');
        setSending(true);

        const optimistic: Message = {
            id: `opt-${Date.now()}`,
            sender_id: user?.id || '',
            receiver_id: toUserId,
            content,
            is_read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        try {
            const sent = await apiSendMessage(toUserId, content);
            setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m));
            onActivity();
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setMsg(content);
            showToast('Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (file.size > 10 * 1024 * 1024) {
            showToast('File is too large (max 10MB).', 'error');
            return;
        }

        setUploading(true);
        const optimisticId = `opt-${Date.now()}`;
        try {
            const toUpload = await resizeImage(file);
            const result = await uploadFile(toUpload);
            const optimistic: Message = {
                id: optimisticId,
                sender_id: user?.id || '',
                receiver_id: toUserId,
                content: '',
                is_read: false,
                created_at: new Date().toISOString(),
                media_url: result.url,
                media_type: result.media_type,
            };
            setMessages(prev => [...prev, optimistic]);
            const sent = await apiSendMessage(toUserId, '', { url: result.url, type: result.media_type });
            setMessages(prev => prev.map(m => m.id === optimisticId ? sent : m));
            onActivity();
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            showToast('Could not send the attachment. Uploads may not be set up yet.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        const input = inputRef.current;
        if (input) {
            const start = input.selectionStart ?? msg.length;
            const end = input.selectionEnd ?? msg.length;
            const next = msg.slice(0, start) + emoji + msg.slice(end);
            setMsg(next);
            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            });
        } else {
            setMsg(prev => prev + emoji);
        }
        setShowEmoji(false);
    };

    const renderReceipt = (m: Message) => {
        if (m.id.startsWith('opt-')) return <Check size={12} className="text-white/60" />;
        if (m.is_read) return <CheckCheck size={12} className="text-sky-300" />;
        return <CheckCheck size={12} className="text-white/60" />;
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center pt-10">
                        <Loader2 size={24} className="animate-spin text-gray-300" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-70">
                        <MessageCircle size={32} className="text-gray-200" />
                        <p className="text-sm text-gray-400">Start the conversation</p>
                    </div>
                ) : (
                    <>
                        {messages.map(m => {
                            const isMe = m.sender_id === user?.id;
                            return (
                                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-nile-blue text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'}`}>
                                        {m.media_url && (
                                            m.media_type === 'image' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setLightbox(m.media_url!)}
                                                    className="social-media block mb-1.5 max-w-[220px] cursor-zoom-in"
                                                >
                                                    <img src={m.media_url} alt="Attachment" loading="lazy" />
                                                </button>
                                            ) : (
                                                <a
                                                    href={m.media_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1.5 text-xs font-medium ${isMe ? 'bg-white/10 text-white' : 'bg-gray-50 border border-gray-100 text-gray-700'}`}
                                                >
                                                    <FileText size={16} className="flex-shrink-0" />
                                                    <span className="truncate flex-1">{decodeURIComponent(m.media_url.split('/').pop() || 'Attachment')}</span>
                                                    <Download size={14} className="flex-shrink-0" />
                                                </a>
                                            )
                                        )}
                                        {m.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                                        <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-white/60' : 'text-gray-300'}`}>
                                            <span className="text-[10px]">{formatClockTime(m.created_at)}</span>
                                            {isMe && renderReceipt(m)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {partnerTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                                    <span className="typing-dots"><span /><span /><span /></span>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 md:p-4 border-t border-gray-100 bg-white flex-shrink-0 relative">
                {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full pl-1.5 pr-1.5 py-1.5 focus-within:border-nile-blue focus-within:ring-2 focus-within:ring-nile-blue/10 transition-all">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-nile-blue hover:bg-white transition-colors flex-shrink-0 disabled:opacity-50"
                        title="Attach file"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 min-w-0 px-1"
                        value={msg}
                        onChange={e => handleInputChange(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowEmoji(v => !v)}
                        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-white transition-colors flex-shrink-0"
                        title="Emoji"
                    >
                        <Smile size={16} />
                    </button>
                    <button
                        type="submit"
                        disabled={!msg.trim() || sending}
                        className="w-9 h-9 bg-nile-blue text-white rounded-full flex items-center justify-center hover:bg-nile-blue-600 transition-colors disabled:opacity-30 flex-shrink-0"
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
            </form>

            {lightbox && (
                <div
                    className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <button
                        onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <img src={lightbox} alt="Attachment" className="max-w-full max-h-full rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
                </div>
            )}
        </>
    );
};

export default EmployerMessages;
