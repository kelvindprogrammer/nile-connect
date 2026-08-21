/**
 * Persisted onboarding state.
 *
 * The welcome carousel had no memory: `/` redirected to `/onboarding`
 * unconditionally, so the three intro slides reappeared on every visit to the
 * app root — including for users who were already signed in. Recording that
 * the carousel has been seen (and honouring an existing session ahead of it)
 * is what stops it repeating.
 *
 * Versioned so a genuinely new intro can be shown again on purpose, rather
 * than being suppressed forever by a flag written by an older build.
 */
const ONBOARDING_VERSION = 1;
const KEY = 'nile_onboarding_seen_v' + ONBOARDING_VERSION;

export const hasSeenOnboarding = (): boolean => {
    try {
        return localStorage.getItem(KEY) === '1';
    } catch {
        // Private mode / storage disabled: showing the intro is the safe
        // fallback, and it stays skippable.
        return false;
    }
};

export const markOnboardingSeen = (): void => {
    try {
        localStorage.setItem(KEY, '1');
    } catch {
        /* storage unavailable — the carousel simply shows again next time */
    }
};

/** Used by account deletion so a fresh account gets the intro again. */
export const clearOnboardingState = (): void => {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* nothing to clear */
    }
};

/** The dashboard route for a role — the single definition of that mapping. */
export const dashboardPathForRole = (role?: string): string => {
    switch (role) {
        case 'staff': return '/staff';
        case 'employer': return '/employer';
        default: return '/student';
    }
};
