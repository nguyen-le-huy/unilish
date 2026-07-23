import apiClient from '@/lib/axios';
import type {
    PaginatedShadowingVideos,
    ShadowingCue,
    SubmitShadowingVideoResponse,
    UpdateShadowingCuesResponse,
} from './types';

const BASE_PATH = '/v1/shadowing/admin/videos';

export const shadowingAdminApi = {
    async listVideos(): Promise<PaginatedShadowingVideos> {
        const response = await apiClient.get<PaginatedShadowingVideos>(BASE_PATH, {
            params: { page: 1, limit: 50 },
        });
        return response.data;
    },

    async submitVideo(url: string): Promise<SubmitShadowingVideoResponse> {
        const response = await apiClient.post<SubmitShadowingVideoResponse>(BASE_PATH, { url });
        return response.data;
    },

    async updateCues(videoId: string, cues: ShadowingCue[], autoTranslate: boolean): Promise<UpdateShadowingCuesResponse> {
        const response = await apiClient.patch<UpdateShadowingCuesResponse>(
            `${BASE_PATH}/${encodeURIComponent(videoId)}/cues`,
            { cues, autoTranslate },
        );
        return response.data;
    },

    async deleteVideo(videoId: string): Promise<void> {
        await apiClient.delete(`${BASE_PATH}/${encodeURIComponent(videoId)}`);
    },
};
