import type { LearningGoalListQuery } from '../types/learning-goal.types';

export const LEARNING_GOAL_QUERY_KEYS = {
    all: ['learning-goals'] as const,
    lists: () => [...LEARNING_GOAL_QUERY_KEYS.all, 'list'] as const,
    list: (query: LearningGoalListQuery) => [...LEARNING_GOAL_QUERY_KEYS.lists(), query] as const,
    details: () => [...LEARNING_GOAL_QUERY_KEYS.all, 'detail'] as const,
    detail: (slug: string) => [...LEARNING_GOAL_QUERY_KEYS.details(), slug] as const,
};
