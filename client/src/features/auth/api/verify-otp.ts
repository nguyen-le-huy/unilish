import { api } from '@/lib/axios';
import { ApiEnvelope, AuthResponse } from '../types';

export const verifyOTP = async (email: string, otp: string): Promise<AuthResponse> => {
    const response = await api.post<ApiEnvelope<AuthResponse>>('/auth/verify-otp', { email, otp });
    return (response as unknown as ApiEnvelope<AuthResponse>).data;
};
