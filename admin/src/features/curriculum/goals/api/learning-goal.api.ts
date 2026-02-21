import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    CreateLearningGoalPayload,
    DuplicateLearningGoalPayload,
    LearningGoal,
    LearningGoalListQuery,
    LearningGoalListResponse,
    TestLearningGoalPayload,
    TestLearningGoalResult,
    UpdateLearningGoalPayload,
} from '../types/learning-goal.types';

const BASE_PATH = '/curriculum/goals';

export const learningGoalApi = {
    getLearningGoals: async (query: LearningGoalListQuery = {}): Promise<LearningGoalListResponse> => {
        const response = await apiClient.get<ApiResponse<LearningGoal[]>>(BASE_PATH, { params: query });

        return {
            data: response.data.data,
            meta: response.data.meta ?? {
                page: 1,
                limit: query.limit ?? 20,
                total: response.data.data.length,
                pages: 1,
            },
        };
    },

    getLearningGoalBySlug: async (slug: string): Promise<LearningGoal> => {
        const response = await apiClient.get<ApiResponse<LearningGoal>>(`${BASE_PATH}/${slug}`);
        return response.data.data;
    },

    createLearningGoal: async (payload: CreateLearningGoalPayload): Promise<LearningGoal> => {
        const response = await apiClient.post<ApiResponse<LearningGoal>>(BASE_PATH, payload);
        return response.data.data;
    },

    updateLearningGoal: async (slug: string, payload: UpdateLearningGoalPayload): Promise<LearningGoal> => {
        const response = await apiClient.put<ApiResponse<LearningGoal>>(`${BASE_PATH}/${slug}`, payload);
        return response.data.data;
    },

    duplicateLearningGoal: async (slug: string, payload: DuplicateLearningGoalPayload): Promise<LearningGoal> => {
        const response = await apiClient.post<ApiResponse<LearningGoal>>(`${BASE_PATH}/${slug}/duplicate`, payload);
        return response.data.data;
    },

    toggleLearningGoalStatus: async (slug: string): Promise<LearningGoal> => {
        const response = await apiClient.patch<ApiResponse<LearningGoal>>(`${BASE_PATH}/${slug}/toggle`);
        return response.data.data;
    },

    testLearningGoal: async (slug: string, payload: TestLearningGoalPayload): Promise<TestLearningGoalResult> => {
        const response = await apiClient.post<ApiResponse<TestLearningGoalResult>>(`${BASE_PATH}/${slug}/test`, payload);
        return response.data.data;
    },
};
