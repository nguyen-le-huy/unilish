import { useQuery } from '@tanstack/react-query';
import { placementTestApi } from '../api/placement-test.api';
import { PLACEMENT_TEST_QUERY_KEYS } from '../constants/query-keys';

interface UsePoolValidationOptions {
    testId: string | undefined;
    /** Only fetch when on Step 3 (index 2) */
    enabled?: boolean;
}

/**
 * Pool validation — counts published questions per poolTag.
 * Only fires when enabled=true (i.e., user is on Step 3 of the wizard).
 */
export const usePoolValidation = ({ testId, enabled = true }: UsePoolValidationOptions) => {
    return useQuery({
        queryKey: PLACEMENT_TEST_QUERY_KEYS.poolValidation(testId ?? ''),
        queryFn: () => placementTestApi.validatePool(testId!),
        enabled: !!testId && enabled,
        staleTime: 20 * 1000, // re-validate frequently while editing
    });
};

/**
 * Version history for a test.
 */
export const useVersionHistory = (testId: string | undefined) => {
    return useQuery({
        queryKey: PLACEMENT_TEST_QUERY_KEYS.versions(testId ?? ''),
        queryFn: () => placementTestApi.getVersionHistory(testId!),
        enabled: !!testId,
        staleTime: 60 * 1000,
    });
};

/**
 * Analytics summary for a test.
 */
export const useAnalytics = (testId: string | undefined, range = '7d') => {
    return useQuery({
        queryKey: PLACEMENT_TEST_QUERY_KEYS.analytics(testId ?? '', range),
        queryFn: () => placementTestApi.getAnalytics(testId!, range),
        enabled: !!testId,
        staleTime: 5 * 60 * 1000,
    });
};
