import { useQuery } from '@tanstack/react-query';
import { listeningApi } from '../api/listening.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { ListeningQuestionCard } from '../types/course.types';

/**
 * Fetch fully-hydrated question cards for a listening lesson.
 * Only runs when at least one questionId exists.
 */
export const useListeningQuestions = (lessonId: string, questionIds: string[]) => {
    return useQuery<ListeningQuestionCard[]>({
        queryKey: LESSON_QUERY_KEYS.listeningQuestions(lessonId),
        queryFn: () => listeningApi.getQuestions(lessonId),
        enabled: !!lessonId && questionIds.length > 0,
        staleTime: 30 * 1000,
    });
};
