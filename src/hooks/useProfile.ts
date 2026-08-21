import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api';

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

/**
 * An untouched profile is genuinely empty.
 *
 * This hook used to seed every account with a placeholder bio, a
 * "linkedin.com/in/username" link, a fictional research role and four generic
 * skills. Those placeholders were indistinguishable from real data: they were
 * rendered on the public profile as though the student had written them, and
 * they scored full marks in the completeness calculation — which is why
 * Profile Strength read 100% for a profile nobody had filled in.
 */
const EMPTY_PROFILE: ExtendedProfile = {
    bio: '',
    location: '',
    major: '',
    linkedIn: '',
    portfolio: '',
    github: '',
    phone: '',
    experiences: [],
    skills: [],
};

/** Shape of the extended fields on GET/PUT /api/student/profile. */
interface BackendProfile {
    bio?: string | null;
    location?: string | null;
    phone?: string | null;
    linked_in?: string | null;
    portfolio?: string | null;
    github?: string | null;
    major?: string | null;
    skills?: string[] | null;
    experiences?: Experience[] | null;
}

const fromBackend = (p: BackendProfile | undefined): ExtendedProfile => ({
    bio: p?.bio ?? '',
    location: p?.location ?? '',
    major: p?.major ?? '',
    linkedIn: p?.linked_in ?? '',
    portfolio: p?.portfolio ?? '',
    github: p?.github ?? '',
    phone: p?.phone ?? '',
    experiences: p?.experiences ?? [],
    skills: p?.skills ?? [],
});

const toBackend = (p: Partial<ExtendedProfile>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (p.bio !== undefined) out.bio = p.bio;
    if (p.location !== undefined) out.location = p.location;
    if (p.major !== undefined) out.major = p.major;
    if (p.linkedIn !== undefined) out.linked_in = p.linkedIn;
    if (p.portfolio !== undefined) out.portfolio = p.portfolio;
    if (p.github !== undefined) out.github = p.github;
    if (p.phone !== undefined) out.phone = p.phone;
    if (p.skills !== undefined) out.skills = p.skills;
    if (p.experiences !== undefined) out.experiences = p.experiences;
    return out;
};

// Cached last-known profile, so a slow /api/student/profile round trip does not
// flash an empty profile on every navigation. This is a render cache only —
// the server is always the source of truth and overwrites it on arrival.
const CACHE_PREFIX = 'nile_profile_cache';
const cacheKey = (userId?: string) => (userId ? `${CACHE_PREFIX}_${userId}` : CACHE_PREFIX);

const readCache = (userId?: string): ExtendedProfile | null => {
    try {
        const raw = localStorage.getItem(cacheKey(userId));
        return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : null;
    } catch {
        return null;
    }
};

const writeCache = (userId: string | undefined, profile: ExtendedProfile) => {
    try {
        localStorage.setItem(cacheKey(userId), JSON.stringify(profile));
    } catch {
        /* quota or private mode — the cache is optional */
    }
};

export function useProfile(userId?: string) {
    const [profile, setProfile] = useState<ExtendedProfile>(() => readCache(userId) ?? EMPTY_PROFILE);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Resetting on a user change happens during render, not in an effect: the
    // stale user's profile must never be painted under the new user's name,
    // and React applies a render-phase update before committing anything.
    const [loadedFor, setLoadedFor] = useState(userId);
    if (loadedFor !== userId) {
        setLoadedFor(userId);
        setProfile(readCache(userId) ?? EMPTY_PROFILE);
        setIsLoading(true);
        setError(null);
    }

    // Bumped by reload(). The cancellation flag stops a response that arrives
    // after an account switch — or after the component unmounts — from
    // overwriting the newer user's profile.
    const [reloadToken, setReloadToken] = useState(0);
    const reload = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        apiClient
            .get<{ data: BackendProfile }>('/api/student/profile')
            .then(({ data }) => {
                if (cancelled) return;
                const next = fromBackend(data.data);
                setProfile(next);
                setError(null);
                writeCache(userId, next);
            })
            .catch(() => {
                if (cancelled) return;
                // Keep whatever the cache held and surface the failure rather
                // than presenting an empty profile as if it were the truth.
                setError('Could not load your profile. Showing your last saved copy.');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [userId, reloadToken]);

    /**
     * Persists a partial update to the server and adopts the server's response
     * as the new state. Rejects on failure so callers can surface an error
     * instead of showing a success toast for a save that never happened.
     */
    const updateProfile = useCallback(
        async (updates: Partial<ExtendedProfile>): Promise<ExtendedProfile> => {
            const { data } = await apiClient.put<{ data: BackendProfile }>(
                '/api/student/profile',
                toBackend(updates),
            );
            const next = fromBackend(data.data);
            setProfile(next);
            writeCache(userId, next);
            return next;
        },
        [userId],
    );

    return { profile, updateProfile, isLoading, error, reload };
}

// ── completeness ─────────────────────────────────────────────────────────────

export interface ProfileSignals {
    hasName: boolean;
    hasEmail: boolean;
    hasAvatar?: boolean;
    hasResume?: boolean;
}

export interface ProfileCompletion {
    percent: number;
    /** Human-readable labels for the sections still to be filled in. */
    missing: string[];
    completed: string[];
}

interface Criterion {
    label: string;
    weight: number;
    /** Partial credit, 0–1. */
    score: (p: ExtendedProfile, s: ProfileSignals) => number;
}

const filled = (v: string | undefined) => (v ?? '').trim().length > 0;

/**
 * Weighted criteria for profile completeness. Weights sum to exactly 100, so
 * 100% means every section is genuinely done and nothing else can push the
 * number there. Skills award partial credit so adding one skill visibly moves
 * the bar without pretending the section is finished.
 */
const CRITERIA: Criterion[] = [
    { label: 'Your name', weight: 8, score: (_p, s) => (s.hasName ? 1 : 0) },
    { label: 'Email address', weight: 5, score: (_p, s) => (s.hasEmail ? 1 : 0) },
    { label: 'Profile photo', weight: 5, score: (_p, s) => (s.hasAvatar ? 1 : 0) },
    { label: 'A short bio', weight: 15, score: p => (p.bio.trim().length >= 40 ? 1 : filled(p.bio) ? 0.5 : 0) },
    { label: 'Your major', weight: 8, score: p => (filled(p.major) ? 1 : 0) },
    { label: 'Location', weight: 4, score: p => (filled(p.location) ? 1 : 0) },
    { label: 'Phone number', weight: 4, score: p => (filled(p.phone) ? 1 : 0) },
    {
        label: 'At least three skills',
        weight: 14,
        score: p => Math.min(p.skills.filter(s => s.trim()).length, 3) / 3,
    },
    { label: 'Work or project experience', weight: 14, score: p => (p.experiences.length > 0 ? 1 : 0) },
    { label: 'LinkedIn profile', weight: 8, score: p => (filled(p.linkedIn) ? 1 : 0) },
    {
        label: 'A portfolio or GitHub link',
        weight: 5,
        score: p => (filled(p.portfolio) || filled(p.github) ? 1 : 0),
    },
    { label: 'An uploaded CV', weight: 10, score: (_p, s) => (s.hasResume ? 1 : 0) },
];

/** Full completeness breakdown — percent plus what is still outstanding. */
export function getProfileCompletion(
    profile: ExtendedProfile,
    signals: ProfileSignals,
): ProfileCompletion {
    let earned = 0;
    const missing: string[] = [];
    const completed: string[] = [];

    for (const c of CRITERIA) {
        const ratio = Math.max(0, Math.min(1, c.score(profile, signals)));
        earned += c.weight * ratio;
        if (ratio >= 1) completed.push(c.label);
        else missing.push(c.label);
    }

    return { percent: Math.round(earned), missing, completed };
}

/**
 * Profile strength as a 0–100 percentage.
 *
 * `signals` carries facts that live outside the extended profile (avatar,
 * uploaded CV). Passing them is optional but recommended — omitting them
 * simply means those criteria score zero, never that they are assumed done.
 */
export function calculateProfileStrength(
    profile: ExtendedProfile,
    hasName: boolean,
    hasEmail: boolean,
    extras: Pick<ProfileSignals, 'hasAvatar' | 'hasResume'> = {},
): number {
    return getProfileCompletion(profile, { hasName, hasEmail, ...extras }).percent;
}
