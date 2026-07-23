import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { EnrollmentDto } from '../types/learning.types';

export const getEnrollments = async (status?: string): Promise<EnrollmentDto[]> => {
    const params = status ? { status } : {};
    return apiGetUnwrappedEnvelope<EnrollmentDto[]>(
        '/learning/enrollments',
        { params },
    );
};
