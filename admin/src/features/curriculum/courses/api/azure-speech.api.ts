import apiClient from '@/lib/axios';
import type { AzureTokenResponse } from '@/lib/azure-speech';

export const fetchAzureSpeechToken = async (): Promise<AzureTokenResponse> => {
    const { data } = await apiClient.get<AzureTokenResponse>('/v1/azure-speech/token');
    return data;
};
