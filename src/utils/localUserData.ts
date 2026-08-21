/**
 * Browser-local, per-user state that must not survive a sign-out.
 *
 * The avatar in particular was stored under one global key, so signing out and
 * signing in as somebody else showed the previous account's photo in the
 * header and on the profile page until they uploaded their own. Clearing these
 * on logout and on account deletion keeps one person's data off another
 * person's screen on a shared machine.
 *
 * Prefixed keys are matched by prefix so per-user entries are all removed,
 * whichever account wrote them.
 */
const EXACT_KEYS = [
    'nile_profile_picture',
];

const PREFIXED_KEYS = [
    'nile_profile_cache',
    // Written by the pre-server-persistence build; removed here so a stale
    // copy of the old placeholder profile cannot resurface.
    'nile_extended_profile',
];

export const clearLocalUserData = (): void => {
    try {
        for (const key of EXACT_KEYS) localStorage.removeItem(key);

        const doomed: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && PREFIXED_KEYS.some(p => key === p || key.startsWith(p + '_'))) doomed.push(key);
        }
        for (const key of doomed) localStorage.removeItem(key);

        // Tell any mounted useProfilePicture instances the avatar is gone, so
        // the header does not keep rendering it until the next full reload.
        window.dispatchEvent(new CustomEvent<null>('nile:avatar-changed', { detail: null }));
    } catch {
        /* storage unavailable — nothing cached to clear */
    }
};
