import { apiPostUnwrappedEnvelope } from '@/lib/axios';

interface UploadAvatarResponse {
    url: string;
    type: string;
}

export const uploadProfileAvatar = async (file: File): Promise<UploadAvatarResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'unilish/profile-avatars');

    return apiPostUnwrappedEnvelope<UploadAvatarResponse, FormData>('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
