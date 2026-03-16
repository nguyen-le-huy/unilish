import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { getGoalQueryKey } from '../constants/goal-selection.constants';
import { getLearningGoals } from '../api/get-learning-goals';
import type { LearningGoal } from '../types/learning-goal';

export const useLearningGoalsQuery = (languageId?: string) => {
    return useQuery<LearningGoal[], AxiosError<ApiErrorResponse>>({
        queryKey: getGoalQueryKey(languageId),
        queryFn: getLearningGoals,
        enabled: languageId === undefined || languageId.trim().length > 0,
        staleTime: 5 * 60 * 1000,
    });
};
