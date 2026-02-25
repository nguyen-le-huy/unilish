import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    ListeningContent,
    SaveListeningContentPayload,
    GenerateListeningScriptPayload,
    MixAndSyncPayload,
    TranscriptLine,
    SyncStatusResponse,
    ListeningQuestionsResponse,
    GenerateListeningQuestionsPayload,
    ListeningQuestionCard,
    UpdateListeningQuestionPayload,
} from '../types/course.types';

const BASE_PATH = '/curriculum/lessons';

export const listeningApi = {
    // ── Read ──────────────────────────────────────────────────────────────────

    getContent: async (lessonId: string): Promise<ListeningContent> => {
        const response = await apiClient.get<ApiResponse<ListeningContent>>(
            `${BASE_PATH}/${lessonId}/listening/content`,
        );
        return response.data.data;
    },

    getSyncStatus: async (lessonId: string): Promise<SyncStatusResponse> => {
        const response = await apiClient.get<ApiResponse<SyncStatusResponse>>(
            `${BASE_PATH}/${lessonId}/listening/sync-status`,
        );
        return response.data.data;
    },

    // ── Mutations ─────────────────────────────────────────────────────────────

    saveContent: async (
        lessonId: string,
        payload: SaveListeningContentPayload,
    ): Promise<ListeningContent> => {
        const response = await apiClient.put<ApiResponse<ListeningContent>>(
            `${BASE_PATH}/${lessonId}/listening/content`,
            payload,
        );
        return response.data.data;
    },

    generateScript: async (
        lessonId: string,
        payload: GenerateListeningScriptPayload,
    ): Promise<TranscriptLine[]> => {
        const response = await apiClient.post<ApiResponse<TranscriptLine[]>>(
            `${BASE_PATH}/${lessonId}/listening/generate-script`,
            payload,
        );
        return response.data.data;
    },

    mixAndSync: async (
        lessonId: string,
        payload: MixAndSyncPayload,
    ): Promise<{ jobId: string }> => {
        const response = await apiClient.post<ApiResponse<{ jobId: string }>>(
            `${BASE_PATH}/${lessonId}/listening/mix-and-sync`,
            payload,
        );
        return response.data.data;
    },

    cancelMixAndSync: async (lessonId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${lessonId}/listening/mix-and-sync`);
    },

    generateQuestions: async (
        lessonId: string,
        payload: GenerateListeningQuestionsPayload,
    ): Promise<ListeningQuestionsResponse> => {
        const response = await apiClient.post<ApiResponse<ListeningQuestionsResponse>>(
            `${BASE_PATH}/${lessonId}/listening/generate-questions`,
            payload,
        );
        return response.data.data;
    },

    getQuestions: async (lessonId: string): Promise<ListeningQuestionCard[]> => {
        const response = await apiClient.get<ApiResponse<ListeningQuestionCard[]>>(
            `${BASE_PATH}/${lessonId}/listening/questions`,
        );
        return response.data.data;
    },

    swapQuestion: async (
        lessonId: string,
        questionId: string,
    ): Promise<ListeningQuestionCard> => {
        const response = await apiClient.post<ApiResponse<ListeningQuestionCard>>(
            `${BASE_PATH}/${lessonId}/listening/questions/${questionId}/swap`,
        );
        return response.data.data;
    },

    updateQuestion: async (
        lessonId: string,
        questionId: string,
        body: UpdateListeningQuestionPayload,
    ): Promise<ListeningQuestionCard> => {
        const response = await apiClient.put<ApiResponse<ListeningQuestionCard>>(
            `${BASE_PATH}/${lessonId}/listening/questions/${questionId}`,
            body,
        );
        return response.data.data;
    },

    deleteQuestion: async (lessonId: string, questionId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${lessonId}/listening/questions/${questionId}`);
    },
};
