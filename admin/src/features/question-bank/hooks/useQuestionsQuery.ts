import { useQuery } from '@tanstack/react-query';
import { questionApi } from '../api/question.api';
import { QUESTION_QUERY_KEYS } from '../constants/query-keys';
import type { IQuestionFilters } from '../types';

/**
 * Paginated question list with filters.
 * Uses keepPreviousData to avoid flickering during page/filter changes.
 */
export const useQuestionsQuery = (filters: IQuestionFilters) => {
    return useQuery({
        queryKey: QUESTION_QUERY_KEYS.list(filters),
        queryFn: () => questionApi.getAll(filters),
        staleTime: 30 * 1000, // 30s — CMS data updated frequently
        placeholderData: (prev) => prev,
    });
};
