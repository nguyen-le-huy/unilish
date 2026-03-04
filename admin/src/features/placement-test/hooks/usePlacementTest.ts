import { useQuery } from '@tanstack/react-query';
import { placementTestApi } from '../api/placement-test.api';
import { PLACEMENT_TEST_QUERY_KEYS } from '../constants/query-keys';

/**
 * Full placement test detail with all modules — used in the 4-step wizard.
 */
export const usePlacementTest = (id: string | undefined) => {
    return useQuery({
        queryKey: PLACEMENT_TEST_QUERY_KEYS.detail(id ?? ''),
        queryFn: () => placementTestApi.getById(id!),
        enabled: !!id,
        staleTime: 60 * 1000,
    });
};
