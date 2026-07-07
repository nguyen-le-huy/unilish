/* ──────────────────────────────────────────────────────────────
 * IELTS Practice — TanStack Query Keys
 * ────────────────────────────────────────────────────────────── */

import type { TestListQuery } from '../api/ielts-practice.service';

export const IELTS_PRACTICE_KEYS = {
  all: ['ielts-practice'] as const,

  /** Hub summary — active test count per skill */
  summary: () => [...IELTS_PRACTICE_KEYS.all, 'summary'] as const,

  /** Test list for a skill */
  lists: () => [...IELTS_PRACTICE_KEYS.all, 'list'] as const,
  list: (query: TestListQuery) =>
    [...IELTS_PRACTICE_KEYS.lists(), query] as const,

  /** Test detail by slug */
  details: () => [...IELTS_PRACTICE_KEYS.all, 'detail'] as const,
  detail: (slug: string) => [...IELTS_PRACTICE_KEYS.details(), slug] as const,

  /** Attempt by ID */
  attempts: () => [...IELTS_PRACTICE_KEYS.all, 'attempt'] as const,
  attempt: (id: string) => [...IELTS_PRACTICE_KEYS.attempts(), id] as const,

  /** Attempt result */
  result: (id: string) => [...IELTS_PRACTICE_KEYS.attempt(id), 'result'] as const,

  /** Admin keys (used in admin feature, shared for convenience) */
  admin: {
    all: ['admin', 'ielts-practice'] as const,
    lists: () => [...IELTS_PRACTICE_KEYS.admin.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...IELTS_PRACTICE_KEYS.admin.lists(), filters] as const,
    details: () => [...IELTS_PRACTICE_KEYS.admin.all, 'detail'] as const,
    detail: (id: string) => [...IELTS_PRACTICE_KEYS.admin.details(), id] as const,
    versions: (id: string) =>
      [...IELTS_PRACTICE_KEYS.admin.detail(id), 'versions'] as const,
    analytics: (id: string) =>
      [...IELTS_PRACTICE_KEYS.admin.detail(id), 'analytics'] as const,
  },
} as const;
