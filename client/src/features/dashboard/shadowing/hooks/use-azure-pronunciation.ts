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

const MAX_SCORE_ATTEMPTS = 2;
const SCORE_TIMEOUT_MS = 25_000;
const RETRY_BASE_DELAY_MS = 600;

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
    window.setTimeout(resolve, ms);
});

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

            let lastError: unknown = null;
            for (let attempt = 0; attempt < MAX_SCORE_ATTEMPTS; attempt += 1) {
                try {
                    return await shadowingService.scorePronunciation(formData, SCORE_TIMEOUT_MS);
                } catch (scoringError) {
                    lastError = scoringError;
                    if (attempt < MAX_SCORE_ATTEMPTS - 1) {
                        await wait(RETRY_BASE_DELAY_MS * (attempt + 1));
                    }
                }
            }

            throw lastError;
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
