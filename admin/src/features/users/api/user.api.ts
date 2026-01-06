import apiClient from '@/lib/axios';
import type { UserResponse, UserFilter, UpdateSubscriptionPayload, UpdateRolePayload, UserStatsOverview, User } from '../types';

interface ApiResponse<T> {
    status: string;
    code: number;
    message: string;
    data: T;
    meta?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export const userApi = {
    getUsers: async (filter: UserFilter): Promise<UserResponse> => {
        const response = await apiClient.get<ApiResponse<User[]>>('/users', { params: filter });
        return {
            users: response.data.data,
            pagination: response.data.meta!
        };
    },

    getUser: async (id: string): Promise<User> => {
        const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
        return response.data.data;
    },

    updateSubscription: async (id: string, payload: UpdateSubscriptionPayload): Promise<User> => {
        const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/subscription`, payload);
        return response.data.data;
    },

    updateRole: async (id: string, payload: UpdateRolePayload): Promise<User> => {
        const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/role`, payload);
        return response.data.data;
    },

    getStats: async (): Promise<UserStatsOverview> => {
        const response = await apiClient.get<ApiResponse<UserStatsOverview>>('/users/stats');
        return response.data.data;
    },
};
