import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    CreateLearningGoalPayload,
    LearningGoal,
    LearningGoalListQuery,
    LearningGoalListResponse,
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

    toggleLearningGoalStatus: async (slug: string): Promise<LearningGoal> => {
        const response = await apiClient.patch<ApiResponse<LearningGoal>>(`${BASE_PATH}/${slug}/toggle`);
        return response.data.data;
    },

    uploadGoalIcon: async (file: File): Promise<{ url: string; type: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'curriculum/goals/icons');

        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload/image', formData);
        return response.data.data;
    },
};
