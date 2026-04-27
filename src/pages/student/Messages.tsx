import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
    Send, MoreVertical, Search, Phone, Video, Smile, Paperclip,
    ChevronLeft, MessageCircle, X, PhoneOff, MicOff, Mic, VideoOff,
    UserPlus,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Conversation {
    id: number;
    name: string;
    lastMsg: string;
    time: string;
    unread: number;
    online: boolean;
}

interface Message {
    id: number;
    text: string;
    sender: 'me' | 'them';
    time: string;
}

const initialConversations: Conversation[] = [
    { id: 1, name: 'Sarah Admin', lastMsg: 'Your CV has been approved!', time: '10:30 AM', unread: 1, online: true },
    { id: 2, name: 'Google Tech HR', lastMsg: 'Are you available for an interview?', time: '9:15 AM', unread: 3, online: false },
    { id: 3, name: 'Tunde Afolayan', lastMsg: 'Happy to connect!', time: 'Yesterday', unread: 0, online: true },
    { id: 4, name: 'Microsoft HR', lastMsg: 'Offer letter attached.', time: 'Monday', unread: 0, online: false },
    { id: 5, name: 'Dr. Amara Osei', lastMsg: 'See you on Friday for our session.', time: 'Tuesday', unread: 0, online: true },
];

const initialMessages: Record<number, Message[]> = {
    1: [
        { id: 1, text: 'Hi! I reviewed your latest CV submission.', sender: 'them', time: '10:00 AM' },
        { id: 2, text: 'Thank you! Any feedback?', sender: 'me', time: '10:05 AM' },
        { id: 3, text: 'It looks great! Your CV has been approved. Well done.', sender: 'them', time: '10:10 AM' },
        { id: 4, text: 'Amazing! Thank you so much!', sender: 'me', time: '10:12 AM' },
        { id: 5, text: 'Your CV has been approved!', sender: 'them', time: '10:30 AM' },
    ],
    2: [
        { id: 1, text: 'Hello! We reviewed your application and are impressed with your profile.', sender: 'them', time: '9:00 AM' },
        { id: 2, text: 'Are you available for an interview next week?', sender: 'them', time: '9:15 AM' },
    ],
    3: [
        { id: 1, text: 'Great connecting with you on Nile Connect!', sender: 'them', time: 'Yesterday' },
        { id: 2, text: 'Happy to connect!', sender: 'me', time: 'Yesterday' },
    ],
    4: [
        { id: 1, text: 'Congratulations! Please find your offer letter attached.', sender: 'them', time: 'Monday' },
        { id: 2, text: 'Offer letter attached.', sender: 'them', time: 'Monday' },
    ],
    5: [
        { id: 1, text: 'Looking forward to our career session on Friday!', sender: 'them', time: 'Tuesday' },
        { id: 2, text: 'See you on Friday for our session.', sender: 'them', time: 'Tuesday' },
    ],
};

type CallType = 'audio' | 'video' | null;

const Messages = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');
    const [conversations, setConversations] = useState(initialConversations);
    const [messages, setMessages] = useState(initialMessages);
    const [searchTerm, setSearchTerm] = useState('');
    const [callType, setCallType] = useState<CallType>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeChat = conversations.find(c => c.id === activeChatId) || null;
    const currentMessages = activeChatId ? (messages[activeChatId] || []) : [];

    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msg.trim() || !activeChatId) return;

        const newMsg: Message = {
            id: Date.now(),
            text: msg.trim(),
            sender: 'me',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), newMsg],
        }));
        setConversations(prev => prev.map(c =>
            c.id === activeChatId ? { ...c, lastMsg: msg.trim(), time: 'Just now', unread: 0 } : c
        ));
        setMsg('');

        // Simulate reply after delay
        if (activeChat) {
            setTimeout(() => {
                const replies = [
                    'Got it! Thanks for the message.',
                    'Noted. I\'ll get back to you shortly.',
                    'Sure, sounds good!',
                    'Thanks for reaching out.',
                    'Perfect, let me check and respond.',
                ];
                const reply: Message = {
                    id: Date.now() + 1,
                    text: replies[Math.floor(Math.random() * replies.length)],
                    sender: 'them',
                    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => ({
                    ...prev,
                    [activeChatId]: [...(prev[activeChatId] || []), reply],
                }));
            }, 1200 + Math.random() * 800);
        }
    };

    const startCall = (type: CallType) => {
        setCallType(type);
        setCallDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    };

    const endCall = () => {
        setCallType(null);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        showToast(`Call ended (${formatDuration(callDuration)})`, 'info');
    };

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const markRead = (id: number) => {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    };

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-56px)] md:h-[calc(100vh-56px)] font-sans bg-white relative">

                {/* Conversations List */}
                <div className={`
                    ${activeChatId !== null ? 'hidden md:flex' : 'flex'}
                    w-full md:w-[300px] lg:w-[360px] md:border-r-[2px] border-black flex-col bg-nile-white h-full flex-shrink-0
                `}>
                    <div className="p-4 md:p-6 border-b-[2px] border-black space-y-3">
                        <h2 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight">Messages .</h2>
                        <div className="relative">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="SEARCH CHATS..."
                                className="w-full pl-10 pr-4 py-2.5 border-[2px] border-black rounded-xl font-bold text-[10px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_#1E499D] bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">No conversations found</p>
                            </div>
                        ) : filteredConversations.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => { setActiveChatId(chat.id); markRead(chat.id); }}
                                className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-black/5
                                    ${activeChatId === chat.id ? 'bg-white border-l-[3px] border-l-nile-blue' : 'hover:bg-white/70'}
                                `}
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar name={chat.name} size="md" />
                                    {chat.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-nile-green border-2 border-white rounded-full" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="font-black text-black text-[10px] uppercase truncate leading-none mb-1">{chat.name}</h4>
                                        <span className="text-[7px] font-black text-nile-blue/50 uppercase ml-2 flex-shrink-0">{chat.time}</span>
                                    </div>
                                    <p className={`text-[9px] truncate uppercase ${chat.unread > 0 ? 'text-black font-black' : 'text-black/50 font-bold'}`}>
                                        {chat.lastMsg}
                                    </p>
                                </div>
                                {chat.unread > 0 && (
                                    <div className="w-5 h-5 bg-nile-blue text-white rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0">
                                        {chat.unread}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`
                    ${activeChatId !== null ? 'flex' : 'hidden md:flex'}
                    flex-1 flex-col bg-white h-full min-w-0
                `}>
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-4 py-3 border-b-[2px] border-black flex items-center justify-between bg-white z-10 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveChatId(null)}
                                        className="md:hidden p-1.5 hover:bg-black/5 rounded-lg mr-1"
                                    >
                                        <ChevronLeft size={22} strokeWidth={3} />
                                    </button>
                                    <Avatar name={activeChat.name} size="md" />
                                    <div className="min-w-0">
                                        <h3 className="font-black text-black uppercase text-xs leading-none truncate">{activeChat.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${activeChat.online ? 'bg-nile-green' : 'bg-black/20'}`} />
                                            <span className="text-[8px] font-black text-black/40 uppercase">{activeChat.online ? 'Online' : 'Offline'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => startCall('audio')}
                                        className="p-2 bg-nile-white border-[2px] border-black rounded-xl hover:bg-nile-green hover:text-white hover:border-nile-green transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        title="Voice call"
                                    >
                                        <Phone size={15} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => startCall('video')}
                                        className="p-2 bg-nile-white border-[2px] border-black rounded-xl hover:bg-nile-blue hover:text-white hover:border-nile-blue transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        title="Video call"
                                    >
                                        <Video size={15} strokeWidth={2.5} />
                                    </button>
                                    <button className="p-2 text-black/30 hover:text-black transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-nile-white/30">
                                {currentMessages.map(m => (
                                    <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        {m.sender === 'them' && (
                                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-auto mb-1 border border-black/10">
                                                <Avatar name={activeChat.name} size="sm" />
                                            </div>
                                        )}
                                        <div className={`max-w-[78%] md:max-w-[65%] px-4 py-3 rounded-[18px] border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                            ${m.sender === 'me'
                                                ? 'bg-nile-blue text-white rounded-tr-sm'
                                                : 'bg-white text-black rounded-tl-sm'}
                                        `}>
                                            <p className="font-bold text-[11px] md:text-sm leading-relaxed">{m.text}</p>
                                            <span className={`block mt-1 text-[7px] font-black text-right ${m.sender === 'me' ? 'text-white/50' : 'text-black/30'}`}>
                                                {m.time}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} className="p-3 md:p-5 border-t-[2px] border-black bg-white flex-shrink-0">
                                <div className="flex items-center gap-2 bg-nile-white border-[2px] border-black rounded-[20px] p-1.5 pr-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-none focus-within:border-nile-blue transition-all">
                                    <button type="button" className="p-2 text-black/30 hover:text-nile-blue transition-colors flex-shrink-0">
                                        <Paperclip size={16} strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="TYPE A MESSAGE..."
                                        className="flex-1 bg-transparent border-none outline-none font-bold text-[11px] md:text-xs uppercase min-w-0"
                                        value={msg}
                                        onChange={e => setMsg(e.target.value)}
                                    />
                                    <button type="button" className="hidden sm:block p-2 text-black/30 hover:text-black transition-colors flex-shrink-0">
                                        <Smile size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!msg.trim()}
                                        className="w-9 h-9 bg-nile-green text-black border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-30 disabled:translate-x-0 disabled:translate-y-0 flex-shrink-0"
                                    >
                                        <Send size={14} strokeWidth={3} />
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

            {/* Active Call Modal */}
            {callType && activeChat && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white border-[3px] border-black rounded-[32px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-8 space-y-6 text-center">
                        {callType === 'video' && (
                            <div className="w-full aspect-video bg-gray-900 rounded-[20px] border-[2px] border-black flex items-center justify-center overflow-hidden">
                                {isVideoOff ? (
                                    <div className="flex flex-col items-center gap-2 text-white/40">
                                        <VideoOff size={32} />
                                        <span className="text-[9px] font-black uppercase">Camera off</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-nile-blue/20 to-nile-green/20 flex items-center justify-center">
                                        <Avatar name={activeChat.name} size="lg" />
                                    </div>
                                )}
                            </div>
                        )}
                        {callType === 'audio' && (
                            <div className="w-24 h-24 mx-auto rounded-full border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]">
                                <Avatar name={activeChat.name} size="lg" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-black uppercase">{activeChat.name}</h3>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse" />
                                <p className="text-[10px] font-black text-nile-blue/60 uppercase tracking-widest">
                                    {callType === 'video' ? 'VIDEO CALL' : 'VOICE CALL'} • {formatDuration(callDuration)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => setIsMuted(v => !v)}
                                className={`w-12 h-12 rounded-full border-[2px] border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                    ${isMuted ? 'bg-red-100 text-red-500' : 'bg-nile-white text-black hover:bg-black hover:text-white'}`}
                            >
                                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button
                                onClick={endCall}
                                className="w-16 h-16 bg-red-500 text-white rounded-full border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                            >
                                <PhoneOff size={22} strokeWidth={2.5} />
                            </button>
                            {callType === 'video' && (
                                <button
                                    onClick={() => setIsVideoOff(v => !v)}
                                    className={`w-12 h-12 rounded-full border-[2px] border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                        ${isVideoOff ? 'bg-red-100 text-red-500' : 'bg-nile-white text-black hover:bg-black hover:text-white'}`}
                                >
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
