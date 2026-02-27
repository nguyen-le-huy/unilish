import { useQuery } from '@tanstack/react-query';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import { writingApi } from '../api/writing.api';
import type { WritingContent } from '../types/course.types';

export const useWritingContent = (lessonId: string) => {
    return useQuery<WritingContent>({
        queryKey: LESSON_QUERY_KEYS.writingContent(lessonId),
        queryFn: () => writingApi.getContent(lessonId),
        enabled: !!lessonId,
        staleTime: 60 * 1000,
        retry: false,
    });
};
