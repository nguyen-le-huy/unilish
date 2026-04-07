import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { getPlacementResult } from '../api/get-placement-result';
import type { PlacementResultResponse } from '../types/result.types';

const MAX_POLLING_MS = 5 * 60 * 1000;

interface UsePlacementResultQueryResult {
    data: PlacementResultResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    hasTimedOut: boolean;
}

export const usePlacementResultQuery = (sessionId: string | null): UsePlacementResultQueryResult => {
    const pollingStartRef = useRef<number | null>(null);

    const query = useQuery<PlacementResultResponse, Error>({
        queryKey: ['placement-test', 'result', sessionId],
        queryFn: async () => {
            if (!pollingStartRef.current) {
                pollingStartRef.current = Date.now();
            }

            return getPlacementResult(String(sessionId));
        },
        enabled: Boolean(sessionId),
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: (currentQuery) => {
            const result = currentQuery.state.data;
            const startedAt = pollingStartRef.current;

            if (!startedAt) {
                return 5000;
            }

            if (Date.now() - startedAt > MAX_POLLING_MS) {
                return false;
            }

            if (!result) {
                return 5000;
            }

            if (result.status === 'ready' || result.status === undefined) {
                return false;
            }

            return 5000;
        },
    });

    const hasTimedOut = (() => {
        if (!pollingStartRef.current) {
            return false;
        }

        return Date.now() - pollingStartRef.current > MAX_POLLING_MS
            && (query.data?.status === 'pending' || query.data?.status === 'computing' || !query.data);
    })();

    return {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        hasTimedOut,
    };
};