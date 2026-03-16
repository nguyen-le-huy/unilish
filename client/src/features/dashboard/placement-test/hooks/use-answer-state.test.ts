// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAnswerState } from './use-answer-state';
import type { RuntimeAttempt } from '../types/runtime.types';

const createAttempt = (overrides?: Partial<RuntimeAttempt>): RuntimeAttempt => ({
    attemptId: 'attempt-1',
    placementTestId: 'pt-1',
    language: 'en',
    status: 'in_progress',
    startedAt: '2026-03-16T00:00:00.000Z',
    expiresAt: '2026-03-16T01:00:00.000Z',
    totalQuestions: 2,
    modules: [],
    answerSheet: [
        {
            questionId: 'q1',
            selectedOption: 'A',
            flagged: false,
        },
        {
            questionId: 'q2',
            selectedOption: null,
            flagged: true,
        },
    ],
    ...overrides,
});

describe('useAnswerState', () => {
    it('hydrates state once per attempt and keeps local edits on same attempt id', () => {
        const queueSave = vi.fn();
        const initialAttempt = createAttempt();

        const { result, rerender } = renderHook(
            (props: { attempt?: RuntimeAttempt; isSubmitting: boolean }) => useAnswerState({
                ...props,
                queueSave,
            }),
            {
                initialProps: {
                    attempt: initialAttempt,
                    isSubmitting: false,
                },
            },
        );

        expect(result.current.localAnswerMap.q1?.selectedOption).toBe('A');

        act(() => {
            result.current.handleAnswer('q1', 'B');
        });

        expect(result.current.localAnswerMap.q1?.selectedOption).toBe('B');

        const sameAttemptNewReference = createAttempt({
            answerSheet: [
                {
                    questionId: 'q1',
                    selectedOption: 'A',
                    flagged: false,
                },
            ],
        });

        rerender({
            attempt: sameAttemptNewReference,
            isSubmitting: false,
        });

        expect(result.current.localAnswerMap.q1?.selectedOption).toBe('B');
    });

    it('does not update answers while submitting', () => {
        const queueSave = vi.fn();

        const { result } = renderHook(() => useAnswerState({
            attempt: createAttempt(),
            isSubmitting: true,
            queueSave,
        }));

        act(() => {
            result.current.handleAnswer('q1', 'D');
            result.current.handleAnswer('q1', null);
        });

        expect(result.current.localAnswerMap.q1?.selectedOption).toBe('A');
        expect(queueSave).not.toHaveBeenCalled();
    });

    it('toggles flag state and queues save payload', () => {
        const queueSave = vi.fn();

        const { result } = renderHook(() => useAnswerState({
            attempt: createAttempt(),
            isSubmitting: false,
            queueSave,
        }));

        act(() => {
            result.current.handleFlag('q1');
        });

        expect(result.current.localAnswerMap.q1?.flagged).toBe(true);
        expect(queueSave).toHaveBeenCalledWith('q1', {
            selectedOption: 'A',
            flagged: true,
        });
    });

    it('applies local answer state to flat and grouped question structures', () => {
        const queueSave = vi.fn();

        const { result } = renderHook(() => useAnswerState({
            attempt: createAttempt(),
            isSubmitting: false,
            queueSave,
        }));

        const mappedFlat = result.current.applyQuestionStates([
            { id: 'q1', questionNumber: 1 },
            { id: 'q3', questionNumber: 3 },
        ]);

        const mappedGroup = result.current.applyQuestionStates([
            {
                id: 'group-1',
                questions: [{ id: 'q2' }],
            },
        ]);

        expect(mappedFlat[0]?.selectedAnswer).toBe('A');
        expect(mappedFlat[1]?.selectedAnswer).toBeUndefined();
        expect(mappedGroup[0]?.questions[0]?.flagged).toBe(true);
    });

    it('builds question statuses with answered, flagged and unanswered states', () => {
        const queueSave = vi.fn();

        const { result } = renderHook(() => useAnswerState({
            attempt: createAttempt(),
            isSubmitting: false,
            queueSave,
        }));

        const statuses = result.current.buildQuestionStatuses(
            [
                { part: 1, label: 'Part 1', questionCount: 3 },
            ],
            {
                1: [
                    { id: 'q1', questionNumber: 1 },
                    { id: 'q2', questionNumber: 2 },
                    { id: 'q3', questionNumber: 3 },
                ],
            },
        );

        expect(statuses[1]).toEqual([
            { questionId: 'q1', number: 1, state: 'answered' },
            { questionId: 'q2', number: 2, state: 'flagged' },
            { questionId: 'q3', number: 3, state: 'unanswered' },
        ]);
    });
});
