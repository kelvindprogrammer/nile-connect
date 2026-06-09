import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Search, ChevronLeft, MessageCircle, Plus, Loader2, X } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
    getConversations, getThread, sendMessage, searchUsers,
    type Conversation, type Message, type UserProfile,
} from '../../services/messageService';

const StaffMessages = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages]           = useState<Message[]>([]);
    const [selected, setSelected]           = useState<Conversation | null>(null);
    const [text, setText]                   = useState('');
    const [loading, setLoading]             = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [sending, setSending]             = useState(false);
    const [search, setSearch]               = useState('');
    const [showSearch, setShowSearch]       = useState(false);
    const [searchQuery, setSearchQuery]     = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searching, setSearching]         = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadConversations = useCallback(async () => {
        try { setConversations(await getConversations()); } catch {}
    }, []);

    useEffect(() => {
        loadConversations().finally(() => setLoading(false));
        pollRef.current = setInterval(loadConversations, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [loadConversations]);

    const openThread = async (conv: Conversation) => {
        setSelected(conv);
        setThreadLoading(true);
        try { setMessages(await getThread(conv.user_id)); }
        catch { showToast('Failed to load messages.', 'error'); }
        finally { setThreadLoading(false); }
    };

    useEffect(() => {
        if (!selected) return;
        const id = setInterval(async () => {
            try { setMessages(await getThread(selected.user_id)); } catch {}
        }, 3000);
        return () => clearInterval(id);
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
        try { setSearchResults(await searchUsers(q)); }
        catch {} finally { setSearching(false); }
    };

    const startConversation = (u: UserProfile) => {
        setSelected({ user_id: u.id, full_name: u.full_name, last_msg: '', last_time: '', unread: 0 });
        setMessages([]);
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const filtered = conversations.filter(c =>
        !search || c.full_name.toLowerCase().includes(search.toLowerCase())
    );

    const fmtTime = (t: string) => {
        if (!t) return '';
        const d   = new Date(t);
        const now = new Date();
        return d.toDateString() === now.toDateString()
            ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="flex h-full bg-white overflow-hidden anime-fade-in font-sans pb-20 md:pb-0">

            {/* ── Conversation list ───────────────────────────────────── */}
            <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r-[2px] border-black bg-nile-white/20`}>

                {/* Header */}
                <div className="p-5 space-y-3 border-b-[2px] border-black bg-white text-left">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-black uppercase tracking-tighter leading-none">Staff Comms .</h2>
                            <p className="text-[7px] font-black text-black/30 uppercase tracking-widest mt-0.5">PLATFORM COMMUNICATIONS</p>
                        </div>
                        <button
                            onClick={() => { setShowSearch(s => !s); setSearchQuery(''); setSearchResults([]); }}
                            className="p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all text-nile-blue"
                        >
                            {showSearch ? <X size={16} /> : <Plus size={16} />}
                        </button>
                    </div>

                    {showSearch ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                                <input
                                    autoFocus
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="SEARCH USERS TO MESSAGE..."
                                    className="w-full bg-nile-white border-2 border-black rounded-xl py-2 pl-8 pr-3 font-black text-[9px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                />
                            </div>
                            {searching && (
                                <div className="flex justify-center py-2">
                                    <Loader2 size={14} className="animate-spin text-nile-blue/30" />
                                </div>
                            )}
                            {searchResults.map(u => (
                                <div
                                    key={u.id}
                                    onClick={() => startConversation(u)}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white border border-transparent hover:border-black cursor-pointer transition-all"
                                >
                                    <Avatar name={u.full_name} size="sm" />
                                    <div className="min-w-0">
                                        <p className="font-black text-[10px] uppercase truncate">{u.full_name}</p>
                                        <p className="text-[7px] font-black text-black/30 uppercase">{u.role}</p>
                                    </div>
                                </div>
                            ))}
                            {!searching && searchQuery && searchResults.length === 0 && (
                                <p className="text-[8px] font-black text-black/25 uppercase text-center py-3">No users found</p>
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH CHATS..."
                                className="w-full bg-nile-white border-2 border-black rounded-xl py-2 pl-8 pr-3 font-black text-[9px] uppercase outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={20} className="animate-spin text-nile-blue/20" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-2">
                            <MessageCircle size={28} className="text-black/10" />
                            <p className="text-[8px] font-black text-black/20 uppercase tracking-widest">
                                {search ? 'No matches found' : 'No conversations yet'}
                            </p>
                            {!search && (
                                <button
                                    onClick={() => setShowSearch(true)}
                                    className="text-[8px] font-black text-nile-blue uppercase hover:underline"
                                >
                                    START ONE →
                                </button>
                            )}
                        </div>
                    ) : filtered.map(c => (
                        <div
                            key={c.user_id}
                            onClick={() => openThread(c)}
                            className={`p-4 flex gap-3 cursor-pointer hover:bg-white transition-all border-b border-black/5 relative ${selected?.user_id === c.user_id ? 'bg-white border-l-[3px] border-l-black' : ''}`}
                        >
                            <Avatar name={c.full_name} size="md" />
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className="font-black text-[10px] uppercase truncate text-black">{c.full_name}</h4>
                                    <span className="text-[7px] font-bold text-black/20 whitespace-nowrap ml-1">{fmtTime(c.last_time)}</span>
                                </div>
                                <p className="text-[9px] font-medium text-black/40 truncate uppercase">{c.last_msg || '—'}</p>
                            </div>
                            {c.unread > 0 && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-white text-[7px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                                    {c.unread}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Chat view ───────────────────────────────────────────── */}
            <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
                {selected ? (
                    <>
                        {/* Chat header */}
                        <div className="h-16 border-b-[2px] border-black flex items-center justify-between px-4 bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="md:hidden p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all mr-1"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <Avatar name={selected.full_name} size="sm" />
                                <div className="text-left">
                                    <h3 className="font-black text-[11px] uppercase text-black leading-none">{selected.full_name}</h3>
                                    <span className="text-[7px] font-black text-black/30 uppercase tracking-widest">STAFF CHANNEL</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-nile-white/10">
                            {threadLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 size={24} className="animate-spin text-nile-blue/30" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                    <MessageCircle size={24} className="text-black/10" />
                                    <p className="text-[9px] font-black text-black/25 uppercase">Start the conversation</p>
                                </div>
                            ) : messages.map(m => {
                                const isMine = m.sender_id === user?.id;
                                return (
                                    <div key={m.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                                        {!isMine && <Avatar name={selected.full_name} size="sm" />}
                                        <div className={`max-w-[75%] p-3 rounded-[16px] border-[2px] border-black text-left ${isMine ? 'bg-black text-white rounded-tr-none shadow-[3px_3px_0px_0px_rgba(30,73,157,1)]' : 'bg-white rounded-tl-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}>
                                            <p className="text-[10px] font-bold leading-relaxed uppercase">{m.content}</p>
                                            <p className={`text-[6px] font-black mt-1.5 uppercase tracking-widest ${isMine ? 'text-white/30' : 'text-black/25'}`}>{fmtTime(m.created_at)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-4 border-t-[2px] border-black bg-white">
                            <div className="flex gap-2">
                                <input
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    placeholder="TYPE AN OFFICIAL RESPONSE..."
                                    className="flex-1 bg-nile-white border-[2px] border-black rounded-xl py-3 px-4 font-black text-[9px] uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!text.trim() || sending}
                                    className="p-3 bg-black text-white border-[2px] border-black rounded-xl hover:bg-nile-blue transition-all shadow-[2px_2px_0px_0px_rgba(30,73,157,1)] hover:shadow-none disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-5 p-8 text-center">
                        <div className="w-20 h-20 bg-black border-[3px] border-black rounded-[28px] flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(108,187,86,1)]">
                            <MessageCircle size={36} className="text-white" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Staff Comms .</h3>
                            <p className="max-w-[280px] text-[9px] font-black text-black/40 uppercase tracking-widest leading-relaxed">
                                Select a conversation or tap + to message any student, employer, or staff member.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSearch(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white border-[2px] border-black rounded-xl font-black text-[9px] uppercase shadow-[3px_3px_0px_0px_rgba(108,187,86,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(108,187,86,1)] transition-all"
                        >
                            <Plus size={12} strokeWidth={3} /> NEW MESSAGE
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffMessages;
