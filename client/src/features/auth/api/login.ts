import { api } from '@/lib/axios';
import { AuthResponse, LoginPayload } from '../types';

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
    return api.post('/auth/login', data);
};
