import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { AiVoiceTopic, AiVoiceTopicPayload } from './types';

const BASE_PATH = '/v1/ai-voice/admin/topics';

export const aiVoiceContentApi = {
    getTopics: async (): Promise<AiVoiceTopic[]> => {
        const response = await apiClient.get<ApiResponse<AiVoiceTopic[]>>(BASE_PATH);
        return response.data.data;
    },
    createTopic: async (payload: AiVoiceTopicPayload): Promise<AiVoiceTopic> => {
        const response = await apiClient.post<ApiResponse<AiVoiceTopic>>(BASE_PATH, payload);
        return response.data.data;
    },
    updateTopic: async (id: string, payload: AiVoiceTopicPayload): Promise<AiVoiceTopic> => {
        const response = await apiClient.put<ApiResponse<AiVoiceTopic>>(`${BASE_PATH}/${id}`, payload);
        return response.data.data;
    },
    deleteTopic: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${id}`);
    },
};
