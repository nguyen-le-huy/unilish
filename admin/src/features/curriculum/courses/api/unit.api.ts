import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    CreateUnitPayload,
    ReorderUnitsPayload,
    Unit,
    UpdateUnitPayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/units';

export const unitApi = {
    getUnitsByCourseId: async (courseId: string): Promise<Unit[]> => {
        const response = await apiClient.get<ApiResponse<Unit[]>>(BASE_PATH, {
            params: { courseId },
        });
        return response.data.data;
    },

    getUnitById: async (unitId: string): Promise<Unit> => {
        const response = await apiClient.get<ApiResponse<Unit>>(`${BASE_PATH}/${unitId}`);
        return response.data.data;
    },

    createUnit: async (payload: CreateUnitPayload): Promise<Unit> => {
        const response = await apiClient.post<ApiResponse<Unit>>(BASE_PATH, payload);
        return response.data.data;
    },

    updateUnit: async (unitId: string, payload: UpdateUnitPayload): Promise<Unit> => {
        const response = await apiClient.put<ApiResponse<Unit>>(
            `${BASE_PATH}/${unitId}`,
            payload,
        );
        return response.data.data;
    },

    deleteUnit: async (unitId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${unitId}`);
    },

    reorderUnits: async (payload: ReorderUnitsPayload): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/reorder`, payload);
    },
};
