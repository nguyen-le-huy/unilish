import { useCallback, useMemo, useState } from 'react';
import type { SubmissionResult } from '../api/submit-lesson';
import type { ExerciseSectionProps } from '../components/renderers/renderer.types';

/**
 * Player phases as defined in the design spec state machine.
 *
 * LOADING → READY | REVIEW | UNAVAILABLE
 * READY → ANSWERING
 * ANSWERING → ANSWERING | SUBMITTING | STALE
 * SUBMITTING → RESULT | ANSWERING | STALE
 * RESULT → READY | (exit)
 * REVIEW → READY
 * STALE → LOADING
 * UNAVAILABLE → LOADING
 */
export type ExercisePhase =
    | 'LOADING'
    | 'READY'
    | 'ANSWERING'
    | 'SUBMITTING'
    | 'RESULT'
    | 'REVIEW'
    | 'STALE'
    | 'UNAVAILABLE'
    | 'ERROR';

/** Parameters needed to derive the current phase (pure, no side effects). */
export interface DerivePhaseParams {
    isLoading: boolean;
    isError: boolean;
    hasLessonData: boolean;
    exercise: ExerciseSectionProps | null;
    progressStatus: string | undefined;
    hasStarted: boolean;
    isSubmitting: boolean;
    submissionResult: SubmissionResult | null;
    dismissedRestoredResult: boolean;
    isStale: boolean;
}

/**
 * Pure function that derives the player phase from current state.
 * This is intentionally free of React hooks for testability.
 */
export function derivePhase(params: DerivePhaseParams): ExercisePhase {
    const {
        isLoading,
        isError,
        hasLessonData,
        exercise,
        progressStatus,
        hasStarted,
        isSubmitting,
        submissionResult,
        dismissedRestoredResult,
        isStale,
    } = params;

    // ── Terminal / error states ──────────────────────────────────────────
    if (isLoading) return 'LOADING';
    if (isError || !hasLessonData) return 'ERROR';

    // Lesson is already completed and not dismissed → REVIEW
    const isCompletedOriginal =
        progressStatus === 'COMPLETED' && !dismissedRestoredResult;

    if (isCompletedOriginal && !submissionResult) {
        return 'REVIEW';
    }

    // ── Exercise availability ────────────────────────────────────────────
    // If exercise is null/COMPLETION, no practice is needed.
    // If UNIT_TEST without valid questions → UNAVAILABLE
    if (exercise?.state === 'UNAVAILABLE') return 'UNAVAILABLE';
    if (exercise?.state === 'UNSUPPORTED') return 'UNAVAILABLE';

    // No exercise section → nothing to practice (completion lesson, etc.)
    if (!exercise || exercise.state !== 'AVAILABLE') {
        // If no exercise at all and not an objective exercise, treat as READY but no player
        return 'READY';
    }

    // If we have a fresh submission result → RESULT
    if (submissionResult) return 'RESULT';

    // If currently submitting → SUBMITTING
    if (isSubmitting) return 'SUBMITTING';

    // If question set became stale → STALE
    if (isStale) return 'STALE';

    // Not started yet → READY (show start screen)
    if (!hasStarted) return 'READY';

    // Started and exercise available → ANSWERING
    return 'ANSWERING';
}

/** Valid transitions between phases for guarding. */
const VALID_TRANSITIONS: Record<ExercisePhase, ExercisePhase[]> = {
    LOADING: ['READY', 'REVIEW', 'UNAVAILABLE', 'ERROR'],
    READY: ['ANSWERING', 'LOADING', 'ERROR'],
    ANSWERING: ['ANSWERING', 'SUBMITTING', 'STALE', 'READY', 'ERROR'],
    SUBMITTING: ['RESULT', 'ANSWERING', 'STALE', 'ERROR'],
    RESULT: ['READY', 'ERROR'],
    REVIEW: ['READY', 'ERROR'],
    STALE: ['LOADING', 'ERROR'],
    UNAVAILABLE: ['LOADING', 'ERROR'],
    ERROR: ['LOADING'],
};

export function isValidTransition(from: ExercisePhase, to: ExercisePhase): boolean {
    if (from === to) return true; // Same phase is always valid (e.g., ANSWERING → ANSWERING)
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Human-readable label for the current phase.
 */
export function phaseLabel(phase: ExercisePhase): string {
    switch (phase) {
        case 'LOADING':
            return 'Đang tải...';
        case 'READY':
            return 'Sẵn sàng';
        case 'ANSWERING':
            return 'Đang làm bài';
        case 'SUBMITTING':
            return 'Đang chấm bài...';
        case 'RESULT':
            return 'Kết quả';
        case 'REVIEW':
            return 'Xem lại';
        case 'STALE':
            return 'Nội dung đã thay đổi';
        case 'UNAVAILABLE':
            return 'Không khả dụng';
        case 'ERROR':
            return 'Lỗi';
    }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UsePhaseOptions {
    isLoading: boolean;
    isError: boolean;
    hasLessonData: boolean;
    exercise: ExerciseSectionProps | null;
    progressStatus: string | undefined;
    submissionResult: SubmissionResult | null;
    dismissedRestoredResult: boolean;
}

export interface UsePhaseReturn {
    phase: ExercisePhase;
    phaseLabel: string;
    startExercise: () => void;
    markStale: () => void;
    clearStale: () => void;
    hasStarted: boolean;
    setHasStarted: (v: boolean) => void;
}

/**
 * Hook that manages the player phase lifecycle.
 * The phase is derived from lesson/UI state; the hook only owns `hasStarted` and `isStale`.
 */
export function usePhase({
    isLoading,
    isError,
    hasLessonData,
    exercise,
    progressStatus,
    submissionResult,
    dismissedRestoredResult,
}: UsePhaseOptions): UsePhaseReturn {
    const [hasStarted, setHasStarted] = useState(false);
    const [isStale, setIsStale] = useState(false);

    const phase = useMemo<ExercisePhase>(() => {
        return derivePhase({
            isLoading,
            isError,
            hasLessonData,
            exercise,
            progressStatus,
            hasStarted,
            isSubmitting: false,
            submissionResult,
            dismissedRestoredResult,
            isStale,
        });
    }, [
        isLoading,
        isError,
        hasLessonData,
        exercise,
        progressStatus,
        hasStarted,
        submissionResult,
        dismissedRestoredResult,
        isStale,
    ]);

    const startExercise = useCallback(() => {
        setHasStarted(true);
    }, []);

    const markStale = useCallback(() => {
        setIsStale(true);
    }, []);

    const clearStale = useCallback(() => {
        setIsStale(false);
    }, []);

    return {
        phase,
        phaseLabel: phaseLabel(phase),
        startExercise,
        markStale,
        clearStale,
        hasStarted,
        setHasStarted,
    };
}
