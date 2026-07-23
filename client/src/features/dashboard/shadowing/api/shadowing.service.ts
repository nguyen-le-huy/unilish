import { api } from '@/lib/axios';
import type {
    PaginatedVideos,
    PronunciationResult,
    VideoStatusResponse,
} from '../types/shadowing.types';

const SHADOWING_PATH = '/shadowing';
const SHADOWING_VIDEOS_PATH = `${SHADOWING_PATH}/videos`;

export const shadowingService = {
    getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
        return api.get<VideoStatusResponse, VideoStatusResponse>(
            `${SHADOWING_VIDEOS_PATH}/${encodeURIComponent(videoId)}/status`,
        );
    },

    listVideos(page: number = 1, limit: number = 12): Promise<PaginatedVideos> {
        return api.get<PaginatedVideos, PaginatedVideos>(SHADOWING_VIDEOS_PATH, {
            params: {
                page,
                limit,
            },
        });
    },

    scorePronunciation(formData: FormData, timeoutMs: number = 25_000): Promise<PronunciationResult> {
        return api.post<PronunciationResult, PronunciationResult>(
            `${SHADOWING_PATH}/pronunciation/score`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: timeoutMs,
            },
        );
    },

};
