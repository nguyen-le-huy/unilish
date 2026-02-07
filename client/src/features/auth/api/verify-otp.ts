import { api } from '@/lib/axios';
import { AuthResponse } from '../types';

export const verifyOTP = async (email: string, otp: string): Promise<AuthResponse> => {
    return api.post('/auth/verify-otp', { email, otp }) as unknown as Promise<AuthResponse>;
};
