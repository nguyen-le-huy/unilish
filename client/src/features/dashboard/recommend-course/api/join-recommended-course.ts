import { apiPatchUnwrappedEnvelope } from '@/lib/axios';
import type { User } from '@/features/auth/types';

interface JoinRecommendedCoursePayload {
    lastActiveCourseId: string;
}

export const joinRecommendedCourse = async (seriesId: string): Promise<User> => {
    return apiPatchUnwrappedEnvelope<User, JoinRecommendedCoursePayload>('/users/me', {
        lastActiveCourseId: seriesId,
    });
};
