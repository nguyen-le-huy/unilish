import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    LearnerPracticeQuestionDto,
    ObjectiveAnswer,
    ExerciseCheckpointKind,
} from '../types/learning.types';
import type { PracticeAnswer } from '../components/renderers/practice/practice.types';

export interface UseExerciseStateOptions {
    /** The learner-safe questions from the exercise DTO. */
    questions: LearnerPracticeQuestionDto[];
    /** Restored checkpoint from the server (may be null or for a different Lesson). */
    savedCheckpoint: ExerciseCheckpointKind | null;
}

export interface CurrentQuestionInfo {
    question: LearnerPracticeQuestionDto;
    answer: PracticeAnswer | undefined;
}

export interface UseExerciseStateReturn {
    /** Current answers keyed by question ID. */
    answers: ReadonlyMap<string, PracticeAnswer>;
    /** Number of questions with any answer. */
    answeredCount: number;
    /** Total number of questions. */
    totalQuestions: number;
    /** Index of the question the learner is currently on (0-based). */
    currentQuestionIndex: number;
    /** The current question and its answer. */
    currentQuestion: CurrentQuestionInfo;
    /** Monotonic counter that increments on every answer change (for dirty tracking). */
    answerRevision: number;
    /** Number of restored answers that were incompatible (stale ID/version/type). */
    staleCount: number;
    /** Update the index of the current question. */
    setCurrentQuestionIndex: (index: number) => void;
    /** Set an answer for a question. For MATCHING, replaces pairs entirely. */
    setAnswer: (questionId: string, answer: PracticeAnswer) => void;
    /** Remove a MATCHING pair for a question. */
    removeMatchingPair: (questionId: string, itemId: string) => void;
    /** Clear all answers and move back to the first question. */
    resetAnswers: () => void;
    /** Build the ObjectiveAnswer[] for submission, keeping question order. */
    getSubmissionAnswers: () => ObjectiveAnswer[];
    /** Validate that every question has been answered. */
    validateComplete: () => {
        valid: boolean;
        firstMissingId: string | null;
        missingCount: number;
    };
    /** Check if a specific question's answer is complete. */
    isQuestionComplete: (questionId: string) => boolean;
}

/**
 * Manages typed exercise answer state for a set of objective questions.
 *
 * - Restores answers AND currentQuestionIndex from a checkpoint.
 * - Tracks answerRevision for dirty detection (increments on every setAnswer).
 * - Reports staleCount for incompatible checkpoint answers.
 * - Supports removing MATCHING pairs (not just merging).
 * - Checks MATCHING completeness: all items paired, no duplicate targets.
 */
export function useExerciseState({
    questions,
    savedCheckpoint,
}: UseExerciseStateOptions): UseExerciseStateReturn {
    // ── Restore from checkpoint ───────────────────────────────────────
    const initial = useMemo(() => {
        const answers = restoreFromCheckpoint(questions, savedCheckpoint);
        const index = restoreCurrentIndex(questions, savedCheckpoint);
        const stale = countStale(questions, savedCheckpoint);
        return { answers, index, stale };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // Intentionally only run once on mount. Checkpoint changes are handled below.

    const [answers, setAnswers] = useState<Map<string, PracticeAnswer>>(initial.answers);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initial.index);
    const [answerRevision, setAnswerRevision] = useState(0);
    const [staleCount, setStaleCount] = useState(initial.stale);

    // Re-restore if checkpoint identity changes (e.g., after restart)
    const prevKeyRef = useRef<string | null>(null);
    const currentKey = savedCheckpoint
        ? `${savedCheckpoint.kind}:${(savedCheckpoint as ExerciseCheckpointKind & { answers?: ObjectiveAnswer[] }).answers?.length ?? 0}:${(savedCheckpoint as ExerciseCheckpointKind & { currentQuestionIndex?: number }).currentQuestionIndex ?? 0}`
        : null;

    useEffect(() => {
        if (currentKey !== prevKeyRef.current) {
            prevKeyRef.current = currentKey;
            const restored = restoreFromCheckpoint(questions, savedCheckpoint);
            const index = restoreCurrentIndex(questions, savedCheckpoint);
            const stale = countStale(questions, savedCheckpoint);
            setAnswers(restored);
            setCurrentQuestionIndex(index);
            setStaleCount(stale);
            setAnswerRevision((r) => r + 1);
        }
    }, [currentKey, questions, savedCheckpoint]);

    // Clamp index when questions change
    useEffect(() => {
        if (currentQuestionIndex >= questions.length && questions.length > 0) {
            setCurrentQuestionIndex(questions.length - 1);
        }
    }, [questions.length, currentQuestionIndex]);

    // ── Question lookup ──────────────────────────────────────────────
    const questionMap = useMemo(() => {
        const map = new Map<string, LearnerPracticeQuestionDto>();
        for (const q of questions) {
            map.set(q.id, q);
        }
        return map;
    }, [questions]);

    // ── Derived values ───────────────────────────────────────────────
    const answeredCount = useMemo(() => {
        let count = 0;
        for (const q of questions) {
            const answer = answers.get(q.id);
            if (answer && !isEmptyAnswer(answer)) {
                count++;
            }
        }
        return count;
    }, [answers, questions]);

    const totalQuestions = questions.length;

    const currentQuestion: CurrentQuestionInfo = useMemo(() => {
        const q = questions[currentQuestionIndex];
        if (!q) {
            return { question: undefined as unknown as LearnerPracticeQuestionDto, answer: undefined };
        }
        return {
            question: q,
            answer: answers.get(q.id),
        };
    }, [questions, currentQuestionIndex, answers]);

    // ── isQuestionComplete ──────────────────────────────────────────
    const isQuestionComplete = useCallback(
        (questionId: string): boolean => {
            const q = questionMap.get(questionId);
            if (!q) return false;
            const answer = answers.get(questionId);
            if (!answer || isEmptyAnswer(answer)) return false;

            // For MATCHING, also check that all items are paired and no duplicate targets
            if (q.type === 'MATCHING' && 'pairs' in answer) {
                const pairs = answer.pairs as Record<string, string>;
                const itemIds = new Set(q.items.map((i) => i.id));
                const pairedItems = Object.keys(pairs);
                const targetValues = Object.values(pairs);
                const uniqueTargets = new Set(targetValues);
                // All items must be paired, and each target used at most once
                return (
                    pairedItems.length === itemIds.size &&
                    targetValues.length === uniqueTargets.size
                );
            }

            return true;
        },
        [questionMap, answers],
    );

    // ── Set answer ───────────────────────────────────────────────────
    const setAnswer = useCallback(
        (questionId: string, answer: PracticeAnswer) => {
            setAnswers((prev) => {
                const next = new Map(prev);

                // For MATCHING, completely replace the pairs (not merge)
                if ('pairs' in answer && typeof answer.pairs === 'object') {
                    next.set(questionId, answer);
                } else {
                    next.set(questionId, answer);
                }

                return next;
            });
            setAnswerRevision((r) => r + 1);
        },
        [],
    );

    // ── Remove MATCHING pair ──────────────────────────────────────
    const removeMatchingPair = useCallback(
        (questionId: string, itemId: string) => {
            setAnswers((prev) => {
                const existing = prev.get(questionId);
                if (!existing || !('pairs' in existing)) return prev;

                const pairs = { ...(existing as { pairs: Record<string, string> }).pairs };
                delete pairs[itemId];

                const next = new Map(prev);
                if (Object.keys(pairs).length === 0) {
                    next.delete(questionId);
                } else {
                    next.set(questionId, { pairs } as PracticeAnswer);
                }
                return next;
            });
            setAnswerRevision((r) => r + 1);
        },
        [],
    );

    // ── Reset ─────────────────────────────────────────────────────────
    const resetAnswers = useCallback(() => {
        setAnswers(new Map());
        setCurrentQuestionIndex(0);
        setAnswerRevision((r) => r + 1);
    }, []);

    // ── Build submission answers (in question order) ──────────────────
    const getSubmissionAnswers = useCallback((): ObjectiveAnswer[] => {
        const result: ObjectiveAnswer[] = [];

        for (const q of questions) {
            const answer = answers.get(q.id);
            if (!answer || isEmptyAnswer(answer)) continue;

            const base = {
                questionId: q.id,
                questionVersion: q.version,
            };

            switch (q.type) {
                case 'MULTIPLE_CHOICE': {
                    const a = answer as { selectedOptionId: string };
                    result.push({
                        ...base,
                        type: 'MULTIPLE_CHOICE' as const,
                        answer: { selectedOptionId: a.selectedOptionId },
                    });
                    break;
                }
                case 'FILL_IN_BLANK': {
                    const a = answer as { text: string };
                    result.push({
                        ...base,
                        type: 'FILL_IN_BLANK' as const,
                        answer: { text: a.text },
                    });
                    break;
                }
                case 'TRUE_FALSE': {
                    const a = answer as { value: boolean };
                    result.push({
                        ...base,
                        type: 'TRUE_FALSE' as const,
                        answer: { value: a.value },
                    });
                    break;
                }
                case 'MATCHING': {
                    const a = answer as { pairs: Record<string, string> };
                    result.push({
                        ...base,
                        type: 'MATCHING' as const,
                        answer: { pairs: a.pairs },
                    });
                    break;
                }
                case 'ERROR_CORRECTION': {
                    const a = answer as { text: string };
                    result.push({
                        ...base,
                        type: 'ERROR_CORRECTION' as const,
                        answer: { text: a.text },
                    });
                    break;
                }
            }
        }

        return result;
    }, [questions, answers]);

    // ── Validate completeness ─────────────────────────────────────────
    const validateComplete = useCallback(() => {
        const missing: string[] = [];
        for (const q of questions) {
            if (!isQuestionComplete(q.id)) {
                missing.push(q.id);
            }
        }

        return {
            valid: missing.length === 0,
            firstMissingId: missing.length > 0 ? missing[0] : null,
            missingCount: missing.length,
        };
    }, [questions, isQuestionComplete]);

    return {
        answers,
        answeredCount,
        totalQuestions,
        currentQuestionIndex,
        currentQuestion,
        answerRevision,
        staleCount,
        setCurrentQuestionIndex,
        setAnswer,
        removeMatchingPair,
        resetAnswers,
        getSubmissionAnswers,
        validateComplete,
        isQuestionComplete,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if a PracticeAnswer is effectively empty (unanswered).
 */
export function isEmptyAnswer(answer: PracticeAnswer): boolean {
    if ('selectedOptionId' in answer) {
        return !answer.selectedOptionId;
    }
    if ('text' in answer && typeof answer.text === 'string') {
        return answer.text.trim().length === 0;
    }
    if ('value' in answer) {
        return answer.value === null || answer.value === undefined;
    }
    if ('pairs' in answer) {
        return Object.keys(answer.pairs).length === 0;
    }
    return true;
}

/**
 * Check if a MATCHING answer is complete: all items paired, no duplicate targets.
 */
export function isMatchingComplete(
    pairs: Record<string, string> | undefined,
    itemCount: number,
): boolean {
    if (!pairs) return false;
    const itemIds = Object.keys(pairs);
    if (itemIds.length < itemCount) return false;
    const targetValues = Object.values(pairs);
    const uniqueTargets = new Set(targetValues);
    return targetValues.length === uniqueTargets.size;
}

/**
 * Restore answers from a checkpoint, matching by question ID, version, and type.
 */
function restoreFromCheckpoint(
    questions: LearnerPracticeQuestionDto[],
    checkpoint: ExerciseCheckpointKind | null,
): Map<string, PracticeAnswer> {
    const result = new Map<string, PracticeAnswer>();

    if (!checkpoint || checkpoint.kind !== 'OBJECTIVE') {
        return result;
    }

    const questionByVersion = new Map<string, { version: number; type: string }>();
    for (const q of questions) {
        questionByVersion.set(q.id, { version: q.version, type: q.type });
    }

    for (const saved of checkpoint.answers) {
        const current = questionByVersion.get(saved.questionId);
        if (
            current &&
            current.version === saved.questionVersion &&
            current.type === saved.type
        ) {
            const answer = objectiveAnswerToPracticeAnswer(saved);
            if (answer) {
                result.set(saved.questionId, answer);
            }
        }
    }

    return result;
}

/**
 * Restore currentQuestionIndex from checkpoint, clamped to valid range.
 */
function restoreCurrentIndex(
    questions: LearnerPracticeQuestionDto[],
    checkpoint: ExerciseCheckpointKind | null,
): number {
    if (!checkpoint || checkpoint.kind !== 'OBJECTIVE') return 0;
    const index = (checkpoint as ExerciseCheckpointKind & { currentQuestionIndex?: number }).currentQuestionIndex ?? 0;
    if (questions.length === 0) return 0;
    return Math.max(0, Math.min(index, questions.length - 1));
}

/**
 * Count how many checkpoint answers were incompatible (stale).
 */
function countStale(
    questions: LearnerPracticeQuestionDto[],
    checkpoint: ExerciseCheckpointKind | null,
): number {
    if (!checkpoint || checkpoint.kind !== 'OBJECTIVE') return 0;

    const questionByVersion = new Map<string, { version: number; type: string }>();
    for (const q of questions) {
        questionByVersion.set(q.id, { version: q.version, type: q.type });
    }

    let stale = 0;
    for (const saved of checkpoint.answers) {
        const current = questionByVersion.get(saved.questionId);
        if (
            !current ||
            current.version !== saved.questionVersion ||
            current.type !== saved.type
        ) {
            stale++;
        }
    }

    return stale;
}

/**
 * Convert an ObjectiveAnswer (submission shape) to a PracticeAnswer (state shape).
 */
function objectiveAnswerToPracticeAnswer(
    saved: ObjectiveAnswer,
): PracticeAnswer | null {
    switch (saved.type) {
        case 'MULTIPLE_CHOICE':
            return { selectedOptionId: saved.answer.selectedOptionId };
        case 'FILL_IN_BLANK':
            return { text: saved.answer.text };
        case 'TRUE_FALSE':
            return { value: saved.answer.value };
        case 'MATCHING':
            return { pairs: saved.answer.pairs };
        case 'ERROR_CORRECTION':
            return { text: saved.answer.text };
        default:
            return null;
    }
}
