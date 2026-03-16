import { useQuery } from '@tanstack/react-query';
import { PT_QUERY_KEYS } from '../constants/placement-test.constants';
import { getPlacementAttempt } from '../api/get-placement-attempt';
import type { RuntimeAttempt } from '../types/runtime.types';

export const usePlacementAttemptQuery = (attemptId?: string) => {
    return useQuery<RuntimeAttempt>({
        queryKey: PT_QUERY_KEYS.attempt(attemptId),
        queryFn: () => getPlacementAttempt(String(attemptId)),
        enabled: Boolean(attemptId),
        staleTime: 0,
    });
};
