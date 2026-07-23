/* ──────────────────────────────────────────────────────────────
 * useIeltsAttempt — Attempt start/resume/save/submit mutations
 * ────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  startAttempt,
  fetchAttempt,
  saveDraft,
  submitAttempt,
  fetchAttemptResult,
  abandonAttempt,
  type SaveDraftPayload,
  type StartAttemptPayload,
  type SubmitPayload,
} from '../api/ielts-practice.service';
import { IELTS_PRACTICE_KEYS } from '../constants/query-keys';

// ─── Query: fetch attempt by ID ────────────────────────────────

export const useAttempt = (attemptId: string | undefined) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_KEYS.attempt(attemptId ?? ''),
    queryFn: () => fetchAttempt(attemptId!),
    enabled: !!attemptId,
    staleTime: 15 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // Auto-refresh while in_progress (for conflict detection, timer sync)
      return data.status === 'in_progress' ? 30 * 1000 : false;
    },
  });
};

// ─── Query: fetch attempt result ───────────────────────────────

export const useAttemptResult = (attemptId: string | undefined) => {
  return useQuery({
    queryKey: IELTS_PRACTICE_KEYS.result(attemptId ?? ''),
    queryFn: () => fetchAttemptResult(attemptId!),
    enabled: !!attemptId,
    staleTime: 30 * 1000,
    retry: (failureCount) => {
      // Retry up to 5 times for pending_grading (202)
      if (failureCount >= 5) return false;
      return true;
    },
  });
};

// ─── Mutation: start attempt ───────────────────────────────────

export const useStartAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      testId,
      idempotencyKey,
    }: {
      testId: string;
      idempotencyKey: string;
    }) => {
      const payload: StartAttemptPayload = {
        clientStartedAt: new Date().toISOString(),
      };
      return startAttempt(testId, payload, idempotencyKey);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        IELTS_PRACTICE_KEYS.attempt(data.attemptId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.lists(),
      });
    },
  });
};

// ─── Mutation: save draft (autosave) ───────────────────────────

export const useSaveDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: SaveDraftPayload;
    }) => saveDraft(attemptId, payload),
    onSuccess: (data, variables) => {
      // Update revision in cache
      queryClient.setQueryData(
        IELTS_PRACTICE_KEYS.attempt(variables.attemptId),
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const attempt = old as { revision?: number };
          return { ...attempt, revision: data.revision };
        },
      );
    },
  });
};

// ─── Mutation: submit attempt ──────────────────────────────────

export const useSubmitAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      revision,
      idempotencyKey,
    }: {
      attemptId: string;
      revision: number;
      idempotencyKey: string;
    }) => {
      const payload: SubmitPayload = { revision };
      return submitAttempt(attemptId, payload, idempotencyKey);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        IELTS_PRACTICE_KEYS.attempt(variables.attemptId),
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...(old as object), status: data.status, submittedAt: data.submittedAt, result: data.result };
        },
      );
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.result(variables.attemptId),
      });
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.lists(),
      });
    },
  });
};

// ─── Mutation: abandon attempt ─────────────────────────────────

export const useAbandonAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      idempotencyKey,
    }: {
      attemptId: string;
      idempotencyKey: string;
    }) => abandonAttempt(attemptId, idempotencyKey),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.attempt(variables.attemptId),
      });
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: IELTS_PRACTICE_KEYS.lists(),
      });
    },
  });
};
