import { useQuery } from '@tanstack/react-query';
import {
    getDashboardSummary,
    getStatsData,
    getChartData,
    getRecentUsers,
    getRecentContent,
    getSystemAlerts,
} from '../api/dashboard.api';

// Query keys for cache management
export const DASHBOARD_QUERY_KEYS = {
    summary: ['dashboard', 'summary'] as const,
    stats: ['dashboard', 'stats'] as const,
    chart: ['dashboard', 'chart'] as const,
    users: ['dashboard', 'users'] as const,
    content: ['dashboard', 'content'] as const,
    alerts: ['dashboard', 'alerts'] as const,
};

/**
 * Hook to fetch complete dashboard summary
 */
export const useDashboardSummary = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.summary,
        queryFn: getDashboardSummary,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch stats data only
 */
export const useStatsData = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.stats,
        queryFn: getStatsData,
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook to fetch chart data only
 */
export const useChartData = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.chart,
        queryFn: getChartData,
        staleTime: 10 * 60 * 1000, // 10 minutes (chart data changes less frequently)
    });
};

/**
 * Hook to fetch recent users
 */
export const useRecentUsers = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.users,
        queryFn: getRecentUsers,
        staleTime: 2 * 60 * 1000, // 2 minutes (user data updates frequently)
    });
};

/**
 * Hook to fetch recent content
 */
export const useRecentContent = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.content,
        queryFn: getRecentContent,
        staleTime: 3 * 60 * 1000,
    });
};

/**
 * Hook to fetch system alerts
 */
export const useSystemAlerts = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.alerts,
        queryFn: getSystemAlerts,
        staleTime: 1 * 60 * 1000, // 1 minute (alerts should update quickly)
    });
};
