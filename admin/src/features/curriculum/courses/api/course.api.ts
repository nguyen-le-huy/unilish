import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    Course,
    CourseListQuery,
    CourseTreeDTO,
    CreateCoursePayload,
    UpdateCoursePayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/courses';

export const courseApi = {
    getCoursesBySeriesId: async (query: CourseListQuery): Promise<Course[]> => {
        const response = await apiClient.get<ApiResponse<Course[]>>(BASE_PATH, {
            params: query,
        });
        return response.data.data;
    },

    getCourseTree: async (courseId: string): Promise<CourseTreeDTO> => {
        const response = await apiClient.get<ApiResponse<CourseTreeDTO>>(
            `${BASE_PATH}/${courseId}/tree`,
        );
        return response.data.data;
    },

    getCourseById: async (courseId: string): Promise<Course> => {
        const response = await apiClient.get<ApiResponse<Course>>(
            `${BASE_PATH}/${courseId}`,
        );
        return response.data.data;
    },

    createCourse: async (payload: CreateCoursePayload): Promise<Course> => {
        const response = await apiClient.post<ApiResponse<Course>>(BASE_PATH, payload);
        return response.data.data;
    },

    updateCourse: async (courseId: string, payload: UpdateCoursePayload): Promise<Course> => {
        const response = await apiClient.put<ApiResponse<Course>>(
            `${BASE_PATH}/${courseId}`,
            payload,
        );
        return response.data.data;
    },

    toggleCourseStatus: async (courseId: string): Promise<Course> => {
        const response = await apiClient.patch<ApiResponse<Course>>(
            `${BASE_PATH}/${courseId}/toggle`,
        );
        return response.data.data;
    },

    deleteCourse: async (courseId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${courseId}`);
    },
};
