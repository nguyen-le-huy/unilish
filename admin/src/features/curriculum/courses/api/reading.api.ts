import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    ReadingContent,
    SaveReadingContentPayload,
    ReadingGenerationPayload,
    ReadingQuestionsResponse,
    ReadingQuestionCard,
    UpdateReadingQuestionPayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/lessons';

export const readingApi = {
    // ── Read ─────────────────────────────────────────────────────────────────

    getContent: async (lessonId: string): Promise<ReadingContent> => {
        const response = await apiClient.get<ApiResponse<ReadingContent>>(
            `${BASE_PATH}/${lessonId}/reading/content`,
        );
        return response.data.data;
    },

    // ── Mutations ─────────────────────────────────────────────────────────────

    saveContent: async (
        lessonId: string,
        payload: SaveReadingContentPayload,
    ): Promise<ReadingContent> => {
        const response = await apiClient.put<ApiResponse<ReadingContent>>(
            `${BASE_PATH}/${lessonId}/reading/content`,
            payload,
        );
        return response.data.data;
    },

    generateContent: async (
        lessonId: string,
        payload: ReadingGenerationPayload,
    ): Promise<{ text: string; translation: string; glossary: ReadingContent['glossary'] }> => {
        const response = await apiClient.post<
            ApiResponse<{ text: string; translation: string; glossary: ReadingContent['glossary'] }>
        >(`${BASE_PATH}/${lessonId}/reading/generate`, payload);
        return response.data.data;
    },

    fillGlossary: async (lessonId: string): Promise<ReadingContent['glossary']> => {
        const response = await apiClient.post<ApiResponse<ReadingContent['glossary']>>(
            `${BASE_PATH}/${lessonId}/reading/fill-glossary`,
        );
        return response.data.data;
    },

    generateAudio: async (lessonId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${lessonId}/reading/generate-audio`);
    },

    generateQuestions: async (
        lessonId: string,
        count: number = 5,
        types?: string[],
    ): Promise<ReadingQuestionsResponse> => {
        const response = await apiClient.post<ApiResponse<ReadingQuestionsResponse>>(
            `${BASE_PATH}/${lessonId}/reading/generate-questions`,
            { count, ...(types && types.length > 0 ? { types } : {}) },
        );
        return response.data.data;
    },

    // ── Question Review CRUD ──────────────────────────────────────────────────

    getQuestions: async (lessonId: string): Promise<ReadingQuestionCard[]> => {
        const response = await apiClient.get<ApiResponse<ReadingQuestionCard[]>>(
            `${BASE_PATH}/${lessonId}/reading/questions`,
        );
        return response.data.data;
    },

    swapQuestion: async (
        lessonId: string,
        questionId: string,
    ): Promise<ReadingQuestionCard> => {
        const response = await apiClient.post<ApiResponse<ReadingQuestionCard>>(
            `${BASE_PATH}/${lessonId}/reading/questions/${questionId}/swap`,
        );
        return response.data.data;
    },

    updateQuestion: async (
        lessonId: string,
        questionId: string,
        body: UpdateReadingQuestionPayload,
    ): Promise<ReadingQuestionCard> => {
        const response = await apiClient.put<ApiResponse<ReadingQuestionCard>>(
            `${BASE_PATH}/${lessonId}/reading/questions/${questionId}`,
            body,
        );
        return response.data.data;
    },

    deleteQuestion: async (lessonId: string, questionId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${lessonId}/reading/questions/${questionId}`);
    },
};
