import React, { useState, useEffect } from 'react';

interface AvatarProps {
    src?: string;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Pass true when this avatar represents the logged-in user to auto-use uploaded photo */
    isSelf?: boolean;
    /** Show a small status dot in the corner — 'online' (green) or 'offline' (gray) */
    presence?: 'online' | 'offline';
}

const AVATAR_KEY = 'nile_profile_picture';
const AVATAR_EVENT = 'nile:avatar-changed';

const sizeMap = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-32 h-32 text-3xl',
};

const dotSizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
    xl: 'w-5 h-5',
};

const Avatar: React.FC<AvatarProps> = ({
    src,
    name,
    size = 'md',
    isSelf = false,
    presence,
}) => {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const [selfPic, setSelfPic] = useState<string | null>(() =>
        isSelf ? localStorage.getItem(AVATAR_KEY) : null
    );

    useEffect(() => {
        if (!isSelf) return;
        const handler = (e: Event) => {
            setSelfPic((e as CustomEvent<string | null>).detail);
        };
        window.addEventListener(AVATAR_EVENT, handler);
        return () => window.removeEventListener(AVATAR_EVENT, handler);
    }, [isSelf]);

    const displaySrc = src || (isSelf ? selfPic : null);

    // Color palette for initials avatars (deterministic by name)
    const colorPairs = [
        ['#1E499D', '#fff'], ['#6CBB56', '#fff'], ['#0d1f47', '#6CBB56'],
        ['#f59e0b', '#000'], ['#ef4444', '#fff'], ['#8b5cf6', '#fff'],
        ['#0891b2', '#fff'], ['#d97706', '#fff'],
    ];
    const colorIdx = name.charCodeAt(0) % colorPairs.length;
    const [bg, fg] = colorPairs[colorIdx];

    return (
        <div className="relative inline-flex flex-shrink-0">
            <div
                className={`${sizeMap[size]} rounded-full ring-2 ring-white shadow-soft-xs flex items-center justify-center overflow-hidden flex-shrink-0`}
            >
                {displaySrc ? (
                    <img src={displaySrc} alt={name} className="w-full h-full object-cover" />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: bg }}
                    >
                        <span className="font-semibold" style={{ color: fg }}>{initials}</span>
                    </div>
                )}
            </div>
            {presence && (
                <span
                    className={`absolute bottom-0 right-0 ${dotSizeMap[size]} rounded-full ring-2 ring-white ${presence === 'online' ? 'bg-nile-green' : 'bg-gray-300'}`}
                />
            )}
        </div>
    );
};

export default Avatar;
