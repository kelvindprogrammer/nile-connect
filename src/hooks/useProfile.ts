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
    bio: 'Professional student at Nile University, passionate about developing impactful solutions and exploring new technologies. Seeking opportunities to grow and contribute to the industry.',
    location: 'Abuja, Nigeria',
    major: 'Computer Science',
    linkedIn: 'linkedin.com/in/username',
    portfolio: 'portfolio-link.com',
    github: 'github.com/username',
    phone: '+234 000 000 0000',
    experiences: [
        {
            id: 'default-1',
            title: 'Undergraduate Researcher',
            company: 'Nile University of Nigeria',
            duration: 'Jan 2023 – Present',
            description: 'Assisting in research projects related to software engineering and data analysis.'
        }
    ],
    skills: ['Teamwork', 'Communication', 'Problem Solving', 'Leadership'],
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
