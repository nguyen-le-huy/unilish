import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { User } from '@/features/auth/types';
import type { ApiErrorResponse } from '@/types/common';
import { joinRecommendedCourse } from '../api/join-recommended-course';

export const useJoinRecommendedCourseMutation = () => {
    return useMutation<User, AxiosError<ApiErrorResponse>, string>({
        mutationFn: joinRecommendedCourse,
    });
};
