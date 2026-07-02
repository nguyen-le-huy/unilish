import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { LearningDashboardDto } from '../types/learning.types';

export const getDashboard = async (period?: string, month?: string): Promise<LearningDashboardDto> => {
    const params: Record<string, string> = {};
    if (period) params.period = period;
    if (month) params.month = month;

    return apiGetUnwrappedEnvelope<LearningDashboardDto>(
        '/learning/dashboard',
        { params },
    );
};
