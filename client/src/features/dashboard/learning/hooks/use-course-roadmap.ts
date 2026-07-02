import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { getCourseRoadmap } from '../api/get-course-roadmap';
import type { CourseRoadmapDto } from '../types/learning.types';

export const useCourseRoadmap = (slug: string | undefined) => {
    return useQuery<CourseRoadmapDto, AxiosError<ApiErrorResponse>>({
        queryKey: ['learning', 'roadmap', slug],
        queryFn: () => getCourseRoadmap(slug!),
        enabled: !!slug,
        staleTime: 2 * 60 * 1000,
        retry: 1,
    });
};
