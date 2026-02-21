import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    CreateLanguagePayload,
    Language,
    LanguageListQuery,
    TestVoicePayload,
    TestVoiceResult,
    UpdateLanguagePayload,
} from '../types/language.types';

const BASE_PATH = '/curriculum/languages';

export const languageApi = {
    getLanguages: async (query: LanguageListQuery = {}): Promise<Language[]> => {
        const response = await apiClient.get<ApiResponse<Language[]>>(BASE_PATH, { params: query });
        return response.data.data;
    },

    getLanguageByCode: async (code: string): Promise<Language> => {
        const response = await apiClient.get<ApiResponse<Language>>(`${BASE_PATH}/${code}`);
        return response.data.data;
    },

    createLanguage: async (payload: CreateLanguagePayload): Promise<Language> => {
        const response = await apiClient.post<ApiResponse<Language>>(BASE_PATH, payload);
        return response.data.data;
    },

    updateLanguage: async (code: string, payload: UpdateLanguagePayload): Promise<Language> => {
        const response = await apiClient.put<ApiResponse<Language>>(`${BASE_PATH}/${code}`, payload);
        return response.data.data;
    },

    toggleStatus: async (code: string): Promise<Language> => {
        const response = await apiClient.patch<ApiResponse<Language>>(`${BASE_PATH}/${code}/toggle`);
        return response.data.data;
    },

    testVoice: async (code: string, payload: TestVoicePayload): Promise<TestVoiceResult> => {
        const response = await apiClient.post<ApiResponse<TestVoiceResult>>(`${BASE_PATH}/${code}/test-voice`, payload);
        return response.data.data;
    },

    uploadFlagIcon: async (file: File): Promise<{ url: string; type: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'curriculum/languages/flags');

        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload/image', formData);
        return response.data.data;
    },
};
