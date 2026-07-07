/* ──────────────────────────────────────────────────────────────
 * useIeltsTests — Paginated test list query hook
 * ────────────────────────────────────────────────────────────── */

import { useQuery } from '@tanstack/react-query';
import { fetchTests, type TestListQuery } from '../api/ielts-practice.service';
import { IELTS_PRACTICE_KEYS } from '../constants/query-keys';

export const useIeltsTests = (query: TestListQuery) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_KEYS.list(query),
    queryFn: () => fetchTests(query),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
    enabled: !!query.skill,
  });
};
