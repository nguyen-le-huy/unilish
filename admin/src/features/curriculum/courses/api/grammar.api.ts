import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    GrammarContent,
    SaveGrammarContentPayload,
    GenerateGrammarStoryPayload,
    GenerateGrammarStoryResponse,
    GrammarQuestionsResponse,
    GrammarQuestionCard,
    UpdateGrammarQuestionPayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/lessons';

export const grammarApi = {
    // ── Read ────────────────────────────────────────────────────────────────

    getContent: async (lessonId: string): Promise<GrammarContent> => {
        const response = await apiClient.get<ApiResponse<GrammarContent>>(
            `${BASE_PATH}/${lessonId}/grammar/content`,
        );
        return response.data.data;
    },

    // ── Mutations ───────────────────────────────────────────────────────────

    saveContent: async (
        lessonId: string,
        payload: SaveGrammarContentPayload,
    ): Promise<GrammarContent> => {
        const response = await apiClient.put<ApiResponse<GrammarContent>>(
            `${BASE_PATH}/${lessonId}/grammar/content`,
            payload,
        );
        return response.data.data;
    },

    generateStory: async (
        lessonId: string,
        payload: GenerateGrammarStoryPayload,
    ): Promise<GenerateGrammarStoryResponse> => {
        const response = await apiClient.post<ApiResponse<GenerateGrammarStoryResponse>>(
            `${BASE_PATH}/${lessonId}/grammar/generate-story`,
            payload,
        );
        return response.data.data;
    },

    generateQuestions: async (
        lessonId: string,
        count: number = 5,
        types?: string[],
    ): Promise<GrammarQuestionsResponse> => {
        const response = await apiClient.post<ApiResponse<GrammarQuestionsResponse>>(
            `${BASE_PATH}/${lessonId}/grammar/generate-questions`,
            { count, ...(types && types.length > 0 ? { types } : {}) },
        );
        return response.data.data;
    },

    generateAudio: async (lessonId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${lessonId}/grammar/generate-audio`);
    },

    // ── Question Review CRUD ─────────────────────────────────────────────────

    getQuestions: async (lessonId: string): Promise<GrammarQuestionCard[]> => {
        const r = await apiClient.get<ApiResponse<GrammarQuestionCard[]>>(
            `${BASE_PATH}/${lessonId}/grammar/questions`,
        );
        return r.data.data;
    },

    swapQuestion: async (
        lessonId: string,
        questionId: string,
    ): Promise<GrammarQuestionCard> => {
        const r = await apiClient.post<ApiResponse<GrammarQuestionCard>>(
            `${BASE_PATH}/${lessonId}/grammar/questions/${questionId}/swap`,
        );
        return r.data.data;
    },

    updateQuestion: async (
        lessonId: string,
        questionId: string,
        body: UpdateGrammarQuestionPayload,
    ): Promise<GrammarQuestionCard> => {
        const r = await apiClient.put<ApiResponse<GrammarQuestionCard>>(
            `${BASE_PATH}/${lessonId}/grammar/questions/${questionId}`,
            body,
        );
        return r.data.data;
    },

    deleteQuestion: async (lessonId: string, questionId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${lessonId}/grammar/questions/${questionId}`);
    },
};
