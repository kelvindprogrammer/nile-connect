import React, { useState } from 'react';
import Card from './Card';
import Avatar from './Avatar';
import { MessageSquare, Heart, RefreshCcw, Send, MoreHorizontal, ThumbsUp, Globe } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import CommentSection from './CommentSection';

interface Post {
    id: number;
    user: string;
    role: string;
    avatar?: string;
    content: string;
    time: string;
    type: 'Update' | 'Job' | 'Event' | 'Success';
    likes: number;
    replies: number;
    hasLiked?: boolean;
    showComments?: boolean;
}

const mockPosts: Post[] = [
    { id: 1, user: 'Sarah Admin', role: 'STAFF • CAREER SERVICES', content: 'New Career Fair scheduled for next month! Make sure your CVs are updated in the portal.', time: '2h ago', type: 'Event', likes: 24, replies: 5 },
    { id: 2, user: 'Google Tech', role: 'EMPLOYER • TOP PARTNER', content: 'We are officially open for Software Engineering internship applications. Apply via the Jobs portal !', time: '5h ago', type: 'Job', likes: 156, replies: 42 },
    { id: 3, user: 'Ibrahim Musa', role: 'ALUMNI • CLASS OF 2022', content: 'Just secured my first role at Microsoft! Huge thanks to the Nile Career services.', time: '1d ago', type: 'Success', likes: 312, replies: 89 }
];

const Feed: React.FC = () => {
    const { showToast } = useToast();
    const [posts, setPosts] = useState(mockPosts);

    const toggleLike = (id: number) => {
        setPosts(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, hasLiked: !p.hasLiked, likes: p.hasLiked ? p.likes - 1 : p.likes + 1 };
            }
            return p;
        }));
    };

    const toggleComments = (id: number) => {
        setPosts(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, showComments: !p.showComments };
            }
            return p;
        }));
    };

    return (
        <div className="space-y-6 w-full max-w-lg mx-auto pb-10 font-sans">
            {posts.map((post) => (
                <Card key={post.id} variant="flat" className="p-0 border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all">
                    {/* Header: Compact */}
                    <div className="p-4 pb-2 flex justify-between items-start">
                        <div className="flex space-x-3">
                            <div className="relative">
                                <Avatar name={post.user} size="sm" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white border border-black rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-nile-green rounded-full pulse-green"></div>
                                </div>
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-black uppercase tracking-tight text-xs hover:text-nile-blue cursor-pointer leading-none">{post.user}</h4>
                                <p className="text-[8px] font-black text-nile-blue/40 uppercase tracking-widest mt-0.5">{post.role}</p>
                            </div>
                        </div>
                        <button className="text-black/30 hover:text-black transition-colors">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                    
                    {/* Content: High spacing for readability */}
                    <div className="px-4 py-3 text-left">
                        <p className="text-xs font-bold text-nile-blue leading-relaxed uppercase tracking-wide">
                            {post.content}
                        </p>
                    </div>

                    {/* Compact Stats */}
                    <div className="px-4 py-2 flex justify-between items-center border-y-[2px] border-black/5 bg-nile-white/20">
                        <div className="flex items-center space-x-1.5">
                            <div className="flex -space-x-1.5">
                                <div className="z-10 bg-nile-blue text-white rounded-full p-1 border border-white">
                                    <ThumbsUp size={7} strokeWidth={3} />
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-black/50 uppercase tracking-widest">{post.likes} REPS</span>
                        </div>
                        <div className="flex space-x-3 text-[9px] font-black text-nile-blue/30 uppercase tracking-widest">
                            <button onClick={() => toggleComments(post.id)} className="hover:text-black">REPLIES</button>
                        </div>
                    </div>
                    
                    {/* Compact Actions */}
                    <div className="px-3 py-1.5 grid grid-cols-4 gap-1.5 bg-white">
                        <button 
                            onClick={() => toggleLike(post.id)}
                            className={`flex flex-col items-center py-2 rounded-xl transition-all
                                ${post.hasLiked ? 'text-nile-blue bg-nile-blue/5' : 'text-black/30 hover:bg-nile-white'}
                            `}
                        >
                            <ThumbsUp size={16} strokeWidth={post.hasLiked ? 3 : 2} />
                            <span className="text-[7px] font-black uppercase mt-1">Like</span>
                        </button>
                        <button 
                            onClick={() => toggleComments(post.id)}
                            className={`flex flex-col items-center py-2 rounded-xl transition-all
                                ${post.showComments ? 'text-nile-blue bg-nile-blue/5' : 'text-black/30 hover:bg-nile-white'}
                            `}
                        >
                            <MessageSquare size={16} strokeWidth={2} />
                            <span className="text-[7px] font-black uppercase mt-1">Comment</span>
                        </button>
                        <button 
                            onClick={() => showToast('Repost flow...', 'success')}
                            className="flex flex-col items-center py-2 rounded-xl text-black/30 hover:bg-nile-white transition-all"
                        >
                            <RefreshCcw size={16} strokeWidth={2} />
                            <span className="text-[7px] font-black uppercase mt-1">Repost</span>
                        </button>
                        <button 
                            onClick={() => showToast('Message flow...', 'success')}
                            className="flex flex-col items-center py-2 rounded-xl text-black/30 hover:bg-nile-white transition-all"
                        >
                            <Send size={16} strokeWidth={2} />
                            <span className="text-[7px] font-black uppercase mt-1">Send</span>
                        </button>
                    </div>

                    {post.showComments && (
                        <div className="border-t-[2px] border-black/5 bg-nile-white/10 animate-in slide-in-from-top-1 scale-95 origin-top">
                             <CommentSection />
                        </div>
                    )}
                </Card>
            ))}
            
            <button className="w-full py-6 border-[2px] border-dashed border-black/10 rounded-3xl text-[9px] font-black text-black/20 hover:border-black hover:text-black transition-all uppercase tracking-[0.2em]">
                Discover More
            </button>
        </div>
    );
};

export default Feed;
