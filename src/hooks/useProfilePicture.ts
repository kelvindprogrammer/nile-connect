import { useState, useCallback, useEffect } from 'react';

const KEY = 'nile_profile_picture';
const EVENT = 'nile:avatar-changed';

export function useProfilePicture() {
    const [picture, setPicture] = useState<string | null>(() => localStorage.getItem(KEY));

    // Keep in sync if another tab/component updates the picture
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<string | null>).detail;
            setPicture(detail);
        };
        window.addEventListener(EVENT, handler);
        return () => window.removeEventListener(EVENT, handler);
    }, []);

    const uploadPicture = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Only image files are accepted.'));
                return;
            }
            if (file.size > 4 * 1024 * 1024) {
                reject(new Error('Image must be under 4 MB.'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                localStorage.setItem(KEY, base64);
                setPicture(base64);
                window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: base64 }));
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });
    }, []);

    const removePicture = useCallback(() => {
        localStorage.removeItem(KEY);
        setPicture(null);
        window.dispatchEvent(new CustomEvent<null>(EVENT, { detail: null }));
    }, []);

    return { picture, uploadPicture, removePicture };
}
