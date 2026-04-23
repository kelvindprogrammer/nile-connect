import React, { useState } from 'react';
import { MessageCircle, Plus, Heart, Share2 } from 'lucide-react';

interface Post {
    id: number;
    company: string;
    type: string;
    time: string;
    content: string;
    likes: number;
    comments: number;
    hasImage: boolean;
    liked: boolean;
}

const initialPosts: Post[] = [
    {
        id: 1,
        company: 'TECH INNOVATIONS INC.',
        type: 'COMPANY',
        time: '2H AGO',
        content: 'We are hiring! Check out our new roles for the summer.',
        likes: 87,
        comments: 14,
        hasImage: true,
        liked: false,
    },
    {
        id: 2,
        company: 'NEXUS LABS',
        type: 'COMPANY',
        time: '5H AGO',
        content: 'Join us for our upcoming campus info session on April 20th! Meet our engineers and learn about life at Nexus.',
        likes: 43,
        comments: 6,
        hasImage: false,
        liked: false,
    },
];

const EmployerCatchUp = () => {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [showNewPost, setShowNewPost] = useState(false);
    const [newPostText, setNewPostText] = useState('');

    const handleLike = (id: number) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
            )
        );
    };

    const handlePost = () => {
        if (!newPostText.trim()) return;
        setPosts((prev) => [
            {
                id: Date.now(),
                company: 'TECHCORP',
                type: 'COMPANY',
                time: 'JUST NOW',
                content: newPostText,
                likes: 0,
                comments: 0,
                hasImage: false,
                liked: false,
            },
            ...prev,
        ]);
        setNewPostText('');
        setShowNewPost(false);
    };

    return (
        <div className="w-full max-w-3xl flex flex-col space-y-10 anime-fade-in font-sans pb-10 mx-auto">
            {/* Header card */}
            <div className="bg-white border-4 border-black rounded-[24px] px-8 py-5 shadow-brutalist flex justify-between items-center relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    <MessageCircle size={28} strokeWidth={2.5} />
                    <h1 className="text-3xl font-black text-black uppercase tracking-widest mt-1">
                        FEED
                    </h1>
                </div>
                <button 
                    onClick={() => setShowNewPost(true)}
                    className="relative z-10 bg-white border-3 border-black rounded-full px-6 py-3 font-black text-xs uppercase tracking-widest flex items-center hover:bg-black hover:text-white transition-colors group shadow-brutalist-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                    <Plus size={16} strokeWidth={3} className="mr-2" /> NEW POST
                </button>
            </div>

            {/* New post composer */}
            {showNewPost && (
                <div className="bg-white border-4 border-black rounded-[24px] p-6 shadow-brutalist anime-fade-in">
                    <p className="font-black text-sm uppercase tracking-widest mb-4">NEW POST</p>
                    <textarea
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full border-3 border-black rounded-[16px] p-4 font-bold text-sm outline-none focus:shadow-brutalist-sm transition-all resize-y min-h-[120px] placeholder:text-nile-blue/70"
                    />
                    <div className="flex justify-end gap-4 mt-6">
                        <button 
                            onClick={() => setShowNewPost(false)}
                            className="bg-white text-black border-3 border-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-nile-white transition-colors"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={handlePost}
                            className="bg-nile-blue text-nile-white border-3 border-black px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                        >
                            POST
                        </button>
                    </div>
                </div>
            )}

            {/* Feed */}
            <div className="flex flex-col space-y-10">
                {posts.map((post) => (
                    <div key={post.id} className="bg-white border-4 border-black rounded-[24px] shadow-brutalist overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                        {/* Post Header */}
                        <div className="p-6 pb-0 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full border-3 border-black flex items-center justify-center font-black text-lg bg-white shadow-[2px_2px_0px_0px_#000]">
                                    {post.company[0]}
                                </div>
                                <div>
                                    <h3 className="font-black text-sm md:text-base uppercase tracking-widest leading-none text-black mb-1">{post.company}</h3>
                                    <p className="text-[10px] font-black text-nile-blue uppercase tracking-widest">{post.type}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-nile-blue/70 uppercase tracking-widest mt-1">{post.time}</span>
                        </div>

                        {/* Image Placeholder */}
                        {post.hasImage && (
                            <div className="w-full h-80 bg-nile-white border-nile-blue border-y-4 border-black mt-6 flex items-center justify-center relative group cursor-pointer overflow-hidden">
                                <div className="absolute inset-0 grayscale opacity-80" style={{ background: 'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80") center/cover no-repeat' }}></div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6">
                            <p className="text-sm font-bold text-black leading-relaxed mb-6">
                                {post.content}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-6 border-t-3 border-black pt-5 mt-2">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors ${post.liked ? 'text-black' : 'text-nile-blue/70 hover:text-black'}`}
                                >
                                    <Heart size={16} strokeWidth={post.liked ? 3 : 2} fill={post.liked ? '#111' : 'none'} className="mb-0.5" />
                                    {post.likes} LIKES
                                </button>
                                <button className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-nile-blue/70 hover:text-black transition-colors">
                                    <MessageCircle size={16} strokeWidth={2} className="mb-0.5" />
                                    {post.comments} COMMENTS
                                </button>
                                <button className="ml-auto flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-nile-blue/70 hover:text-black transition-colors">
                                    <Share2 size={16} strokeWidth={2} className="mb-0.5" />
                                    SHARE
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployerCatchUp;
