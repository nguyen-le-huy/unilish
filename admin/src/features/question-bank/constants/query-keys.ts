import type { IQuestionFilters } from '../types';

export const QUESTION_QUERY_KEYS = {
    all: ['questions'] as const,
    lists: () => [...QUESTION_QUERY_KEYS.all, 'list'] as const,
    list: (filters: IQuestionFilters) => [...QUESTION_QUERY_KEYS.lists(), filters] as const,
    details: () => [...QUESTION_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...QUESTION_QUERY_KEYS.details(), id] as const,
};
