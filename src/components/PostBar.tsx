import React from 'react';
import Avatar from './Avatar';
import { Image, PlayCircle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfilePicture } from '../hooks/useProfilePicture';

interface PostBarProps {
    onPostClick: () => void;
}

const PostBar: React.FC<PostBarProps> = ({ onPostClick }) => {
    const { user } = useAuth();
    const { picture } = useProfilePicture();
    const firstName = user?.name ? user.name.split(' ')[0] : 'You';
    const displayName = user?.name || 'USER';

    return (
        <div className="bg-white border-[2px] border-black rounded-[20px] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
            <div className="flex items-center space-x-3 mb-4">
                <Avatar name={displayName} size="sm" src={picture || undefined} />
                <button 
                    onClick={onPostClick}
                    className="flex-1 bg-nile-white/40 border-[2px] border-black rounded-lg py-2.5 px-6 text-left text-nile-blue/30 font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all"
                >
                    What's new, {firstName}?
                </button>
            </div>
            
            <div className="flex justify-between items-center px-2 pt-3 border-t-[2px] border-black/5">
                <button className="flex items-center space-x-2 text-black/40 hover:text-nile-blue transition-colors group">
                    <Image size={14} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">Media</span>
                </button>
                <button className="flex items-center space-x-2 text-black/40 hover:text-nile-green transition-colors group">
                    <PlayCircle size={14} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">Video</span>
                </button>
                <button className="flex items-center space-x-2 text-black/40 hover:text-black transition-colors group">
                    <Calendar size={14} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">Live</span>
                </button>
            </div>
        </div>
    );
};

export default PostBar;
