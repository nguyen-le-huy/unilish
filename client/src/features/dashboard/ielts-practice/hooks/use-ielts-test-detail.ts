/* ──────────────────────────────────────────────────────────────
 * useIeltsTestDetail — Test detail (slug) query hook
 * ────────────────────────────────────────────────────────────── */

import { useQuery } from '@tanstack/react-query';
import { fetchTestDetail } from '../api/ielts-practice.service';
import { IELTS_PRACTICE_KEYS } from '../constants/query-keys';

export const useIeltsTestDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_KEYS.detail(slug ?? ''),
    queryFn: () => fetchTestDetail(slug!),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
};
