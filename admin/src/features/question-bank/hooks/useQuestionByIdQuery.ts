import { useQuery } from '@tanstack/react-query';
import { questionApi } from '../api/question.api';
import { QUESTION_QUERY_KEYS } from '../constants/query-keys';

/**
 * Fetches full question details (including content) for the editor.
 */
export const useQuestionByIdQuery = (id: string | undefined) => {
    return useQuery({
        queryKey: QUESTION_QUERY_KEYS.detail(id ?? ''),
        queryFn: () => questionApi.getById(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes — single question rarely changes
    });
};
