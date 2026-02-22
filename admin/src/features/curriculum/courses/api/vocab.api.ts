import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    VocabContent,
    VocabStatusResponse,
    GenerateVocabPayload,
    SaveVocabContentPayload,
    RegenerateAudioPayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/lessons';

export const vocabApi = {
    // ── Read ────────────────────────────────────────────────────────────────

    getVocabContent: async (lessonId: string): Promise<VocabContent> => {
        const response = await apiClient.get<ApiResponse<VocabContent>>(
            `${BASE_PATH}/${lessonId}/vocab/content`,
        );
        return response.data.data;
    },

    getGenerationStatus: async (lessonId: string): Promise<VocabStatusResponse> => {
        const response = await apiClient.get<ApiResponse<VocabStatusResponse>>(
            `${BASE_PATH}/${lessonId}/vocab/status`,
        );
        return response.data.data;
    },

    // ── Mutations ───────────────────────────────────────────────────────────

    saveVocabContent: async (
        lessonId: string,
        payload: SaveVocabContentPayload,
    ): Promise<VocabContent> => {
        const response = await apiClient.put<ApiResponse<VocabContent>>(
            `${BASE_PATH}/${lessonId}/vocab/content`,
            payload,
        );
        return response.data.data;
    },

    generateVocab: async (
        lessonId: string,
        payload: GenerateVocabPayload,
    ): Promise<VocabContent> => {
        const response = await apiClient.post<ApiResponse<VocabContent>>(
            `${BASE_PATH}/${lessonId}/vocab/generate`,
            payload,
        );
        return response.data.data;
    },

    regenerateAudio: async (
        lessonId: string,
        itemId: string,
        payload: RegenerateAudioPayload,
    ): Promise<void> => {
        await apiClient.post(
            `${BASE_PATH}/${lessonId}/vocab/items/${itemId}/regenerate-audio`,
            payload,
        );
    },

    generateAllAudio: async (lessonId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${lessonId}/vocab/generate-audio`);
    },
};
