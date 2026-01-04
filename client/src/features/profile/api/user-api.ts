import { apiClient } from '@/lib/axios';
import { UnilishUser } from '@/features/auth/hooks/useAuthSync';

export interface UpdateProfileDTO {
    fullName?: string;
    phoneNumber?: string;
    bio?: string;
    address?: {
        country?: string;
        city?: string;
    };
    dateOfBirth?: Date;
}

export const updateProfile = async (data: UpdateProfileDTO): Promise<{ status: string; data: UnilishUser }> => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
};
