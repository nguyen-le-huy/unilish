import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { EnrollmentsListResponse } from '../types/learning.types';

export const getEnrollments = async (status?: string): Promise<EnrollmentsListResponse> => {
    const params = status ? { status } : {};
    return apiGetUnwrappedEnvelope<EnrollmentsListResponse>(
        '/learning/enrollments',
        { params },
    );
};
