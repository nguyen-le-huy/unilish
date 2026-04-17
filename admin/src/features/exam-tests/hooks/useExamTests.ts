import { useQuery } from '@tanstack/react-query';
import { examTestService } from '../api/examTestService';
import type { IExamTestFilters } from '../types';

export const EXAM_TEST_QUERY_KEYS = {
    all: ['exam-tests'] as const,
    lists: () => [...EXAM_TEST_QUERY_KEYS.all, 'list'] as const,
    list: (filters: IExamTestFilters) => [...EXAM_TEST_QUERY_KEYS.lists(), filters] as const,
    details: () => [...EXAM_TEST_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...EXAM_TEST_QUERY_KEYS.details(), id] as const,
    versions: (id: string) => [...EXAM_TEST_QUERY_KEYS.detail(id), 'versions'] as const,
    analytics: (id: string) => [...EXAM_TEST_QUERY_KEYS.detail(id), 'analytics'] as const,
} as const;

export const useExamTests = (filters: IExamTestFilters) => {
    return useQuery({
        queryKey: EXAM_TEST_QUERY_KEYS.list(filters),
        queryFn: () => examTestService.getAll(filters),
        placeholderData: (prev) => prev,
        staleTime: 30 * 1000,
    });
};
