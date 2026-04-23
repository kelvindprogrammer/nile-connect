import React, { useEffect } from 'react';

/**
 * GlobalEffects — mounts once at the app root.
 * Handles:
 *  • Ripple on any button click
 */
const GlobalEffects: React.FC = () => {
    useEffect(() => {
        // Remove any lingering cursor:none inline styles from previous cursor system
        document.querySelectorAll<HTMLElement>('*').forEach(el => {
            if (el.style.cursor === 'none') {
                el.style.cursor = '';
            }
        });
        document.body.style.cursor = '';

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('button') as HTMLButtonElement | null;
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height) * 2;
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                width: ${size}px;
                height: ${size}px;
                left: ${e.clientX - rect.left - size / 2}px;
                top:  ${e.clientY - rect.top  - size / 2}px;
                pointer-events: none;
                transform: scale(0);
                animation: nile-ripple 0.55s ease-out forwards;
                z-index: 10;
            `;

            const prevPos = getComputedStyle(btn).position;
            if (prevPos === 'static') btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        };

        document.addEventListener('click', handleClick);

        /* ── Inject ripple keyframe ── */
        if (!document.getElementById('nile-ripple-kf')) {
            const style = document.createElement('style');
            style.id = 'nile-ripple-kf';
            style.innerHTML = `
                @keyframes nile-ripple {
                    to { transform: scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, []);

    return null;
};

export default GlobalEffects;
