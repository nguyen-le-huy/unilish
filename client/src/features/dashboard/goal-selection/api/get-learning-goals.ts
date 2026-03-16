import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { LearningGoal } from '../types/learning-goal';

export const getLearningGoals = async (): Promise<LearningGoal[]> => {
    return apiGetUnwrappedEnvelope<LearningGoal[]>('/curriculum/goals', {
        params: {
            page: 1,
            limit: 100,
            isActive: true,
        },
    });
};
