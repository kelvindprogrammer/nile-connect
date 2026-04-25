import React, { useState } from 'react';
import { Send, MoreVertical, Search, Phone, Video, Smile, Paperclip, ChevronLeft, MessageCircle } from 'lucide-react';
import Avatar from '../../components/Avatar';

const conversations = [
    { id: 1, name: 'Grace Stanley', lastMsg: 'I have reviewed the candidates...', time: '12:45 PM', unread: 2, online: true },
    { id: 2, name: 'Nile Career Services', lastMsg: 'The tech fair is scheduled for...', time: 'Yesterday', unread: 0, online: false },
    { id: 3, name: 'Michael Brown', lastMsg: 'Thank you for the opportunity!', time: 'Monday', unread: 0, online: true },
];

const EmployerMessages = () => {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected = conversations.find(c => c.id === selectedId);

    return (
        <div className="flex h-full bg-white overflow-hidden anime-fade-in font-sans pb-20 md:pb-0">
            {/* List View */}
            <div className={`
                ${selectedId ? 'hidden md:flex' : 'flex'}
                w-full md:w-80 lg:w-96 flex-col border-r-[2px] border-black bg-nile-white/20
            `}>
                <div className="p-6 space-y-4 border-b-[2px] border-black bg-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Messages .</h2>
                        <button className="p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all">
                            <MessageCircle size={18} />
                        </button>
                    </div>
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
                        <input 
                            type="text" 
                            placeholder="SEARCH CHATS..." 
                            className="w-full bg-nile-white border-2 border-black rounded-xl py-2 pl-9 pr-4 font-black text-[9px] uppercase outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.map(c => (
                        <div 
                            key={c.id} 
                            onClick={() => setSelectedId(c.id)}
                            className={`p-4 flex gap-4 cursor-pointer hover:bg-white transition-all border-b border-black/5 relative group
                                ${selectedId === c.id ? 'bg-white' : ''}
                            `}
                        >
                            <div className="relative">
                                <Avatar name={c.name} size="md" />
                                {c.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-nile-green border-2 border-white rounded-full"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-black text-xs uppercase truncate text-black">{c.name}</h4>
                                    <span className="text-[8px] font-bold text-nile-blue/30 whitespace-nowrap">{c.time}</span>
                                </div>
                                <p className="text-[10px] font-medium text-nile-blue/60 truncate leading-none uppercase">{c.lastMsg}</p>
                            </div>
                            {c.unread > 0 && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]">
                                    {c.unread}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat View */}
            <div className={`
                ${selectedId ? 'flex' : 'hidden md:flex'}
                flex-1 flex-col bg-white
            `}>
                {selected ? (
                    <>
                        <div className="h-16 md:h-20 border-b-[2px] border-black flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setSelectedId(null)}
                                    className="md:hidden p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-all mr-1"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <Avatar name={selected.name} size="sm" />
                                <div className="text-left">
                                    <h3 className="font-black text-xs md:text-sm uppercase text-black leading-none">{selected.name}</h3>
                                    <span className="text-[8px] md:text-[9px] font-black text-nile-green uppercase tracking-widest">{selected.online ? 'Online now' : 'Away'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4">
                                <button className="p-2 text-black/30 hover:text-black transition-colors hidden sm:block"><Phone size={18} /></button>
                                <button className="p-2 text-black/30 hover:text-black transition-colors hidden sm:block"><Video size={18} /></button>
                                <button className="p-2 text-black/30 hover:text-black transition-colors"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 md:space-y-8 bg-nile-white/10 flex flex-col justify-end">
                            <div className="flex gap-4 max-w-[85%] text-left">
                                <Avatar name={selected.name} size="xs" />
                                <div className="p-4 bg-white border-2 border-black rounded-[20px] rounded-tl-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <p className="text-[11px] md:text-xs font-bold text-black uppercase leading-relaxed">{selected.lastMsg}</p>
                                    <span className="text-[7px] font-black text-nile-blue/20 mt-2 block">12:45 PM • READ</span>
                                </div>
                            </div>

                            <div className="flex gap-4 max-w-[85%] ml-auto flex-row-reverse text-right">
                                <div className="p-4 bg-black text-white border-2 border-black rounded-[20px] rounded-tr-none shadow-[4px_4px_0px_0px_rgba(108,187,86,1)]">
                                    <p className="text-[11px] md:text-xs font-black uppercase leading-relaxed">Sure, I will send over the recruitment portal analytics by tomorrow morning.</p>
                                    <span className="text-[7px] font-black text-white/30 mt-2 block uppercase">12:48 PM • DELIVERED</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-8 border-t-[2px] border-black bg-white">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="TYPE A PROFESSIONAL MESSAGE..." 
                                    className="w-full bg-nile-white border-[2px] border-black rounded-2xl py-3 md:py-4 pl-6 pr-16 md:pr-24 font-black text-[10px] md:text-xs uppercase outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                />
                                <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                    <button className="p-1 md:p-2 text-black/30 hover:text-black transition-colors hidden sm:block"><Paperclip size={18} /></button>
                                    <button className="p-2 md:p-3 bg-black text-white border-2 border-black rounded-xl hover:translate-y-[-2px] transition-all shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 md:space-y-8 p-8">
                         <div className="w-20 h-20 md:w-24 md:h-24 bg-nile-blue/5 border-4 border-dashed border-black/10 rounded-[40px] flex items-center justify-center animate-pulse">
                            <MessageCircle size={44} className="text-black/10" />
                         </div>
                         <div className="text-center space-y-2">
                            <h3 className="text-xl md:text-2xl font-black text-black uppercase tracking-tighter">Secure Messaging</h3>
                            <p className="max-w-[280px] md:max-w-xs text-[10px] md:text-xs font-bold text-nile-blue/40 uppercase tracking-widest leading-relaxed">Connect with candidates and Nile Career Services securely.</p>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployerMessages;
