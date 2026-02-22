import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    CreateLessonPayload,
    LessonSummary,
    ReorderLessonsPayload,
    UpdateLessonPayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/lessons';

export const lessonApi = {
    getLessonsByUnitId: async (unitId: string): Promise<LessonSummary[]> => {
        const response = await apiClient.get<ApiResponse<LessonSummary[]>>(BASE_PATH, {
            params: { unitId },
        });
        return response.data.data;
    },

    getLessonById: async (lessonId: string): Promise<LessonSummary> => {
        const response = await apiClient.get<ApiResponse<LessonSummary>>(
            `${BASE_PATH}/${lessonId}`,
        );
        return response.data.data;
    },

    createLesson: async (payload: CreateLessonPayload): Promise<LessonSummary> => {
        const response = await apiClient.post<ApiResponse<LessonSummary>>(BASE_PATH, payload);
        return response.data.data;
    },

    updateLesson: async (lessonId: string, payload: UpdateLessonPayload): Promise<LessonSummary> => {
        const response = await apiClient.put<ApiResponse<LessonSummary>>(
            `${BASE_PATH}/${lessonId}`,
            payload,
        );
        return response.data.data;
    },

    deleteLesson: async (lessonId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${lessonId}`);
    },

    reorderLessons: async (payload: ReorderLessonsPayload): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/reorder`, payload);
    },
};
