import { useQuery } from '@tanstack/react-query';
import { readingApi } from '../api/reading.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { ReadingContent } from '../types/course.types';

export const useReadingContent = (lessonId: string) => {
    return useQuery<ReadingContent>({
        queryKey: LESSON_QUERY_KEYS.readingContent(lessonId),
        queryFn: () => readingApi.getContent(lessonId),
        enabled: !!lessonId,
        staleTime: 60 * 1000, // 1 minute
        retry: false,
    });
};
