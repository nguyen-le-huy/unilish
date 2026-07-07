/* ──────────────────────────────────────────────────────────────
 * useIeltsPracticeTests — Admin list query hook
 * ────────────────────────────────────────────────────────────── */

import { useQuery } from '@tanstack/react-query';
import { ieltsPracticeApi } from '../api/ielts-practice.api';
import { IELTS_PRACTICE_QUERY_KEYS } from '../constants/query-keys';
import type { AdminTestFilters } from '../types';

export const useIeltsPracticeTests = (filters: AdminTestFilters) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_QUERY_KEYS.list(filters),
    queryFn: () => ieltsPracticeApi.getAll(filters),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
};

export const useIeltsPracticeTestDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_QUERY_KEYS.detail(id ?? ''),
    queryFn: () => ieltsPracticeApi.getById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useIeltsPracticeVersionHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_QUERY_KEYS.versions(id ?? ''),
    queryFn: () => ieltsPracticeApi.getVersionHistory(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useIeltsPracticeAnalytics = (id: string | undefined) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_QUERY_KEYS.analytics(id ?? ''),
    queryFn: () => ieltsPracticeApi.getAnalytics(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
