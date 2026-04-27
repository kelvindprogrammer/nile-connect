import { useState, useCallback } from 'react';

export interface Experience {
    id: string;
    title: string;
    company: string;
    duration: string;
    description: string;
}

export interface ExtendedProfile {
    bio: string;
    location: string;
    major: string;
    linkedIn: string;
    portfolio: string;
    github: string;
    phone: string;
    experiences: Experience[];
    skills: string[];
}

const STORAGE_KEY = 'nile_extended_profile';

const defaults: ExtendedProfile = {
    bio: '',
    location: 'Abuja, Nigeria',
    major: '',
    linkedIn: '',
    portfolio: '',
    github: '',
    phone: '',
    experiences: [],
    skills: [],
};

export function useProfile() {
    const [profile, setProfile] = useState<ExtendedProfile>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
        } catch {
            return defaults;
        }
    });

    const updateProfile = useCallback((updates: Partial<ExtendedProfile>) => {
        setProfile(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { profile, updateProfile };
}

export function calculateProfileStrength(
    profile: ExtendedProfile,
    hasName: boolean,
    hasEmail: boolean
): number {
    let score = 0;
    if (hasName) score += 15;
    if (hasEmail) score += 10;
    if (profile.bio?.trim()) score += 20;
    if (profile.major?.trim()) score += 15;
    if (profile.location?.trim()) score += 5;
    if (profile.linkedIn?.trim()) score += 15;
    if (profile.portfolio?.trim()) score += 10;
    if (profile.experiences?.length > 0) score += 10;
    return Math.min(score, 100);
}
