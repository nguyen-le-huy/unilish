import apiClient from '@/lib/axios';
import type { SubscriptionConfig, SubscriptionStats, IAuditLog } from '../types/config.types';

export const configApi = {
    getSubscriptionConfig: async (): Promise<SubscriptionConfig> => {
        const response = await apiClient.get('/settings/subscription/config');
        return response.data.data;
    },

    getSubscriptionStats: async (): Promise<SubscriptionStats> => {
        const response = await apiClient.get('/settings/subscription/stats');
        return response.data.data;
    },

    // Legacy or Direct update
    updateSubscriptionConfig: async (config: SubscriptionConfig): Promise<SubscriptionConfig> => {
        // If using new flow, this might just save draft, but for now keep it
        const response = await apiClient.put('/settings/subscription/config', config);
        return response.data.data;
    },

    saveDraft: async (config: SubscriptionConfig): Promise<SubscriptionConfig> => {
        const response = await apiClient.post('/settings/subscription/config/draft', config);
        return response.data.data;
    },

    getDraft: async (): Promise<SubscriptionConfig | null> => {
        const response = await apiClient.get('/settings/subscription/config/draft');
        return response.data.data;
    },

    publishConfig: async (): Promise<SubscriptionConfig> => {
        const response = await apiClient.post('/settings/subscription/config/publish');
        return response.data.data;
    },

    getHistory: async (): Promise<IAuditLog[]> => {
        const response = await apiClient.get('/settings/subscription/history');
        return response.data.data;
    },

    refreshCache: async (): Promise<void> => {
        await apiClient.post('/settings/subscription/cache/refresh');
    },
};
