import { apiPatchUnwrappedEnvelope } from '@/lib/axios';
import type { User } from '@/features/auth/types';

export interface UpdateOnboardingProfilePayload {
    learningGoal?: string | null;
    nativeLanguage?: string;
    currentLevel?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export const updateOnboardingProfile = async (payload: UpdateOnboardingProfilePayload): Promise<User> => {
    return apiPatchUnwrappedEnvelope<User, UpdateOnboardingProfilePayload>('/users/me', payload);
};
