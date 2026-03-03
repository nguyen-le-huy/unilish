import { api } from '@/lib/axios';
import { ApiEnvelope, AuthResponse, LoginPayload } from '../types';

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', data);
    return (response as unknown as ApiEnvelope<AuthResponse>).data;
};
