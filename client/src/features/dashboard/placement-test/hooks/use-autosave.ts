import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { SavePlacementAnswersPayload, SavePlacementAnswersResult } from '../api/save-placement-answers';
import type { LocalAnswerState } from '../types/runtime.types';
import { getAutosaveRetryDelayMs } from '../utils/timer';

const MAX_AUTOSAVE_RETRIES = 3;

interface UseAutosaveParams {
    attemptId?: string;
    saveAnswersMutation: UseMutationResult<SavePlacementAnswersResult, Error, SavePlacementAnswersPayload>;
    autosaveErrorMessage: string;
}

export const useAutosave = ({ attemptId, saveAnswersMutation, autosaveErrorMessage }: UseAutosaveParams) => {
    const pendingChangesRef = useRef<Record<string, LocalAnswerState>>({});
    const debounceRef = useRef<number | null>(null);
    const retryTimeoutRef = useRef<number | null>(null);
    const hasShownAutosaveErrorRef = useRef(false);
    const saveAnswersMutationRef = useRef(saveAnswersMutation);
    const autosaveErrorMessageRef = useRef(autosaveErrorMessage);

    saveAnswersMutationRef.current = saveAnswersMutation;
    autosaveErrorMessageRef.current = autosaveErrorMessage;

    const flushPendingChanges = useCallback(async (allowRetry = true) => {
        if (!attemptId) {
            return;
        }

        const entries = Object.entries(pendingChangesRef.current);
        if (entries.length === 0) {
            return;
        }

        const pendingSnapshot = Object.fromEntries(entries);
        pendingChangesRef.current = {};

        let retryCount = 0;
        while (retryCount <= MAX_AUTOSAVE_RETRIES) {
            try {
                await saveAnswersMutationRef.current.mutateAsync({
                    attemptId,
                    answers: Object.entries(pendingSnapshot).map(([questionId, value]) => ({
                        questionId,
                        selectedOption: value.selectedOption,
                        flagged: value.flagged,
                    })),
                });

                hasShownAutosaveErrorRef.current = false;
                return;
            } catch (error) {
                retryCount += 1;

                if (!allowRetry || retryCount > MAX_AUTOSAVE_RETRIES) {
                    pendingChangesRef.current = {
                        ...pendingSnapshot,
                        ...pendingChangesRef.current,
                    };

                    if (!allowRetry) {
                        throw error;
                    }

                    if (!hasShownAutosaveErrorRef.current) {
                        toast.error(autosaveErrorMessageRef.current);
                        hasShownAutosaveErrorRef.current = true;
                    }

                    const delay = getAutosaveRetryDelayMs(retryCount);
                    if (retryTimeoutRef.current) {
                        window.clearTimeout(retryTimeoutRef.current);
                    }

                    retryTimeoutRef.current = window.setTimeout(() => {
                        void flushPendingChanges(true);
                    }, delay);
                    return;
                }
            }
        }
    }, [attemptId]);

    const queueSave = useCallback((questionId: string, value: LocalAnswerState) => {
        pendingChangesRef.current[questionId] = value;

        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
        }

        if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        debounceRef.current = window.setTimeout(() => {
            void flushPendingChanges(true);
        }, 800);
    }, [flushPendingChanges]);

    const cancelScheduledSaves = useCallback(() => {
        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            cancelScheduledSaves();
        };
    }, [cancelScheduledSaves]);

    return {
        queueSave,
        flushPendingChanges,
        cancelScheduledSaves,
    };
};
