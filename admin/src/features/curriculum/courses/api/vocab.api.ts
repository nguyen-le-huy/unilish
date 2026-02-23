import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    VocabContent,
    VocabStatusResponse,
    GenerateVocabPayload,
    SaveVocabContentPayload,
    RegenerateAudioPayload,
    IQuestion,
    UpdateQuestionPayload,
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

    uploadVocabImage: async (
        lessonId: string,
        itemId: string,
        file: File,
    ): Promise<{ imageUrl: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await apiClient.post<ApiResponse<{ imageUrl: string }>>(
            `${BASE_PATH}/${lessonId}/vocab/items/${itemId}/image`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data.data;
    },

    // ── Practice Questions ─────────────────────────────────────────────────────

    getVocabQuestions: async (lessonId: string): Promise<IQuestion[]> => {
        const response = await apiClient.get<ApiResponse<IQuestion[]>>(
            `${BASE_PATH}/${lessonId}/vocab/questions`,
        );
        return response.data.data;
    },

    generateVocabQuestions: async (
        lessonId: string,
        distribution: { mc: number; fill: number; match: number },
    ): Promise<IQuestion[]> => {
        const response = await apiClient.post<ApiResponse<IQuestion[]>>(
            `${BASE_PATH}/${lessonId}/vocab/generate-questions`,
            { distribution },
        );
        return response.data.data;
    },

    swapVocabQuestion: async (
        lessonId: string,
        questionId: string,
    ): Promise<IQuestion> => {
        const response = await apiClient.post<ApiResponse<IQuestion>>(
            `${BASE_PATH}/${lessonId}/vocab/questions/${questionId}/swap`,
        );
        return response.data.data;
    },

    updateVocabQuestion: async (
        lessonId: string,
        questionId: string,
        payload: UpdateQuestionPayload,
    ): Promise<IQuestion> => {
        const response = await apiClient.put<ApiResponse<IQuestion>>(
            `${BASE_PATH}/${lessonId}/vocab/questions/${questionId}`,
            payload,
        );
        return response.data.data;
    },
};
