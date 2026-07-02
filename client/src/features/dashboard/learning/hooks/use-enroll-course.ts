import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { enrollCourse } from '../api/enroll-course';
import type { EnrollmentDto } from '../types/learning.types';

const LEARNING_QUERY_KEY = ['learning'] as const;

export const useEnrollCourse = () => {
    const queryClient = useQueryClient();

    return useMutation<EnrollmentDto, AxiosError<ApiErrorResponse>, string>({
        mutationFn: (courseId: string) => enrollCourse(courseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LEARNING_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
    });
};
