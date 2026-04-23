import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Send, MoreVertical, Search, Phone, Video, Smile, Paperclip, ChevronLeft, MessageCircle } from 'lucide-react';
import Avatar from '../../components/Avatar';

const conversations = [
    { id: 1, name: 'Sarah Admin', lastMsg: 'Your CV has been approved!', time: '10:30 AM', unread: 1, online: true },
    { id: 2, name: 'Google Tech', lastMsg: 'Are you available for an interview?', time: '9:15 AM', unread: 3, online: false },
    { id: 3, name: 'Tunde Afolayan', lastMsg: 'Happy to connect!', time: 'Yesterday', unread: 0, online: true },
    { id: 4, name: 'Microsoft HR', lastMsg: 'Offer letter attached.', time: 'Monday', unread: 0, online: false },
];

const messagesMock = [
    { id: 1, text: 'Hi Grace! I reviewed your project.', sender: 'them', time: '10:00 AM' },
    { id: 2, text: 'Thank you Sarah! Any feedback?', sender: 'me', time: '10:05 AM' },
    { id: 3, text: 'It looks amazing! The Nile design logic is perfect.', sender: 'them', time: '10:10 AM' },
    { id: 4, text: 'Glad you like it! I just uploaded my latest CV too.', sender: 'me', time: '10:15 AM' },
];

const Messages = () => {
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');

    const activeChat = conversations.find(c => c.id === activeChatId) || null;

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] md:m-4 font-sans bg-white md:border-4 md:border-black md:rounded-[40px] overflow-hidden md:shadow-brutalist relative">
                
                {/* Conversations List (Sidebar) */}
                <div className={`
                    ${activeChatId ? 'hidden md:flex' : 'flex'}
                    w-full md:w-[350px] md:border-r-4 border-black flex flex-col bg-nile-white h-full
                `}>
                    <div className="p-6 md:p-8 border-b-4 border-black space-y-4 md:space-y-6">
                        <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight">Messages .</h2>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nile-blue/50" />
                            <input 
                                type="text" 
                                placeholder="SEARCH CHATS..." 
                                className="w-full pl-10 pr-4 py-2.5 md:py-3 border-[2px] md:border-3 border-black rounded-xl font-bold text-[10px] uppercase outline-none focus:shadow-brutalist-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {conversations.map(chat => (
                            <div 
                                key={chat.id} 
                                onClick={() => setActiveChatId(chat.id)}
                                className={`p-4 md:p-6 flex items-center space-x-4 cursor-pointer transition-colors border-b-[2px] border-black/5
                                    ${activeChatId === chat.id ? 'bg-white' : 'hover:bg-white/50'}
                                `}
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar name={chat.name} size="md" />
                                    {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-nile-green border-2 border-white rounded-full"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-black text-black text-[10px] md:text-xs uppercase truncate leading-none mb-1">{chat.name}</h4>
                                        <span className="text-[7px] md:text-[8px] font-black text-nile-blue/50 uppercase">{chat.time}</span>
                                    </div>
                                    <p className={`text-[9px] md:text-[10px] truncate uppercase font-bold ${chat.unread > 0 ? 'text-black font-black' : 'text-nile-blue/60'}`}>
                                        {chat.lastMsg}
                                    </p>
                                </div>
                                {chat.unread > 0 && (
                                    <div className="w-4 h-4 md:w-5 md:h-5 bg-nile-blue text-white rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-black">
                                        {chat.unread}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Chat Area */}
                <div className={`
                    ${activeChatId ? 'flex' : 'hidden md:flex'}
                    flex-1 flex flex-col bg-white h-full
                `}>
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 md:p-6 border-b-[2px] md:border-b-4 border-black flex items-center justify-between bg-white z-10">
                                <div className="flex items-center space-x-3 md:space-x-4">
                                    <button 
                                        onClick={() => setActiveChatId(null)}
                                        className="md:hidden p-1 hover:bg-black/5 rounded-lg mr-1"
                                    >
                                        <ChevronLeft size={24} strokeWidth={3} />
                                    </button>
                                    <Avatar name={activeChat.name} size="md" />
                                    <div className="min-w-0">
                                        <h3 className="font-black text-black uppercase text-xs md:text-sm leading-none truncate">{activeChat.name}</h3>
                                        <div className="flex items-center space-x-1 mt-1">
                                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${activeChat.online ? 'bg-nile-green' : 'bg-black/20'}`}></div>
                                            <span className="text-[8px] md:text-[9px] font-black text-nile-blue/50 uppercase">{activeChat.online ? 'Online' : 'Offline'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 md:space-x-4">
                                    <button className="hidden sm:flex p-2 md:p-3 bg-nile-white border-[2px] md:border-3 border-black rounded-xl hover:bg-black hover:text-white transition-all shadow-brutalist-sm"><Phone size={16} md:size={18} strokeWidth={2.5}/></button>
                                    <button className="hidden sm:flex p-2 md:p-3 bg-nile-white border-[2px] md:border-3 border-black rounded-xl hover:bg-black hover:text-white transition-all shadow-brutalist-sm"><Video size={16} md:size={18} strokeWidth={2.5}/></button>
                                    <button className="p-2 text-nile-blue/50"><MoreVertical size={20}/></button>
                                </div>
                            </div>

                            {/* Messages Window */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-6 flex flex-col no-scrollbar bg-slate-50/30">
                                {messagesMock.map(m => (
                                    <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] md:max-w-[70%] p-4 md:p-6 rounded-[20px] md:rounded-[30px] border-[2px] md:border-3 border-black shadow-brutalist-sm 
                                            ${m.sender === 'me' ? 'bg-nile-blue text-white rounded-tr-none' : 'bg-white text-black rounded-tl-none'}
                                        `}>
                                            <p className="font-bold text-[11px] md:text-sm uppercase leading-relaxed">{m.text}</p>
                                            <span className={`block mt-2 text-[7px] md:text-[8px] font-black uppercase text-right ${m.sender === 'me' ? 'text-white/60' : 'text-nile-blue/50'}`}>
                                                {m.time}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 md:p-8 border-t-[2px] md:border-t-4 border-black bg-white">
                                <div className="flex items-center space-x-2 md:space-x-4 bg-nile-white border-[2px] md:border-3 border-black rounded-[24px] md:rounded-[30px] p-1.5 md:p-2 pr-3 md:pr-4 shadow-brutalist-sm focus-within:shadow-none transition-all">
                                    <button className="p-2 md:p-4 text-nile-blue/50 hover:text-black hover:scale-110 transition-all"><Paperclip size={18} md:size={20}/></button>
                                    <input 
                                        type="text" 
                                        placeholder="MESSAGE..." 
                                        className="flex-1 bg-transparent border-none outline-none font-black text-[10px] md:text-xs uppercase px-1 md:px-2"
                                        value={msg}
                                        onChange={(e) => setMsg(e.target.value)}
                                    />
                                    <button className="hidden sm:block p-2 md:p-4 text-nile-blue/50 hover:text-black transition-all"><Smile size={20}/></button>
                                    <button className="w-10 h-10 md:w-12 md:h-12 bg-nile-green text-black border-2 border-black rounded-full flex items-center justify-center shadow-brutalist-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                        <Send size={16} md:size={20} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-12 space-y-6">
                            <div className="w-24 h-24 bg-nile-blue/5 rounded-3xl border-2 border-dashed border-black/10 flex items-center justify-center text-black/10">
                                <MessageCircle size={48} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-black uppercase">Your Inbox .</h3>
                                <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default Messages;
