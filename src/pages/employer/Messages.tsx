import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send, Search, ChevronLeft, MessageCircle, Plus, Loader2, X,
} from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
    getConversations, getThread, sendMessage, searchUsers,
    Conversation, Message, UserProfile,
} from '../../services/messageService';

const EmployerMessages = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch {}
    }, []);

    useEffect(() => {
        loadConversations().finally(() => setLoading(false));
        pollRef.current = setInterval(loadConversations, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [loadConversations]);

    const openThread = async (conv: Conversation) => {
        setSelected(conv);
        setThreadLoading(true);
        try {
            setMessages(await getThread(conv.user_id));
        } catch {
            showToast('Failed to load messages.', 'error');
        } finally {
            setThreadLoading(false);
        }
    };

    useEffect(() => {
        if (!selected) return;
        const interval = setInterval(async () => {
            try { setMessages(await getThread(selected.user_id)); } catch {}
        }, 3000);
        return () => clearInterval(interval);
    }, [selected]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !selected || sending) return;
        setSending(true);
        const content = text.trim();
        setText('');
        try {
            const msg = await sendMessage(selected.user_id, content);
            setMessages(p => [...p, msg]);
        } catch {
            showToast('Failed to send.', 'error');
            setText(content);
        } finally {
            setSending(false);
        }
    };

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (!q.trim()) { setSearchResults([]); return; }
        setSearching(true);
        try {
            setSearchResults(await searchUsers(q));
        } catch {} finally {
            setSearching(false);
        }
    };

    const startConvo = (u: UserProfile) => {
        const conv: Conversation = { user_id: u.id, full_name: u.full_name, last_msg: '', last_time: '', unread: 0 };
        setSelected(conv);
        setMessages([]);
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const filteredConversations = search
        ? conversations.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()))
        : conversations;

    return (
        <div className="flex h-full bg-white overflow-hidden anime-fade-in font-sans pb-16 md:pb-0">

            {/* Sidebar */}
            <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r-[2px] border-black bg-nile-white/20`}>
                <div className="p-5 space-y-4 border-b-[2px] border-black bg-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Messages .</h2>
                        <button onClick={() => setShowSearch(v => !v)}
                            className="p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all">
                            {showSearch ? <X size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                        </button>
                    </div>

                    {showSearch ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                                <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                                    placeholder="FIND STUDENTS / STAFF..."
                                    autoFocus
                                    className="w-full pl-9 pr-4 py-2.5 border-2 border-black rounded-xl font-black text-[9px] uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white transition-all" />
                            </div>
                            {searching && <p className="text-[8px] font-black text-black/30 uppercase text-center py-2">SEARCHING...</p>}
                            {searchResults.map(u => (
                                <div key={u.id} onClick={() => startConvo(u)}
                                    className="flex items-center gap-3 p-3 border-2 border-black/5 rounded-xl cursor-pointer hover:border-black hover:bg-white transition-all">
                                    <Avatar name={u.full_name} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-[10px] uppercase truncate">{u.full_name}</p>
                                        <p className="text-[7px] font-black text-black/30 uppercase">{u.role} {u.major ? `· ${u.major}` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH CHATS..."
                                className="w-full pl-9 pr-4 py-2.5 border-2 border-black rounded-xl font-black text-[9px] uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-nile-white transition-all" />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="space-y-0">
                            {[1,2,3].map(i => (
                                <div key={i} className="p-4 flex gap-3 border-b border-black/5 animate-pulse">
                                    <div className="w-10 h-10 bg-black/5 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1"><div className="h-3 bg-black/5 rounded w-3/4" /><div className="h-2 bg-black/5 rounded w-1/2" /></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                            <MessageCircle size={28} className="text-black/15 mb-3" />
                            <p className="text-[9px] font-black text-black/25 uppercase">No conversations yet</p>
                            <button onClick={() => setShowSearch(true)} className="mt-3 text-[8px] font-black text-nile-blue uppercase underline">Start one →</button>
                        </div>
                    ) : filteredConversations.map(c => (
                        <div key={c.user_id} onClick={() => openThread(c)}
                            className={`p-4 flex gap-3 cursor-pointer hover:bg-white transition-all border-b border-black/5 relative
                                ${selected?.user_id === c.user_id ? 'bg-white border-l-2 border-l-nile-blue' : ''}`}>
                            <Avatar name={c.full_name} size="sm" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className="font-black text-xs uppercase truncate text-black">{c.full_name}</h4>
                                    {c.last_time && <span className="text-[7px] font-bold text-black/30 whitespace-nowrap ml-2">{c.last_time}</span>}
                                </div>
                                <p className="text-[9px] font-medium text-black/40 truncate uppercase">{c.last_msg || 'No messages yet'}</p>
                            </div>
                            {c.unread > 0 && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-nile-blue text-white text-[7px] font-black w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">
                                    {c.unread}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat pane */}
            <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
                {selected ? (
                    <>
                        <div className="h-14 border-b-[2px] border-black flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelected(null)} className="md:hidden p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all">
                                    <ChevronLeft size={14} strokeWidth={3} />
                                </button>
                                <Avatar name={selected.full_name} size="sm" />
                                <div>
                                    <h3 className="font-black text-xs uppercase">{selected.full_name}</h3>
                                    <p className="text-[7px] font-black text-nile-green uppercase">CONNECTED</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-nile-white/10 flex flex-col">
                            {threadLoading ? (
                                <div className="flex items-center justify-center flex-1">
                                    <Loader2 size={24} className="animate-spin text-black/20" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-[9px] font-black text-black/20 uppercase">No messages yet — say hello!</p>
                                </div>
                            ) : messages.map(msg => {
                                const isMine = msg.sender_id === user?.id;
                                return (
                                    <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
                                        {!isMine && <Avatar name={selected.full_name} size="sm" />}
                                        <div className={`px-4 py-3 rounded-[18px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isMine ? 'bg-black text-white rounded-tr-sm' : 'bg-white border-2 border-black rounded-tl-sm'}`}>
                                            <p className="text-xs font-bold leading-relaxed">{msg.content}</p>
                                            <p className={`text-[7px] font-black mt-1.5 ${isMine ? 'text-white/30' : 'text-black/20'} uppercase`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <form onSubmit={handleSend} className="p-4 border-t-[2px] border-black bg-white">
                            <div className="flex gap-3">
                                <input type="text" value={text} onChange={e => setText(e.target.value)}
                                    placeholder="TYPE A MESSAGE..."
                                    className="flex-1 bg-nile-white border-[2px] border-black rounded-xl py-3 px-4 font-black text-xs uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all" />
                                <button type="submit" disabled={!text.trim() || sending}
                                    className="p-3 bg-black text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40">
                                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                        <div className="w-20 h-20 bg-black/5 border-2 border-dashed border-black/10 rounded-[32px] flex items-center justify-center">
                            <MessageCircle size={36} className="text-black/15" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Secure Messaging</h3>
                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest mt-1">Connect with students and Nile Career Services</p>
                        </div>
                        <button onClick={() => setShowSearch(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-black text-white border-2 border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_#6CBB56] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                            <Plus size={13} /> NEW MESSAGE
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployerMessages;
