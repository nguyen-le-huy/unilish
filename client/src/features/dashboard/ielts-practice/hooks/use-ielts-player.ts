/* ──────────────────────────────────────────────────────────────
 * useIeltsPlayer — Orchestrator: init → autosave → submit
 * FR-05-FR-09: Full attempt lifecycle
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useIeltsAttemptInit } from './use-ielts-attempt-init';
import { useIeltsAutosave, getLocalRecovery, clearLocalRecovery } from './use-ielts-autosave';
import { useSubmitAttempt } from './use-ielts-attempt';
import type {
  AttemptStartResponse,
  TestDetailDto,
  IeltsSkill,
} from '../types/ielts-practice.types';
import type { SaveState } from '../components/SaveStatus/SaveStatus';

type PlayerPhase =
  | 'initializing'
  | 'playing'
  | 'submitting'
  | 'submitted'
  | 'expired'
  | 'error';

interface UseIeltsPlayerOptions {
  slug: string | undefined;
}

export interface UseIeltsPlayerResult {
  phase: PlayerPhase;
  attempt: AttemptStartResponse | null;
  testDetail: TestDetailDto | null;
  skill: IeltsSkill | null;
  isLoading: boolean;
  error: string | null;

  // Save state
  saveState: SaveState;
  conflictData: { latestRevision: number; savedAt: string } | null;
  clearConflict: () => void;

  // Submit
  submitAttempt: () => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  submitResult: { status: string; attemptId: string } | null;

  // Local recovery
  localRecovery: { payload: Record<string, unknown>; revision: number } | null;

  // Draft state (used by renderers)
  answers: Record<string, string>;
  flaggedIds: string[];
  essay: string;

  // Answered count (for submit dialog)
  answeredCount: number;
  totalCount: number;
  wordCount: number | undefined;
  minWords: number | undefined;

  // Update handlers (called by renderers)
  updateAnswers: (answers: Record<string, string>) => void;
  updateEssay: (essay: string) => void;
  updateFlagged: (ids: string[]) => void;
}

export function useIeltsPlayer({
  slug,
}: UseIeltsPlayerOptions): UseIeltsPlayerResult {
  const navigate = useNavigate();
  const idempotencyRef = useRef(crypto.randomUUID());

  // ── Attempt init ───────────────────────────────────────
  const {
    state: initState,
    testDetail,
    attempt: initializedAttempt,
    isLoading: initLoading,
    error: initError,
  } = useIeltsAttemptInit({ slug });

  const attempt = initializedAttempt;
  const skill = (attempt?.skill ?? testDetail?.skill ?? null) as IeltsSkill | null;
  const phase: PlayerPhase = useMemo(() => {
    if (initState.status === 'loading' || initState.status === 'idle') return 'initializing';
    if (initState.status === 'error') return 'error';
    if (initState.status === 'expired') return 'expired';
    return 'playing';
  }, [initState.status]);

  // ── Local draft state ─────────────────────────────────
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [essay, setEssayState] = useState('');
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);

  // Sync from attempt snapshot
  const attemptLoaded = useRef(false);
  if (attempt && !attemptLoaded.current) {
    attemptLoaded.current = true;
    setRevision(attempt.revision ?? 0);
    const draft = attempt.draft as Record<string, unknown>;
    if (draft?.answers) setAnswers(draft.answers as Record<string, string>);
    if (draft?.essay) setEssayState(draft.essay as string);
    if (draft?.flaggedItemIds) setFlaggedIds(draft.flaggedItemIds as string[]);
  }

  // ── Autosave ───────────────────────────────────────────
  const buildPayload = useCallback(() => {
    const draftSkill = skill ?? 'listening';

    if (draftSkill === 'writing') {
      return {
        skill: draftSkill,
        essay,
        wordCount: essay.trim() ? essay.trim().split(/\s+/).length : 0,
      };
    }
    if (draftSkill === 'speaking') {
      return {
        skill: draftSkill,
        transcriptSegments: [],
        audioAssetIds: [],
      };
    }
    return {
      skill: draftSkill,
      answers,
      flaggedItemIds: flaggedIds.length > 0 ? flaggedIds : undefined,
    };
  }, [skill, answers, essay, flaggedIds]);

  const recoveryKey = attempt?.attemptId ?? slug ?? '';

  const {
    saveState,
    localRevision,
    flush,
    clearConflict,
    conflictData,
    markDirty,
  } = useIeltsAutosave({
    attemptId: attempt?.attemptId ?? '',
    revision,
    buildPayload,
    recoveryKey,
  });

  // ── Trigger autosave when answers/essay change ─────────
  const prevAnswersRef = useRef(answers);
  const prevEssayRef = useRef(essay);
  useEffect(() => {
    if (answers !== prevAnswersRef.current || essay !== prevEssayRef.current) {
      markDirty();
      prevAnswersRef.current = answers;
      prevEssayRef.current = essay;
    }
  }, [answers, essay, markDirty]);

  const localRecovery = useMemo(
    () => getLocalRecovery(recoveryKey),
    [recoveryKey],
  );

  // ── Submit ─────────────────────────────────────────────
  const submitMutation = useSubmitAttempt();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    status: string;
    attemptId: string;
  } | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!attempt || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Flush pending save first
      const savedRevision = await flush();

      const result = await submitMutation.mutateAsync({
        attemptId: attempt.attemptId,
        revision: savedRevision,
        idempotencyKey: idempotencyRef.current,
      });

      clearLocalRecovery(recoveryKey);
      setSubmitResult({ status: result.status, attemptId: attempt.attemptId });
      setIsSubmitting(false);

      // Navigate to result page
      navigate(PATHS.DASHBOARD.IELTS_RESULT(attempt.attemptId), { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Không thể nộp bài';
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }, [attempt, isSubmitting, flush, localRevision, submitMutation, recoveryKey, navigate]);

  // ── Update handlers ────────────────────────────────────
  const updateAnswers = useCallback((newAnswers: Record<string, string>) => {
    setAnswers(newAnswers);
  }, []);

  const updateEssay = useCallback((text: string) => {
    setEssayState(text);
  }, []);

  const updateFlagged = useCallback((ids: string[]) => {
    setFlaggedIds(ids);
  }, []);

  // ── Answered count ─────────────────────────────────────
  const answeredCount = useMemo(() => {
    if (skill === 'writing') {
      return essay.trim() ? essay.trim().split(/\s+/).length : 0;
    }
    return Object.values(answers).filter((v) => v.trim().length > 0).length;
  }, [skill, answers, essay]);

  const totalCount = useMemo(() => {
    if (!testDetail) return 0;
    switch (testDetail.skill) {
      case 'listening':
        return testDetail.content.items.length;
      case 'reading':
        return testDetail.content.statements.length;
      case 'writing':
        return 1;
      case 'speaking':
        return 1;
    }
  }, [testDetail]);

  const wordCount = skill === 'writing' ? answeredCount : undefined;
  const minWords = (skill === 'writing' && testDetail?.skill === 'writing')
    ? testDetail.content.minWords
    : undefined;

  return {
    phase,
    attempt,
    testDetail: testDetail ?? null,
    skill,
    isLoading: initLoading,
    error: initError,

    saveState,
    conflictData,
    clearConflict,

    submitAttempt: handleSubmit,
    isSubmitting,
    submitError,
    submitResult,

    localRecovery,

    // Draft state
    answers,
    flaggedIds,
    essay,

    // Counts
    answeredCount,
    totalCount,
    wordCount,
    minWords,

    // Handlers
    updateAnswers,
    updateEssay,
    updateFlagged,
  };
}
