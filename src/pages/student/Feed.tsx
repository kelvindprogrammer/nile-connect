import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { MessageCircle, Plus } from 'lucide-react';
import Feed from '../../components/Feed';
import Modal from '../../components/Modal';
import Button from '../../components/Button';

const StudentFeed = () => {
    const [isPostModalOpen, setPostModalOpen] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [pendingPost, setPendingPost] = useState<{ content: string } | null>(null);

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent.trim()) return;
        setPendingPost({ content: postContent });
        setPostContent('');
        setPostModalOpen(false);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-6 md:py-12 px-4 md:px-6 space-y-8 md:space-y-12 anime-fade-in font-sans bg-nile-white min-h-full">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-0 mb-8 md:mb-16">
                    <div className="flex items-center space-x-4 md:space-x-6 group">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-nile-blue rounded-[16px] md:rounded-[20px] flex items-center justify-center text-white shadow-brutalist-sm-green group-hover:rotate-6 transition-transform">
                            <MessageCircle size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black text-black leading-none uppercase tracking-tight">FEED</h2>
                            <p className="text-[10px] md:text-sm font-black text-nile-blue uppercase mt-1 md:mt-2 tracking-widest">Connect with your community</p>
                        </div>
                    </div>
                    <Button onClick={() => setPostModalOpen(true)} variant="secondary" fullWidth className="sm:w-auto">
                        <Plus size={18} strokeWidth={2.5} /> NEW POST
                    </Button>
                </div>

                <Feed newPost={pendingPost} onPostConsumed={() => setPendingPost(null)} />

                <Modal isOpen={isPostModalOpen} onClose={() => setPostModalOpen(false)} title="CREATE NEW POST">
                    <form className="space-y-6" onSubmit={handlePublish}>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-black tracking-widest uppercase">POST CONTENT</label>
                            <textarea
                                className="w-full h-40 border-3 border-black rounded-2xl p-6 font-bold text-sm outline-none focus:shadow-brutalist-sm transition-all bg-nile-white/50"
                                placeholder="What's happening? Share updates, achievements, or questions..."
                                required
                                value={postContent}
                                onChange={e => setPostContent(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setPostModalOpen(false)} type="button">CANCEL</Button>
                            <Button variant="primary" type="submit">POST UPDATE</Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
};

export default StudentFeed;
