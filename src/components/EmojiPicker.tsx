import React, { useEffect, useRef } from 'react';

const EMOJIS = [
    '😀', '😂', '😍', '😊', '😉', '😎', '🤔', '😢',
    '😭', '😡', '👍', '👎', '👏', '🙏', '💪', '🤝',
    '👋', '🔥', '✨', '🎉', '🎓', '📚', '💼', '✅',
    '❌', '❤️', '💙', '💚', '😴', '😅', '😇', '🥳',
    '🤩', '😬', '🙌', '💡', '📌', '📎', '🚀', '🌟',
    '👀', '💯', '🤞', '😁', '🙂', '😐', '😞', '🤗',
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bottom-full right-0 mb-2 bg-white border border-paper-300 rounded-xl shadow-soft-lg p-3 w-64 grid grid-cols-8 gap-1 z-20 anime-fade-in"
        >
            {EMOJIS.map(emoji => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="text-lg leading-none p-1.5 rounded-lg hover:bg-paper-200 transition-colors"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};

export default EmojiPicker;
