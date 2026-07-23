import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    Course,
    CourseListQuery,
    CourseListResponse,
    CourseTreeDTO,
    CreateCoursePayload,
    UpdateCoursePayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/courses';

export const courseApi = {
    /**
     * Paginated & filterable course list.
     * Replaces the old series-scoped `getCoursesBySeriesId`.
     *
     * NOTE: The backend contract (BE-04) specifies:
     *   PATCH /curriculum/courses/:courseId/status
     * Currently uses /toggle until BE migrates the route.
     */
    getCourses: async (query: CourseListQuery): Promise<CourseListResponse> => {
        const response = await apiClient.get<ApiResponse<Course[]>>(BASE_PATH, {
            params: query,
        });
        return {
            data: response.data.data,
            meta: response.data.meta ?? { page: 1, limit: response.data.data.length, total: response.data.data.length, pages: 1 },
        };
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

    uploadCourseThumbnail: async (file: File): Promise<{ url: string; type: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'curriculum/courses/thumbnails');
        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload/image', formData);
        return response.data.data;
    },

    /**
     * Toggle course active/inactive status.
     * Contract (BE-04): PATCH /curriculum/courses/:courseId/status
     * Current backend uses /toggle; update when BE-04 completes.
     */
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
