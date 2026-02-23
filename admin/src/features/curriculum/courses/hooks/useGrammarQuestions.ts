import { useQuery } from '@tanstack/react-query';
import { grammarApi } from '../api/grammar.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { GrammarQuestionCard } from '../types/course.types';

/**
 * Fetch the fully-hydrated question cards for a grammar lesson.
 * Only runs when the lesson has at least one questionId.
 */
export const useGrammarQuestions = (lessonId: string, questionIds: string[]) => {
    return useQuery<GrammarQuestionCard[]>({
        queryKey: LESSON_QUERY_KEYS.grammarQuestions(lessonId),
        queryFn: () => grammarApi.getQuestions(lessonId),
        enabled: !!lessonId && questionIds.length > 0,
        staleTime: 30 * 1000, // 30 s
    });
};
