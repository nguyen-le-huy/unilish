import { useQuery } from '@tanstack/react-query';
import { placementTestApi } from '../api/placement-test.api';
import { PLACEMENT_TEST_QUERY_KEYS } from '../constants/query-keys';
import type { IPlacementTestFilters } from '../types';

/**
 * Paginated list of placement tests with filters.
 * Uses placeholderData to avoid flickering during page/filter transitions.
 */
export const usePlacementTests = (filters: IPlacementTestFilters) => {
    return useQuery({
        queryKey: PLACEMENT_TEST_QUERY_KEYS.list(filters),
        queryFn: () => placementTestApi.getAll(filters),
        staleTime: 30 * 1000,
        placeholderData: (prev) => prev,
    });
};
