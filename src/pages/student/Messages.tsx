import React, { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Send, MoreVertical, Search, Phone, Video, Smile, Paperclip,
    ChevronLeft, MessageCircle, PhoneOff, MicOff, Mic, VideoOff, Loader2,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    getConversations, getThread, sendMessage as apiSendMessage,
    type Conversation, type Message,
} from '../../services/messageService';

type CallType = 'audio' | 'video' | null;

const POLL_MS = 3000; // Poll for new messages every 3s

const Messages = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeUserId, setActiveUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [msg, setMsg] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [convLoading, setConvLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [callType, setCallType] = useState<CallType>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // PeerJS state
    const peerRef = useRef<any>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const currentCallRef = useRef<any>(null);
    const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeConv = conversations.find(c => c.user_id === activeUserId) || null;

    // ── Load conversations on mount, poll every 5s ──────────────────────────
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch {
            /* ignore - backend may not have messages yet */
        } finally {
            setConvLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
        const id = setInterval(loadConversations, 5000);
        return () => clearInterval(id);
    }, [loadConversations]);

    // ── Load thread when active user changes; poll every 3s ─────────────────
    const loadThread = useCallback(async (toId: string) => {
        try {
            const data = await getThread(toId);
            setMessages(data);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!activeUserId) { setMessages([]); return; }
        setMsgLoading(true);
        loadThread(activeUserId).finally(() => setMsgLoading(false));

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => loadThread(activeUserId), POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [activeUserId, loadThread]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
    }, [user?.id]);

    // ── Call helpers ─────────────────────────────────────────────────────────
    const startCallTimer = () => {
        setCallDuration(0);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    };

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

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msg.trim() || !activeUserId || sending) return;

        const content = msg.trim();
        setMsg('');
        setSending(true);

        // Optimistic update
        const optimistic: Message = {
            id: `opt-${Date.now()}`,
            sender_id: user?.id || '',
            receiver_id: activeUserId,
            content,
            is_read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        try {
            const sent = await apiSendMessage(activeUserId, content);
            setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m));
            // Refresh conversations to update last message
            loadConversations();
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setMsg(content);
            showToast('Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    };

    const filteredConvs = conversations.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return isToday
            ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-56px)] font-sans bg-white">

                {/* Conversations sidebar */}
                <div className={`${activeUserId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] lg:w-[340px] md:border-r-[2px] border-black flex-col bg-nile-white h-full flex-shrink-0`}>
                    <div className="p-4 border-b-[2px] border-black space-y-3">
                        <h2 className="text-xl font-black text-black uppercase tracking-tight">Messages .</h2>
                        <div className="relative">
                            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="SEARCH..."
                                className="w-full pl-9 pr-4 py-2.5 border-[2px] border-black rounded-xl font-bold text-[10px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {convLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 size={24} className="animate-spin text-nile-blue/40" />
                            </div>
                        ) : filteredConvs.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">
                                    {searchTerm ? 'No chats found' : 'No conversations yet'}
                                </p>
                                <p className="text-[8px] text-black/20 mt-1">Connect with people in the Network tab</p>
                            </div>
                        ) : filteredConvs.map(conv => (
                            <div
                                key={conv.user_id}
                                onClick={() => setActiveUserId(conv.user_id)}
                                className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-black/5
                                    ${activeUserId === conv.user_id ? 'bg-white border-l-[3px] border-l-nile-blue' : 'hover:bg-white/70'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar name={conv.full_name} size="md" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="font-black text-black text-[10px] uppercase truncate mb-1">{conv.full_name}</h4>
                                        <span className="text-[7px] font-black text-black/30 uppercase ml-2 flex-shrink-0">{formatTime(conv.last_time)}</span>
                                    </div>
                                    <p className={`text-[9px] truncate uppercase ${conv.unread > 0 ? 'text-black font-black' : 'text-black/40 font-bold'}`}>
                                        {conv.last_msg || '...'}
                                    </p>
                                </div>
                                {conv.unread > 0 && (
                                    <div className="w-5 h-5 bg-nile-blue text-white rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0">
                                        {conv.unread}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat area */}
                <div className={`${activeUserId !== null ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white h-full min-w-0`}>
                    {activeConv || activeUserId ? (
                        <>
                            <div className="px-4 py-3 border-b-[2px] border-black flex items-center justify-between bg-white flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setActiveUserId(null)} className="md:hidden p-1.5 hover:bg-black/5 rounded-lg">
                                        <ChevronLeft size={22} strokeWidth={3} />
                                    </button>
                                    <Avatar name={activeConv?.full_name || '?'} size="md" />
                                    <div>
                                        <h3 className="font-black text-black uppercase text-xs leading-none">{activeConv?.full_name || 'User'}</h3>
                                        <p className="text-[8px] font-black text-nile-blue/40 uppercase mt-0.5">NILE CONNECT</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => startCall('audio')}
                                        className="p-2 bg-nile-white border-[2px] border-black rounded-xl hover:bg-nile-green hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                                        title="Voice call"
                                    >
                                        <Phone size={15} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => startCall('video')}
                                        className="p-2 bg-nile-white border-[2px] border-black rounded-xl hover:bg-nile-blue hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                                        title="Video call"
                                    >
                                        <Video size={15} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-nile-white/30">
                                {msgLoading ? (
                                    <div className="flex justify-center pt-10">
                                        <Loader2 size={24} className="animate-spin text-nile-blue/40" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                                        <MessageCircle size={32} className="text-black/20" />
                                        <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">Start the conversation</p>
                                    </div>
                                ) : messages.map(m => {
                                    const isMe = m.sender_id === user?.id;
                                    return (
                                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && (
                                                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-auto mb-1 border border-black/10">
                                                    <Avatar name={activeConv?.full_name || '?'} size="sm" />
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] px-4 py-3 rounded-[18px] border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                                ${isMe ? 'bg-nile-blue text-white rounded-tr-sm' : 'bg-white text-black rounded-tl-sm'}`}
                                            >
                                                <p className="font-bold text-[11px] md:text-sm leading-relaxed">{m.content}</p>
                                                <span className={`block mt-1 text-[7px] font-black text-right ${isMe ? 'text-white/50' : 'text-black/30'}`}>
                                                    {formatTime(m.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSend} className="p-3 md:p-4 border-t-[2px] border-black bg-white flex-shrink-0">
                                <div className="flex items-center gap-2 bg-nile-white border-[2px] border-black rounded-[20px] p-1.5 pr-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-none focus-within:border-nile-blue transition-all">
                                    <button type="button" className="p-2 text-black/30 hover:text-nile-blue transition-colors flex-shrink-0">
                                        <Paperclip size={15} strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="TYPE A MESSAGE..."
                                        className="flex-1 bg-transparent border-none outline-none font-bold text-[11px] uppercase min-w-0"
                                        value={msg}
                                        onChange={e => setMsg(e.target.value)}
                                    />
                                    <button type="button" className="hidden sm:block p-2 text-black/30 hover:text-black transition-colors flex-shrink-0">
                                        <Smile size={15} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!msg.trim() || sending}
                                        className="w-9 h-9 bg-nile-green text-black border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-30 flex-shrink-0"
                                    >
                                        {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} strokeWidth={3} />}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-12 gap-5">
                            <div className="w-20 h-20 bg-nile-blue/5 rounded-[24px] border-2 border-dashed border-black/10 flex items-center justify-center text-black/10">
                                <MessageCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-black uppercase">Your Inbox .</h3>
                                <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mt-1">Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Video call overlay */}
            {callType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-white border-[3px] border-black rounded-[32px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 space-y-5 text-center">
                        {callType === 'video' && (
                            <div className="w-full aspect-video bg-gray-900 rounded-[20px] border-[2px] border-black overflow-hidden relative">
                                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-24 h-16 object-cover rounded-xl border-2 border-white" />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        <Avatar name={activeConv?.full_name || '?'} size="lg" />
                                    </div>
                                )}
                            </div>
                        )}
                        {callType === 'audio' && (
                            <div className="w-24 h-24 mx-auto rounded-full border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]">
                                <Avatar name={activeConv?.full_name || '?'} size="lg" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-black uppercase">{activeConv?.full_name || 'User'}</h3>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse" />
                                <p className="text-[10px] font-black text-black/50 uppercase tracking-widest">
                                    {callType === 'video' ? 'VIDEO' : 'VOICE'} CALL • {formatDuration(callDuration)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={toggleMute} className={`w-12 h-12 rounded-full border-[2px] border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isMuted ? 'bg-red-100 text-red-500' : 'bg-nile-white hover:bg-black hover:text-white'}`}>
                                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button onClick={endCall} className="w-16 h-16 bg-red-500 text-white rounded-full border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                <PhoneOff size={22} strokeWidth={2.5} />
                            </button>
                            {callType === 'video' && (
                                <button onClick={toggleVideo} className={`w-12 h-12 rounded-full border-[2px] border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isVideoOff ? 'bg-red-100 text-red-500' : 'bg-nile-white hover:bg-black hover:text-white'}`}>
                                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Messages;
