import { useQuery } from '@tanstack/react-query';
import { startWritingAttempt } from '../api/start-writing-attempt';
import type { StartWritingAttemptResult } from '../types/writing.types';

export const useWritingSession = (
    sessionId: string | null,
    lrScore: number | null,
    enabled = true,
) => {
    return useQuery<StartWritingAttemptResult, Error>({
        queryKey: ['placement-test', 'writing', 'start', sessionId, lrScore],
        queryFn: () => startWritingAttempt(String(sessionId), { lrScore: Number(lrScore) }),
        enabled: Boolean(sessionId) && typeof lrScore === 'number' && enabled,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
    });
};