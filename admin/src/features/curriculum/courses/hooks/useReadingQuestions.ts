import { useQuery } from '@tanstack/react-query';
import { readingApi } from '../api/reading.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { ReadingQuestionCard } from '../types/course.types';

/**
 * Fetch fully-hydrated question cards for a reading lesson.
 * Only runs when at least one questionId exists.
 */
export const useReadingQuestions = (lessonId: string, questionIds: string[]) => {
    return useQuery<ReadingQuestionCard[]>({
        queryKey: LESSON_QUERY_KEYS.readingQuestions(lessonId),
        queryFn: () => readingApi.getQuestions(lessonId),
        enabled: !!lessonId && questionIds.length > 0,
        staleTime: 30 * 1000, // 30 seconds
    });
};
