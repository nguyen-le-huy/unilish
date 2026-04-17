import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    ICreateExamTestPayload,
    IExamAnalyticsSummary,
    IExamTest,
    IExamTestFilters,
    IExamVersionItem,
    IPaginatedExamTests,
    IUpdateExamStatusPayload,
    IUpdateExamTestPayload,
} from '../types';

const BASE_PATH = '/exam-tests';

function serializeFilters(filters: IExamTestFilters): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.format) params.format = filters.format;
    if (filters.status) params.status = filters.status;
    return params;
}

export const examTestService = {
    getAll: async (filters: IExamTestFilters): Promise<IPaginatedExamTests> => {
        const response = await apiClient.get<ApiResponse<IPaginatedExamTests>>(BASE_PATH, {
            params: serializeFilters(filters),
        });
        return response.data.data;
    },

    getById: async (id: string): Promise<IExamTest> => {
        const response = await apiClient.get<ApiResponse<IExamTest>>(`${BASE_PATH}/${id}`);
        return response.data.data;
    },

    create: async (payload: ICreateExamTestPayload): Promise<IExamTest> => {
        const response = await apiClient.post<ApiResponse<IExamTest>>(BASE_PATH, payload);
        return response.data.data;
    },

    update: async (id: string, payload: IUpdateExamTestPayload): Promise<IExamTest> => {
        const response = await apiClient.put<ApiResponse<IExamTest>>(`${BASE_PATH}/${id}`, payload);
        return response.data.data;
    },

    updateStatus: async (id: string, payload: IUpdateExamStatusPayload): Promise<IExamTest> => {
        const response = await apiClient.patch<ApiResponse<IExamTest>>(
            `${BASE_PATH}/${id}/status`,
            payload,
        );
        return response.data.data;
    },

    getVersionHistory: async (id: string): Promise<IExamVersionItem[]> => {
        const response = await apiClient.get<ApiResponse<IExamVersionItem[]>>(
            `${BASE_PATH}/${id}/versions`,
        );
        return response.data.data;
    },

    rollback: async (id: string, version: number): Promise<IExamTest> => {
        const response = await apiClient.post<ApiResponse<IExamTest>>(
            `${BASE_PATH}/${id}/rollback/${version}`,
        );
        return response.data.data;
    },

    getAnalytics: async (id: string): Promise<IExamAnalyticsSummary> => {
        const response = await apiClient.get<ApiResponse<IExamAnalyticsSummary>>(
            `${BASE_PATH}/${id}/analytics`,
        );
        return response.data.data;
    },
};
