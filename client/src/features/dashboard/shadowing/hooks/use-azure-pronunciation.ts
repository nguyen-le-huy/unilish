import { useCallback, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { shadowingService } from '../api/shadowing.service';
import type { PronunciationResult } from '../types/shadowing.types';

interface UseAzurePronunciationResult {
    scoreBlob: (blob: Blob, referenceText: string) => Promise<PronunciationResult>;
    isScoring: boolean;
    error: string | null;
    clearError: () => void;
}

interface ApiErrorPayload {
    message?: string;
}

const getScoringErrorMessage = (error: unknown): string => {
    if (isAxiosError<ApiErrorPayload>(error)) {
        const apiMessage = error.response?.data?.message;
        if (apiMessage) {
            return apiMessage;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Unable to score pronunciation.';
};

export const useAzurePronunciation = (): UseAzurePronunciationResult => {
    const [isScoring, setIsScoring] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const scoreBlob = useCallback(async (blob: Blob, referenceText: string): Promise<PronunciationResult> => {
        setIsScoring(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('audio', blob, 'shadowing-recording.webm');
            formData.append('referenceText', referenceText);

            return await shadowingService.scorePronunciation(formData);
        } catch (scoringError) {
            const message = getScoringErrorMessage(scoringError);
            setError(message);
            throw new Error(message);
        } finally {
            setIsScoring(false);
        }
    }, []);

    return useMemo(() => ({
        scoreBlob,
        isScoring,
        error,
        clearError,
    }), [clearError, error, isScoring, scoreBlob]);
};
