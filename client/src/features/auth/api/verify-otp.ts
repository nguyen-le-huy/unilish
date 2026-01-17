import { api } from '@/lib/axios';

export const verifyOTP = async (email: string, otp: string): Promise<any> => {
    return api.post('/auth/verify-otp', { email, otp });
};
