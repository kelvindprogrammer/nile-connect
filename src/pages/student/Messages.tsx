import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Send, Search, Phone, Video, Smile, Paperclip,
    ChevronLeft, MessageCircle, PhoneOff, MicOff, Mic, VideoOff, Loader2,
    Check, CheckCheck, X, FileText, Download,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import EmojiPicker from '../../components/EmojiPicker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useHeartbeat } from '../../hooks/useHeartbeat';
import {
    getConversations, getThread, sendMessage as apiSendMessage, sendTyping, uploadFile,
    type Conversation, type Message,
} from '../../services/messageService';
import { resizeImage } from '../../utils/imageResize';
import { formatClockTime, presenceLabel, isOnline } from '../../utils/formatDate';
import type { Peer, MediaConnection } from 'peerjs';

type CallType = 'audio' | 'video' | null;

const POLL_MS = 3000; // Poll the open thread for new messages / typing every 3s
const TYPING_THROTTLE_MS = 2000; // At most one "typing" ping every 2s

const Messages = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();
    useHeartbeat();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeUserId, setActiveUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [convLoading, setConvLoading] = useState(true);

    const [callType, setCallType] = useState<CallType>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // PeerJS state
    const peerRef = useRef<Peer | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const currentCallRef = useRef<MediaConnection | null>(null);
    const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pendingPartnerRef = useRef<{ id: string; full_name: string } | null>(null);

    const activeConv = conversations.find(c => c.user_id === activeUserId) || null;

    // Prepend a synthetic conversation entry for a newly-started chat (from the
    // Network "Message" deep link) until the backend has a real thread for it.
    const mergeWithPending = useCallback((data: Conversation[]): Conversation[] => {
        const pending = pendingPartnerRef.current;
        if (!pending || data.some(c => c.user_id === pending.id)) return data;
        return [
            { user_id: pending.id, full_name: pending.full_name, last_msg: '', last_time: '', unread: 0 },
            ...data,
        ];
    }, []);

    // ── Load conversations on mount, poll every 5s ──────────────────────────
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(mergeWithPending(data));
        } catch {
            /* ignore - backend may not have messages yet */
        }
    }, [mergeWithPending]);

    useEffect(() => {
        let cancelled = false;
        getConversations()
            .then(data => { if (!cancelled) setConversations(mergeWithPending(data)); })
            .catch(() => { if (!cancelled) setConversations(mergeWithPending([])); })
            .finally(() => { if (!cancelled) setConvLoading(false); });

        const id = setInterval(loadConversations, 5000);
        return () => { cancelled = true; clearInterval(id); };
    }, [loadConversations, mergeWithPending]);

    // ── Deep link from Network "Message" button ─────────────────────────────
    useEffect(() => {
        const target = (location.state as { startConversationWith?: { id: string; full_name: string } } | null)?.startConversationWith;
        if (!target) return;
        const t = setTimeout(() => {
            pendingPartnerRef.current = target;
            setActiveUserId(target.id);
            setConversations(prev => mergeWithPending(prev));
            window.history.replaceState({}, document.title);
        }, 0);
        return () => clearTimeout(t);
    }, [location.state, mergeWithPending]);

    // ── Call helpers (declared before the PeerJS effect that uses startCallTimer) ──
    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const startCallTimer = () => {
        setCallDuration(0);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    };

    // ── PeerJS init ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;
        const peerId = user.id.replace(/-/g, '');

        import('peerjs').then(({ Peer }) => {
            const peer = new Peer(peerId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            });
            peerRef.current = peer;

            peer.on('call', async (call) => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localStreamRef.current = stream;
                    call.answer(stream);
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                    call.on('stream', (remoteStream: MediaStream) => {
                        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
                    });
                    currentCallRef.current = call;
                    setCallType('video');
                    startCallTimer();
                } catch {
                    showToast('Could not access camera/microphone', 'error');
                }
            });

            peer.on('error', () => { /* ignore connection errors */ });
        }).catch(() => { /* PeerJS not available */ });

        return () => {
            peerRef.current?.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const startCall = async (type: CallType) => {
        if (!peerRef.current || !activeUserId) {
            showToast('Cannot start call right now', 'error');
            return;
        }
        try {
            const constraints = type === 'video'
                ? { video: true, audio: true }
                : { video: false, audio: true };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const peerId = activeUserId.replace(/-/g, '');
            const call = peerRef.current.call(peerId, stream);

            call.on('stream', (remoteStream: MediaStream) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
            });
            call.on('close', () => endCall());
            call.on('error', () => {
                showToast('Call failed — user may be offline', 'error');
                endCall();
            });

            currentCallRef.current = call;
            setCallType(type);
            startCallTimer();
        } catch {
            showToast('Could not access camera/microphone', 'error');
        }
    };

    const endCall = () => {
        currentCallRef.current?.close();
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        currentCallRef.current = null;
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        showToast(`Call ended (${formatDuration(callDuration)})`, 'success');
        setCallType(null);
        setIsMuted(false);
        setIsVideoOff(false);
    };

    const toggleMute = () => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
        setIsMuted(v => !v);
    };

    const toggleVideo = () => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
        setIsVideoOff(v => !v);
    };

    const filteredConvs = conversations.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="flex h-[calc(100vh-56px)] font-sans bg-white">

                {/* Conversations sidebar */}
                <div className={`${activeUserId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] lg:w-[340px] md:border-r border-gray-100 flex-col bg-white h-full flex-shrink-0`}>
                    <div className="p-4 border-b border-gray-100 space-y-3">
                        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:bg-white focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {convLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 size={24} className="animate-spin text-gray-300" />
                            </div>
                        ) : filteredConvs.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-sm text-gray-400">{searchTerm ? 'No chats found' : 'No conversations yet'}</p>
                                <p className="text-xs text-gray-300 mt-1">Connect with people in the Network tab</p>
                            </div>
                        ) : filteredConvs.map(conv => (
                            <div
                                key={conv.user_id}
                                onClick={() => setActiveUserId(conv.user_id)}
                                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-b border-gray-50
                                    ${activeUserId === conv.user_id ? 'bg-nile-blue/5' : 'hover:bg-gray-50'}`}
                            >
                                <Avatar
                                    name={conv.full_name}
                                    size="md"
                                    presence={conv.last_active_at ? (isOnline(conv.last_active_at) ? 'online' : 'offline') : undefined}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2">
                                        <h4 className="font-semibold text-gray-900 text-sm truncate">{conv.full_name}</h4>
                                        {conv.last_time && (
                                            <span className="text-[11px] text-gray-400 flex-shrink-0">{formatClockTime(conv.last_time)}</span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                        {conv.last_msg || 'No messages yet'}
                                    </p>
                                </div>
                                {conv.unread > 0 && (
                                    <span className="min-w-[20px] h-5 px-1.5 bg-nile-blue text-white rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                                        {conv.unread > 9 ? '9+' : conv.unread}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat area */}
                <div className={`${activeUserId !== null ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white h-full min-w-0`}>
                    {activeUserId ? (
                        <>
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button onClick={() => setActiveUserId(null)} className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-700 rounded-lg flex-shrink-0 transition-colors">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <Avatar
                                        name={activeConv?.full_name || '?'}
                                        size="md"
                                        presence={activeConv?.last_active_at ? (isOnline(activeConv.last_active_at) ? 'online' : 'offline') : undefined}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-gray-900 text-sm truncate">{activeConv?.full_name || 'User'}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{presenceLabel(activeConv?.last_active_at) || 'Offline'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button onClick={() => startCall('audio')} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-nile-blue transition-colors" title="Voice call">
                                        <Phone size={16} />
                                    </button>
                                    <button onClick={() => startCall('video')} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-nile-blue transition-colors" title="Video call">
                                        <Video size={16} />
                                    </button>
                                </div>
                            </div>

                            <ThreadPane key={activeUserId} toUserId={activeUserId} onActivity={loadConversations} />
                        </>
                    ) : (
                        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-12 gap-3">
                            <div className="w-16 h-16 bg-nile-blue/5 rounded-2xl flex items-center justify-center text-nile-blue/20">
                                <MessageCircle size={32} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Your messages</h3>
                                <p className="text-sm text-gray-400 mt-1">Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Call overlay */}
            {callType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-soft-lg max-w-md w-full p-6 space-y-5 text-center">
                        {callType === 'video' && (
                            <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden relative">
                                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-24 h-16 object-cover rounded-xl ring-2 ring-white" />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        <Avatar name={activeConv?.full_name || '?'} size="lg" />
                                    </div>
                                )}
                            </div>
                        )}
                        {callType === 'audio' && (
                            <div className="flex justify-center">
                                <Avatar name={activeConv?.full_name || '?'} size="xl" />
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{activeConv?.full_name || 'User'}</h3>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse" />
                                <p className="text-xs text-gray-400">
                                    {callType === 'video' ? 'Video call' : 'Voice call'} · {formatDuration(callDuration)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button onClick={endCall} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                                <PhoneOff size={20} />
                            </button>
                            {callType === 'video' && (
                                <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
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

export default Messages;
