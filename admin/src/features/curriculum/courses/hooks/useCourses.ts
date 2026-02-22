import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api/course.api';
import { COURSE_QUERY_KEYS } from '../constants/query-keys';
import type { CourseListQuery } from '../types/course.types';

export const useCoursesBySeriesId = (query: CourseListQuery) => {
    return useQuery({
        queryKey: COURSE_QUERY_KEYS.list(query),
        queryFn: () => courseApi.getCoursesBySeriesId(query),
        enabled: !!query.seriesId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

export const useCourseDetail = (courseId: string | undefined) => {
    return useQuery({
        queryKey: COURSE_QUERY_KEYS.detail(courseId ?? ''),
        queryFn: () => courseApi.getCourseById(courseId!),
        enabled: !!courseId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useCourseTree = (courseId: string | null) => {
    return useQuery({
        queryKey: COURSE_QUERY_KEYS.tree(courseId ?? ''),
        queryFn: () => courseApi.getCourseTree(courseId!),
        enabled: !!courseId,
        staleTime: 2 * 60 * 1000,
    });
};
