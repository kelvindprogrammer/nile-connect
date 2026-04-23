// src/hooks/useAnime.ts
// Anime.js animation hooks for NileConnect Hub
import { useEffect, useRef } from 'react';
import anime from "animejs/lib/anime.es.js";

/** Fade + slide up on mount */
export function useFadeUp(deps: unknown[] = []) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        anime({
            targets: ref.current,
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 700,
            easing: 'outExpo',
        });
    }, deps);
    return ref;
}

/** Staggered children fade in */
export function useStaggerFadeUp(selector: string, deps: unknown[] = []) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        const targetsArray = ref.current.querySelectorAll(selector);
        anime({
            targets: targetsArray,
            opacity: [0, 1],
            translateY: [30, 0],
            delay: anime.stagger(80),
            duration: 600,
            easing: 'outExpo',
        });
    }, deps);
    return ref;
}

/** Count-up number animation */
export function useCountUp(target: number, deps: unknown[] = []) {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const obj = { val: 0 };
        anime({
            targets: obj,
            val: target,
            duration: 1200,
            easing: 'outExpo',
            update: () => {
                if (ref.current) ref.current.innerText = Math.round(obj.val).toLocaleString();
            },
        });
    }, deps);
    return ref;
}

/** Slide in from left */
export function useSlideInLeft(deps: unknown[] = []) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        anime({
            targets: ref.current,
            opacity: [0, 1],
            translateX: [-60, 0],
            duration: 700,
            easing: 'outExpo',
        });
    }, deps);
    return ref;
}

/** Pop scale in */
export function usePopIn(deps: unknown[] = []) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        anime({
            targets: ref.current,
            opacity: [0, 1],
            scale: [0.85, 1],
            duration: 500,
            easing: 'outBack(2)',
        });
    }, deps);
    return ref;
}
