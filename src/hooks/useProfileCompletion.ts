import { useProfile, getProfileCompletion, type ProfileCompletion, type ExtendedProfile } from './useProfile';
import { useProfilePicture } from './useProfilePicture';
import { useAuth } from '../context/AuthContext';

export interface ProfileCompletionResult {
    profile: ExtendedProfile;
    completion: ProfileCompletion;
    /** Convenience alias for `completion.percent`. */
    strength: number;
    isLoading: boolean;
}

/**
 * Profile strength, computed the same way everywhere.
 *
 * The dashboard, profile page, career centre and insights page each used to
 * call `calculateProfileStrength` with their own hand-assembled arguments —
 * and none of them passed the avatar or CV signals, so the same profile could
 * report a different percentage on different screens. Composing the inputs in
 * one hook means every screen shows one number.
 */
export function useProfileCompletion(): ProfileCompletionResult {
    const { user } = useAuth();
    const { profile, isLoading } = useProfile(user?.id);
    const { picture } = useProfilePicture();

    const completion = getProfileCompletion(profile, {
        hasName: !!user?.name,
        hasEmail: !!user?.email,
        hasAvatar: !!picture,
        hasResume: !!user?.resumeUrl,
    });

    return { profile, completion, strength: completion.percent, isLoading };
}
