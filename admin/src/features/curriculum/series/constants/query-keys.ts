import type { CourseSeriesListQuery } from '../types/course-series.types';

export const COURSE_SERIES_QUERY_KEYS = {
    all: ['course-series'] as const,
    lists: () => [...COURSE_SERIES_QUERY_KEYS.all, 'list'] as const,
    list: (query: CourseSeriesListQuery) => [...COURSE_SERIES_QUERY_KEYS.lists(), query] as const,
    details: () => [...COURSE_SERIES_QUERY_KEYS.all, 'detail'] as const,
    detail: (slug: string) => [...COURSE_SERIES_QUERY_KEYS.details(), slug] as const,
};
