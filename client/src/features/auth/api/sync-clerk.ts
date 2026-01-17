import { api } from '@/lib/axios';
import { AuthResponse, SyncClerkPayload } from '../types';

export const syncClerk = async (data: SyncClerkPayload): Promise<AuthResponse> => {
    return api.post('/auth/sync-clerk', data);
};
