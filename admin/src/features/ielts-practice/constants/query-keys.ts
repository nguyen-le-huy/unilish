/* ──────────────────────────────────────────────────────────────
 * IELTS Practice Admin — Query Keys
 * ────────────────────────────────────────────────────────────── */

import type { AdminTestFilters } from '../types';

export const IELTS_PRACTICE_QUERY_KEYS = {
  all: ['admin', 'ielts-practice'] as const,

  lists: () => [...IELTS_PRACTICE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: AdminTestFilters) =>
    [...IELTS_PRACTICE_QUERY_KEYS.lists(), filters] as const,

  details: () => [...IELTS_PRACTICE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...IELTS_PRACTICE_QUERY_KEYS.details(), id] as const,

  versions: (id: string) =>
    [...IELTS_PRACTICE_QUERY_KEYS.detail(id), 'versions'] as const,

  analytics: (id: string) =>
    [...IELTS_PRACTICE_QUERY_KEYS.detail(id), 'analytics'] as const,
} as const;
