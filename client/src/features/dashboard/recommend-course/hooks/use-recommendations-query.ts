import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { useAuthStore } from '@/stores/auth.store';
import type { RecommendedSeriesDto } from '../types/recommend-course.types';
import { getRecommendations } from '../api/get-recommendations';

const RECOMMENDATIONS_QUERY_KEY = ['dashboard', 'recommendations'] as const;

export const useRecommendationsQuery = () => {
    const userId = useAuthStore((state) => state.user?._id);
    const currentLevel = useAuthStore((state) => state.user?.currentLevel);
    const learningLanguageId = useAuthStore((state) => state.user?.learningLanguageId);
    const learningGoalId = useAuthStore((state) => state.user?.learningGoalId);
    const nativeLanguage = useAuthStore((state) => state.user?.nativeLanguage);
    const learningGoal = useAuthStore((state) => state.user?.learningGoal);

    return useQuery<RecommendedSeriesDto[], AxiosError<ApiErrorResponse>>({
        queryKey: [
            ...RECOMMENDATIONS_QUERY_KEY,
            userId,
            currentLevel,
            learningLanguageId ?? nativeLanguage ?? null,
            learningGoalId ?? learningGoal ?? null,
        ],
        queryFn: getRecommendations,
        enabled: Boolean(userId && currentLevel && currentLevel !== 'A0'),
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
