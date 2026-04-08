import apiClient from '@/lib/axios';
import type { LoginFormData } from '../types/auth.schema';
import type { User } from '@/types/auth';

export interface AuthApiResponse {
    status: string;
    code: number;
    message: string;
    data: {
        user: User;
        accessToken: string;
        refreshToken?: string;
        // Backward compatibility for older API payloads.
        token?: string;
    };
}

/**
 * Admin login API call
 * @param credentials - Email and password
 * @returns Auth response with user and access token
 */
export const loginApi = async (credentials: LoginFormData): Promise<AuthApiResponse> => {
    const response = await apiClient.post<AuthApiResponse>('/auth/login', {
        ...credentials,
        appType: 'admin',
    });
    return response.data;
};

/**
 * Admin logout API call (if backend support)
 */
export const logoutApi = async (): Promise<void> => {
    await apiClient.post('/auth/logout', { appType: 'admin' });
};
