import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '../api/config.api';
import { toast } from 'sonner';

// Query keys for cache management
export const SUBSCRIPTION_QUERY_KEYS = {
    config: ['subscription', 'config'] as const,
    draft: ['subscription', 'draft'] as const,
    stats: ['subscription', 'stats'] as const,
    history: ['subscription', 'history'] as const,
};

/**
 * Hook to fetch live subscription config
 */
export const useSubscriptionConfig = () => {
    return useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEYS.config,
        queryFn: configApi.getSubscriptionConfig,
        staleTime: 5 * 60 * 1000, // 5 minutes (config doesn't change often)
    });
};

/**
 * Hook to fetch draft config
 */
export const useDraftConfig = () => {
    return useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEYS.draft,
        queryFn: configApi.getDraft,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

/**
 * Hook to fetch subscription stats
 */
export const useSubscriptionStats = () => {
    return useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEYS.stats,
        queryFn: configApi.getSubscriptionStats,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

/**
 * Hook to fetch config history
 */
export const useConfigHistory = () => {
    return useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEYS.history,
        queryFn: configApi.getHistory,
        staleTime: 30 * 1000, // 30 seconds (history updates frequently)
    });
};

/**
 * Hook to update draft config
 */
export const useSaveDraft = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: configApi.saveDraft,
        onSuccess: (data) => {
            // Update draft cache directly
            queryClient.setQueryData(SUBSCRIPTION_QUERY_KEYS.draft, data);
            toast.success('Đã lưu bản nháp (Draft)!');
        },
        onError: () => {
            toast.error('Lưu nháp thất bại');
        },
    });
};

/**
 * Hook to publish config
 */
export const usePublishConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: configApi.publishConfig,
        onSuccess: (data) => {
            // Invalidate and update both live and draft
            queryClient.setQueryData(SUBSCRIPTION_QUERY_KEYS.config, data);
            queryClient.setQueryData(SUBSCRIPTION_QUERY_KEYS.draft, data);
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEYS.history });
            toast.success('Đã xuất bản (Publish) thành công!');
        },
        onError: () => {
            toast.error('Xuất bản thất bại');
        },
    });
};

/**
 * Hook to refresh cache
 */
export const useRefreshCache = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: configApi.refreshCache,
        onSuccess: () => {
            // Invalidate all queries to force refetch
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEYS.config });
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEYS.stats });
            toast.success('Đã làm mới Cache hệ thống!');
        },
        onError: () => {
            toast.error('Làm mới Cache thất bại');
        },
    });
};
