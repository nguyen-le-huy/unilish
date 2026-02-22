import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { vocabApi } from '../api/vocab.api';
import { LESSON_QUERY_KEYS } from '../constants/query-keys';
import type { VocabGenerationStatus, VocabStatusResponse } from '../types/course.types';

const TERMINAL_STATUSES: VocabGenerationStatus[] = ['DONE', 'ERROR', 'IDLE'];
const POLL_INTERVAL_MS = 2_000;

/**
 * Polls the generation status while the job is in-progress.
 * Automatically stops polling when a terminal status is reached.
 * On DONE, invalidates vocabContent so the editor refreshes.
 */
export const useGenerationStatus = (lessonId: string) => {
    const queryClient = useQueryClient();

    const query = useQuery<VocabStatusResponse>({
        queryKey: LESSON_QUERY_KEYS.vocabStatus(lessonId),
        queryFn: () => vocabApi.getGenerationStatus(lessonId),
        enabled: !!lessonId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (!status || TERMINAL_STATUSES.includes(status)) return false;
            return POLL_INTERVAL_MS;
        },
        staleTime: 0,
    });

    useEffect(() => {
        if (query.data?.status === 'DONE') {
            queryClient.invalidateQueries({
                queryKey: LESSON_QUERY_KEYS.vocabContent(lessonId),
            });
        }
    }, [query.data?.status, lessonId, queryClient]);

    return query;
};
