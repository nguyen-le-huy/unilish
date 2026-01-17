import { api } from '@/lib/axios';
import { RegisterPayload } from '../types';

export const register = async (data: RegisterPayload): Promise<{ message: string; email: string }> => {
    return api.post('/auth/register', data);
};
