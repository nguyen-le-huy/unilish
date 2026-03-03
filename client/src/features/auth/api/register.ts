import { api } from '@/lib/axios';
import { ApiEnvelope, RegisterPayload, RegisterResponse } from '../types';

export const register = async (data: RegisterPayload): Promise<RegisterResponse> => {
    const response = await api.post<ApiEnvelope<RegisterResponse>>('/auth/register', data);
    const envelope = response as unknown as ApiEnvelope<RegisterResponse>;
    return {
        status: envelope.data.status,
        message: envelope.message || envelope.data.message,
        email: envelope.data.email,
    };
};
