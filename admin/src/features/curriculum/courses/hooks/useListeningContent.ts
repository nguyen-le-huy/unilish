import { useQuery } from '@tanstack/react-query';
import { listeningApi } from '../api/listening.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { ListeningContent } from '../types/course.types';

export const useListeningContent = (lessonId: string) => {
    return useQuery<ListeningContent>({
        queryKey: LESSON_QUERY_KEYS.listeningContent(lessonId),
        queryFn: () => listeningApi.getContent(lessonId),
        enabled: !!lessonId,
        staleTime: 60 * 1000, // 1 minute
        retry: false,
    });
};
