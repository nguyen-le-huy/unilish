import type { IPlacementTestFilters } from '../types';

// ─── Query Keys Factory ───────────────────────────────────────────────────────

export const PLACEMENT_TEST_QUERY_KEYS = {
    all: ['placement-tests'] as const,

    /** Matches all list queries regardless of filters */
    lists: () => [...PLACEMENT_TEST_QUERY_KEYS.all, 'list'] as const,

    /** Matches a specific filtered list */
    list: (filters: IPlacementTestFilters) =>
        [...PLACEMENT_TEST_QUERY_KEYS.lists(), filters] as const,

    /** Matches all detail queries */
    details: () => [...PLACEMENT_TEST_QUERY_KEYS.all, 'detail'] as const,

    /** Matches a specific test detail */
    detail: (id: string) => [...PLACEMENT_TEST_QUERY_KEYS.details(), id] as const,

    /** Version history for a given test */
    versions: (id: string) =>
        [...PLACEMENT_TEST_QUERY_KEYS.detail(id), 'versions'] as const,

    /** Pool validation for a given test */
    poolValidation: (id: string) =>
        [...PLACEMENT_TEST_QUERY_KEYS.detail(id), 'pool-validation'] as const,

    /** Analytics for a given test */
    analytics: (id: string, range: string) =>
        [...PLACEMENT_TEST_QUERY_KEYS.detail(id), 'analytics', range] as const,
} as const;
