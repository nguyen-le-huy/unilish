import { useQuery } from '@tanstack/react-query';
import { vocabApi } from '../api/vocab.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { VocabContent } from '../types/course.types';

export const useVocabContent = (lessonId: string) => {
    return useQuery<VocabContent>({
        queryKey: LESSON_QUERY_KEYS.vocabContent(lessonId),
        queryFn: () => vocabApi.getVocabContent(lessonId),
        enabled: !!lessonId,
        staleTime: 60 * 1000, // 1 minute
        retry: false,
    });
};
