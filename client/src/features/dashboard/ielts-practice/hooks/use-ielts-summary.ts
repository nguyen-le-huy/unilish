/* ──────────────────────────────────────────────────────────────
 * useIeltsSummary — Hub summary query hook
 * ────────────────────────────────────────────────────────────── */

import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '../api/ielts-practice.service';
import { IELTS_PRACTICE_KEYS } from '../constants/query-keys';

export const useIeltsSummary = () => {
  return useQuery({
    queryKey: IELTS_PRACTICE_KEYS.summary(),
    queryFn: fetchSummary,
    staleTime: 60 * 1000, // 1 min — summary changes infrequently
  });
};
