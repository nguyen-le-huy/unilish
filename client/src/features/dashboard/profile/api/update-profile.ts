import { apiPatchUnwrappedEnvelope } from '@/lib/axios';
import type { User } from '@/features/auth/types';

export interface UpdateProfilePayload {
    fullName?: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    dateOfBirth?: string | null;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    nativeLanguage?: string;
    learningGoal?: string | null;
    targetLevel?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
    return apiPatchUnwrappedEnvelope<User, UpdateProfilePayload>('/users/me', payload);
};
