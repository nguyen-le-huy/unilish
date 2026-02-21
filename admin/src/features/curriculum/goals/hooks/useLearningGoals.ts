import { useQuery } from '@tanstack/react-query';
import { learningGoalApi } from '../api/learning-goal.api';
import { LEARNING_GOAL_QUERY_KEYS } from '../constants/query-keys';
import type { LearningGoalListQuery } from '../types/learning-goal.types';

export const useLearningGoals = (query: LearningGoalListQuery = {}) => {
    return useQuery({
        queryKey: LEARNING_GOAL_QUERY_KEYS.list(query),
        queryFn: () => learningGoalApi.getLearningGoals(query),
        staleTime: 60 * 1000,
    });
};

export const useLearningGoalDetail = (slug: string | undefined) => {
    return useQuery({
        queryKey: LEARNING_GOAL_QUERY_KEYS.detail(slug ?? 'new'),
        queryFn: () => learningGoalApi.getLearningGoalBySlug(slug as string),
        enabled: Boolean(slug && slug !== 'new'),
        staleTime: 5 * 60 * 1000,
    });
};
