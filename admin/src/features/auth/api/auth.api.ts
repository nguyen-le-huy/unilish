import apiClient from '@/lib/axios';
import type { LoginFormData } from '../types/auth.schema';
import type { User } from '@/types/auth';

export interface AuthApiResponse {
    status: string;
    code: number;
    message: string;
    data: {
        user: User;
        token: string;
    };
}

/**
 * Admin login API call
 * @param credentials - Email and password
 * @returns Auth response with user and token
 */
export const loginApi = async (credentials: LoginFormData): Promise<AuthApiResponse> => {
    const response = await apiClient.post<AuthApiResponse>('/auth/login', credentials);
    return response.data;
};

/**
 * Admin logout API call (if backend support)
 */
export const logoutApi = async (): Promise<void> => {
    await apiClient.post('/auth/logout');
};
