/* ──────────────────────────────────────────────────────────────
 * useIeltsAttemptInit — Start new attempt or resume existing
 * FR-05 / AC-06, AC-07: Idempotent start with retry safety
 * FR-08 / AC-11: Resume across devices
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useIeltsTestDetail } from './use-ielts-test-detail';
import {
  useStartAttempt,
  useAttempt,
} from './use-ielts-attempt';
import type { AttemptStartResponse } from '../types/ielts-practice.types';

type InitState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; attempt: AttemptStartResponse }
  | { status: 'error'; message: string }
  | { status: 'expired' }
  | { status: 'locked' };

interface UseIeltsAttemptInitOptions {
  slug: string | undefined;
  /** Existing attempt to resume, if any */
  existingAttemptId?: string;
  onReady?: (attempt: AttemptStartResponse) => void;
}

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const axiosLike = err as {
    message?: string;
    response?: { data?: { message?: string; error?: string } };
  };

  return axiosLike?.response?.data?.message
    ?? axiosLike?.response?.data?.error
    ?? axiosLike?.message
    ?? fallback;
};

export function useIeltsAttemptInit({
  slug,
  existingAttemptId,
  onReady,
}: UseIeltsAttemptInitOptions) {
  const navigate = useNavigate();
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const idempotencyKey = idempotencyKeyRef.current;

  const [state, setState] = useState<InitState>({ status: 'idle' });

  // ── Load test detail ──────────────────────────────────
  const { data: testDetail, isLoading: detailLoading, isError: detailError } =
    useIeltsTestDetail(slug);

  // ── Resume existing attempt if available ──────────────
  const {
    data: resumedAttempt,
    isLoading: resumeLoading,
    isError: resumeError,
  } = useAttempt(existingAttemptId);

  // ── Start mutation ────────────────────────────────────
  const startMutation = useStartAttempt();
  const startedRef = useRef(false);

  const doStart = useCallback(async () => {
    if (!testDetail || startedRef.current) return;
    startedRef.current = true;
    setState({ status: 'loading' });

    try {
      const attempt = await startMutation.mutateAsync({
        testId: testDetail.id,
        idempotencyKey,
      });

      if (attempt.status === 'expired') {
        setState({ status: 'expired' });
        return;
      }

      setState({ status: 'ready', attempt });
      onReady?.(attempt);
    } catch (err: unknown) {
      setState({
        status: 'error',
        message: getErrorMessage(err, 'Không thể bắt đầu bài luyện'),
      });
      startedRef.current = false;
    }
  }, [testDetail, idempotencyKey, startMutation, onReady]);

  // ── Effect: init attempt on mount ─────────────────────
  useEffect(() => {
    if (detailLoading) {
      setState({ status: 'loading' });
      return;
    }

    if (detailError || !testDetail) {
      setState({ status: 'error', message: 'Không thể tải thông tin đề' });
      return;
    }

    // If we already have a resumed attempt
    if (resumedAttempt) {
      if (resumedAttempt.status === 'expired') {
        setState({ status: 'expired' });
        return;
      }
      if (resumedAttempt.status === 'submitted' || resumedAttempt.status === 'abandoned') {
        navigate(PATHS.DASHBOARD.IELTS_RESULT(resumedAttempt.attemptId), { replace: true });
        return;
      }
      setState({ status: 'ready', attempt: resumedAttempt });
      onReady?.(resumedAttempt);
      return;
    }

    if (resumeLoading) return;

    if (resumeError) {
      // Resume failed — will try to start new
    }

    // No existing attempt — start a new one
    if (!existingAttemptId) {
      doStart();
    }
  }, [
    detailLoading, detailError, testDetail,
    resumedAttempt, resumeLoading, resumeError,
    existingAttemptId, doStart, navigate, onReady,
  ]);

  const reset = useCallback(() => {
    startedRef.current = false;
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    testDetail,
    attempt: state.status === 'ready' ? state.attempt : null,
    isLoading:
      state.status === 'loading' || detailLoading || resumeLoading,
    error: state.status === 'error' ? state.message : null,
    reset,
  };
}
