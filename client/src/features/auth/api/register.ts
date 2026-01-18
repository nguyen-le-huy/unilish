import { api } from '@/lib/axios';
import { RegisterPayload, RegisterResponse } from '../types';

export const register = async (data: RegisterPayload): Promise<RegisterResponse> => {
    return api.post('/auth/register', data);
};
