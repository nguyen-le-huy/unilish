import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    IQuestion,
    IQuestionFilters,
    IPaginatedQuestions,
    ICreateQuestionPayload,
    IUpdateQuestionPayload,
    IUpdateQuestionStatusPayload,
    IBulkActionPayload,
    IBulkResult,
} from '../types';

const BASE_PATH = '/questions';

/** Converts array filter fields to comma-separated strings for the API */
function serializeFilters(filters: IQuestionFilters): Record<string, unknown> {
    const params: Record<string, unknown> = { ...filters };
    const arrayFields = ['source', 'skill', 'difficulty', 'status', 'tags'] as const;
    for (const field of arrayFields) {
        const value = filters[field];
        if (Array.isArray(value) && value.length > 0) {
            params[field] = value.join(',');
        } else if (Array.isArray(value) && value.length === 0) {
            delete params[field];
        }
    }
    return params;
}

export const questionApi = {
    // ─── READ ─────────────────────────────────────────────────────────────────

    getAll: async (filters: IQuestionFilters): Promise<IPaginatedQuestions> => {
        const response = await apiClient.get<ApiResponse<IPaginatedQuestions>>(BASE_PATH, {
            params: serializeFilters(filters),
        });
        return response.data.data;
    },

    getById: async (id: string): Promise<IQuestion> => {
        const response = await apiClient.get<ApiResponse<IQuestion>>(`${BASE_PATH}/${id}`);
        return response.data.data;
    },

    // ─── WRITE ────────────────────────────────────────────────────────────────

    create: async (payload: ICreateQuestionPayload): Promise<IQuestion> => {
        const response = await apiClient.post<ApiResponse<IQuestion>>(BASE_PATH, payload);
        return response.data.data;
    },

    update: async (id: string, payload: IUpdateQuestionPayload): Promise<IQuestion> => {
        const response = await apiClient.put<ApiResponse<IQuestion>>(
            `${BASE_PATH}/${id}`,
            payload,
        );
        return response.data.data;
    },

    updateStatus: async (id: string, payload: IUpdateQuestionStatusPayload): Promise<IQuestion> => {
        const response = await apiClient.patch<ApiResponse<IQuestion>>(
            `${BASE_PATH}/${id}/status`,
            payload,
        );
        return response.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${id}`);
    },

    // ─── BULK ─────────────────────────────────────────────────────────────────

    bulkAction: async (payload: IBulkActionPayload): Promise<IBulkResult> => {
        const response = await apiClient.post<ApiResponse<IBulkResult>>(
            `${BASE_PATH}/bulk`,
            payload,
        );
        return response.data.data;
    },

    // ─── EXPORT ───────────────────────────────────────────────────────────────

    export: async (filters: Omit<IQuestionFilters, 'page' | 'limit' | 'sortBy' | 'sortOrder'>, format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
        const response = await apiClient.get(`${BASE_PATH}/export`, {
            params: { ...serializeFilters(filters as IQuestionFilters), format },
            responseType: 'blob',
        });
        return response.data as Blob;
    },
};
