import { useQuery } from '@tanstack/react-query';
import { courseSeriesApi } from '../api/course-series.api';
import { COURSE_SERIES_QUERY_KEYS } from '../constants/query-keys';
import type { CourseSeriesListQuery } from '../types/course-series.types';

export const useSeriesList = (query: CourseSeriesListQuery = {}) => {
    return useQuery({
        queryKey: COURSE_SERIES_QUERY_KEYS.list(query),
        queryFn: () => courseSeriesApi.getSeriesList(query),
        staleTime: 60 * 1000, // 1 minute — series change more often than goals
    });
};

export const useSeriesDetail = (slug: string | undefined) => {
    return useQuery({
        queryKey: COURSE_SERIES_QUERY_KEYS.detail(slug ?? 'new'),
        queryFn: () => courseSeriesApi.getSeriesBySlug(slug as string),
        enabled: Boolean(slug && slug !== 'new'),
        staleTime: 5 * 60 * 1000,
    });
};
