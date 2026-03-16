import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { PT_QUERY_KEYS } from '../constants/placement-test.constants';
import { getActivePlacementTest } from '../api/get-active-placement-test';
import type { ActivePlacementTest } from '../types/runtime.types';

export const useActivePlacementTestQuery = (language: string, enabled = true) => {
    return useQuery<ActivePlacementTest, AxiosError<ApiErrorResponse>>({
        queryKey: PT_QUERY_KEYS.active(language),
        queryFn: () => getActivePlacementTest(language),
        enabled: Boolean(language) && enabled,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
    });
};
