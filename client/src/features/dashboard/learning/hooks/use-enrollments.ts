import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { getEnrollments } from '../api/get-enrollments';
import type { EnrollmentDto } from '../types/learning.types';

export const useEnrollments = (status?: string) => {
    return useQuery<EnrollmentDto[], AxiosError<ApiErrorResponse>>({
        queryKey: ['learning', 'enrollments', status ?? 'all'],
        queryFn: () => getEnrollments(status),
        staleTime: 30 * 1000,
        retry: 1,
    });
};
