import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { getDashboard } from '../api/get-dashboard';
import type { LearningDashboardDto } from '../types/learning.types';

export const useDashboard = (month?: string) => {
    return useQuery<LearningDashboardDto, AxiosError<ApiErrorResponse>>({
        queryKey: ['learning', 'dashboard', month ?? 'current'],
        queryFn: () => getDashboard('month', month),
        staleTime: 60 * 1000,
        retry: 1,
    });
};
