import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { submitWritingAttempt } from '../api/submit-writing-attempt';
import { getWritingResult } from '../api/get-writing-result';
import type { SubmitWritingAttemptPayload, WritingResult } from '../types/writing.types';

const MAX_POLLING_MS = 5 * 60 * 1000;

interface UseWritingSubmitParams {
    sessionId: string | null;
}

interface UseWritingSubmitResult {
    submitEssay: (payload: SubmitWritingAttemptPayload) => Promise<void>;
    submitState: 'idle' | 'submitting' | 'grading' | 'done' | 'error';
    result: WritingResult | undefined;
    isSubmitting: boolean;
    isPolling: boolean;
    hasTimedOut: boolean;
    reset: () => void;
}

export const useWritingSubmit = ({ sessionId }: UseWritingSubmitParams): UseWritingSubmitResult => {
    const [isPollingEnabled, setIsPollingEnabled] = useState(false);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const pollingStartRef = useRef<number | null>(null);

    const submitMutation = useMutation({
        mutationFn: (payload: SubmitWritingAttemptPayload) => submitWritingAttempt(String(sessionId), payload),
    });

    const resultQuery = useQuery<WritingResult, Error>({
        queryKey: ['placement-test', 'writing', 'result', sessionId],
        queryFn: () => getWritingResult(String(sessionId)),
        enabled: Boolean(sessionId) && isPollingEnabled,
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: (query) => {
            const result = query.state.data;
            const startAt = pollingStartRef.current;

            if (!isPollingEnabled || !startAt) {
                return false;
            }

            if (Date.now() - startAt > MAX_POLLING_MS) {
                setHasTimedOut(true);
                return false;
            }

            if (result?.status === 'done') {
                return false;
            }

            return 5000;
        },
    });

    const submitEssay = async (payload: SubmitWritingAttemptPayload) => {
        setHasTimedOut(false);
        await submitMutation.mutateAsync(payload);
        pollingStartRef.current = Date.now();
        setIsPollingEnabled(true);
    };

    const submitState = useMemo<UseWritingSubmitResult['submitState']>(() => {
        if (submitMutation.isPending) {
            return 'submitting';
        }

        if (submitMutation.isError || resultQuery.isError || hasTimedOut) {
            return 'error';
        }

        if (resultQuery.data?.status === 'done') {
            return 'done';
        }

        if (isPollingEnabled) {
            return 'grading';
        }

        return 'idle';
    }, [hasTimedOut, isPollingEnabled, resultQuery.data?.status, resultQuery.isError, submitMutation.isError, submitMutation.isPending]);

    const reset = () => {
        pollingStartRef.current = null;
        setIsPollingEnabled(false);
        setHasTimedOut(false);
        submitMutation.reset();
    };

    return {
        submitEssay,
        submitState,
        result: resultQuery.data,
        isSubmitting: submitMutation.isPending,
        isPolling: isPollingEnabled,
        hasTimedOut,
        reset,
    };
};