import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    CourseSeries,
    CourseSeriesListQuery,
    CourseSeriesListResponse,
    CreateCourseSeriesPayload,
    UpdateCourseSeriesPayload,
} from '../types/course-series.types';

const BASE_PATH = '/curriculum/series';

export const courseSeriesApi = {
    getSeriesList: async (query: CourseSeriesListQuery = {}): Promise<CourseSeriesListResponse> => {
        const response = await apiClient.get<ApiResponse<CourseSeries[]>>(BASE_PATH, { params: query });
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

    getSeriesBySlug: async (slug: string): Promise<CourseSeries> => {
        const response = await apiClient.get<ApiResponse<CourseSeries>>(`${BASE_PATH}/${slug}`);
        return response.data.data;
    },

    createSeries: async (payload: CreateCourseSeriesPayload): Promise<CourseSeries> => {
        const response = await apiClient.post<ApiResponse<CourseSeries>>(BASE_PATH, payload);
        return response.data.data;
    },

    updateSeries: async (slug: string, payload: UpdateCourseSeriesPayload): Promise<CourseSeries> => {
        const response = await apiClient.put<ApiResponse<CourseSeries>>(`${BASE_PATH}/${slug}`, payload);
        return response.data.data;
    },

    toggleStatus: async (slug: string): Promise<CourseSeries> => {
        const response = await apiClient.patch<ApiResponse<CourseSeries>>(`${BASE_PATH}/${slug}/toggle`);
        return response.data.data;
    },

    deleteSeries: async (slug: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${slug}`);
    },

    /**
     * Upload a thumbnail image to Cloudinary via the shared /upload/image endpoint.
     * Returns the public Cloudinary URL.
     */
    uploadThumbnail: async (file: File): Promise<{ url: string; type: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'curriculum/series/thumbnails');
        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload/image', formData);
        return response.data.data;
    },
};
