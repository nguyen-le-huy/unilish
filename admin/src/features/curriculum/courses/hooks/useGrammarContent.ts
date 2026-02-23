import { useQuery } from '@tanstack/react-query';
import { grammarApi } from '../api/grammar.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { GrammarContent } from '../types/course.types';

export const useGrammarContent = (lessonId: string) => {
    return useQuery<GrammarContent>({
        queryKey: LESSON_QUERY_KEYS.grammarContent(lessonId),
        queryFn: () => grammarApi.getContent(lessonId),
        enabled: !!lessonId,
        staleTime: 60 * 1000, // 1 minute
        retry: false,
    });
};
