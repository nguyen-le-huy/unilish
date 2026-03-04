import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    IPlacementTest,
    IPlacementTestFilters,
    IPaginatedPlacementTests,
    ICreatePlacementTestPayload,
    IUpdatePlacementTestPayload,
    IUpdateStatusPayload,
    IVersionHistoryItem,
    IPoolValidationResult,
    IAnalyticsSummary,
} from '../types';

const BASE_PATH = '/placement-tests';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeFilters(filters: IPlacementTestFilters): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.language) params.language = filters.language;
    if (filters.status) params.status = filters.status;
    return params;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const placementTestApi = {

    // ─── READ ────────────────────────────────────────────────────────────────

    getAll: async (filters: IPlacementTestFilters): Promise<IPaginatedPlacementTests> => {
        const response = await apiClient.get<ApiResponse<IPaginatedPlacementTests>>(BASE_PATH, {
            params: serializeFilters(filters),
        });
        return response.data.data;
    },

    getById: async (id: string): Promise<IPlacementTest> => {
        const response = await apiClient.get<ApiResponse<IPlacementTest>>(`${BASE_PATH}/${id}`);
        return response.data.data;
    },

    getVersionHistory: async (id: string): Promise<IVersionHistoryItem[]> => {
        const response = await apiClient.get<ApiResponse<IVersionHistoryItem[]>>(
            `${BASE_PATH}/${id}/versions`,
        );
        return response.data.data;
    },

    validatePool: async (id: string): Promise<IPoolValidationResult> => {
        const response = await apiClient.get<ApiResponse<IPoolValidationResult>>(
            `${BASE_PATH}/${id}/pool-validation`,
        );
        return response.data.data;
    },

    getAnalytics: async (id: string, range = '7d'): Promise<IAnalyticsSummary> => {
        const response = await apiClient.get<ApiResponse<IAnalyticsSummary>>(
            `${BASE_PATH}/${id}/analytics`,
            { params: { range } },
        );
        return response.data.data;
    },

    // ─── WRITE ───────────────────────────────────────────────────────────────

    create: async (payload: ICreatePlacementTestPayload): Promise<IPlacementTest> => {
        const response = await apiClient.post<ApiResponse<IPlacementTest>>(BASE_PATH, payload);
        return response.data.data;
    },

    update: async (id: string, payload: IUpdatePlacementTestPayload): Promise<IPlacementTest> => {
        const response = await apiClient.put<ApiResponse<IPlacementTest>>(
            `${BASE_PATH}/${id}`,
            payload,
        );
        return response.data.data;
    },

    updateStatus: async (id: string, payload: IUpdateStatusPayload): Promise<IPlacementTest> => {
        const response = await apiClient.patch<ApiResponse<IPlacementTest>>(
            `${BASE_PATH}/${id}/status`,
            payload,
        );
        return response.data.data;
    },

    rollback: async (id: string, version: number): Promise<IPlacementTest> => {
        const response = await apiClient.post<ApiResponse<IPlacementTest>>(
            `${BASE_PATH}/${id}/rollback/${version}`,
        );
        return response.data.data;
    },
};
