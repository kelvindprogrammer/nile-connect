import React from 'react';

interface AvatarProps {
    src?: string;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    borderColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', borderColor = 'border-black' }) => {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const sizes = {
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-12 h-12 text-xs',
        lg: 'w-20 h-20 text-xl',
        xl: 'w-32 h-32 text-3xl'
    };

    return (
        <div className={`${sizes[size]} rounded-full border-[2px] ${borderColor} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-nile-white flex items-center justify-center overflow-hidden flex-shrink-0`}>
            {src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="font-black text-black">{initials}</span>
            )}
        </div>
    );
};

export default Avatar;
