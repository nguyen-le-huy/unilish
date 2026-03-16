// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseMutationResult } from '@tanstack/react-query';
import { useAutosave } from './use-autosave';
import type { SavePlacementAnswersPayload, SavePlacementAnswersResult } from '../api/save-placement-answers';

const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
    toast: {
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

const createMutationResult = (
    mutateAsync: (payload: SavePlacementAnswersPayload) => Promise<SavePlacementAnswersResult>,
): UseMutationResult<SavePlacementAnswersResult, Error, SavePlacementAnswersPayload> => {
    // Intentional partial mock: this hook only depends on mutateAsync.
    return {
        mutateAsync,
    } as unknown as UseMutationResult<SavePlacementAnswersResult, Error, SavePlacementAnswersPayload>;
};

describe('useAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        toastErrorMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('queues answer changes and flushes with debounce', async () => {
        const mutateAsync = vi.fn(async () => ({
            attemptId: 'attempt-1',
            status: 'in_progress',
            answerSheet: [],
            progress: { answered: 1, total: 10, flagged: 0 },
        }));

        const { result } = renderHook(() => useAutosave({
            attemptId: 'attempt-1',
            saveAnswersMutation: createMutationResult(mutateAsync),
            autosaveErrorMessage: 'Autosave failed',
        }));

        act(() => {
            result.current.queueSave('q1', { selectedOption: 'A', flagged: false });
            vi.advanceTimersByTime(800);
        });

        await vi.runAllTicks();

        expect(mutateAsync).toHaveBeenCalledTimes(1);
        expect(mutateAsync).toHaveBeenCalledWith({
            attemptId: 'attempt-1',
            answers: [{ questionId: 'q1', selectedOption: 'A', flagged: false }],
        });
    });

    it('throws when flush without retry fails', async () => {
        const mutateAsync = vi.fn(async () => {
            throw new Error('network error');
        });

        const { result } = renderHook(() => useAutosave({
            attemptId: 'attempt-1',
            saveAnswersMutation: createMutationResult(mutateAsync),
            autosaveErrorMessage: 'Autosave failed',
        }));

        act(() => {
            result.current.queueSave('q2', { selectedOption: null, flagged: true });
            result.current.cancelScheduledSaves();
        });

        await expect(result.current.flushPendingChanges(false)).rejects.toThrow('network error');
        expect(toastErrorMock).not.toHaveBeenCalled();
    });
});
