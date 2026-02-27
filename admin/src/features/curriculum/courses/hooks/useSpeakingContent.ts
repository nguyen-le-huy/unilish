import { useQuery } from '@tanstack/react-query';
import { speakingApi } from '../api/speaking.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { SpeakingContent } from '../components/SpeakingStudio/types/speaking.types';

export const useSpeakingContent = (lessonId: string) => {
    return useQuery<SpeakingContent>({
        queryKey: LESSON_QUERY_KEYS.speakingContent(lessonId),
        queryFn: () => speakingApi.getContent(lessonId),
        enabled: !!lessonId,
        staleTime: 60 * 1000, // 1 minute
        retry: false,
    });
};
