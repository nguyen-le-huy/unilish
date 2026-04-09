import { useMutation } from '@tanstack/react-query';
import { submitWritingAttempt } from '../api/submit-writing-attempt';
import type { SubmitWritingAttemptPayload } from '../types/writing.types';

interface UseWritingSubmitParams {
    sessionId: string | null;
}

interface UseWritingSubmitResult {
    submitEssay: (payload: SubmitWritingAttemptPayload) => Promise<void>;
    isSubmitting: boolean;
    isSuccess: boolean;
    isError: boolean;
    reset: () => void;
}

export const useWritingSubmit = ({ sessionId }: UseWritingSubmitParams): UseWritingSubmitResult => {
    const submitMutation = useMutation({
        mutationFn: (payload: SubmitWritingAttemptPayload) => submitWritingAttempt(String(sessionId), payload),
    });

    const submitEssay = async (payload: SubmitWritingAttemptPayload) => {
        await submitMutation.mutateAsync(payload);
    };

    return {
        submitEssay,
        isSubmitting: submitMutation.isPending,
        isSuccess: submitMutation.isSuccess,
        isError: submitMutation.isError,
        reset: submitMutation.reset,
    };
};