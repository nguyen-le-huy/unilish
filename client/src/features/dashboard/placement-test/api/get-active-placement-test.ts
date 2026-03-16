import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import { AxiosError, isAxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import type { ActivePlacementTest } from '../types/runtime.types';

/**
 * Keep compatibility with historical language codes while preferring normalized runtime route.
 */
const buildLanguageFallbackChain = (language: string): string[] => {
    const normalizedLanguage = language.trim().toLowerCase().replace(/_/g, '-');
    const baseLanguage = normalizedLanguage.split('-')[0] ?? normalizedLanguage;

    return Array.from(new Set([
        language,
        normalizedLanguage,
        baseLanguage,
        'en',
        'english',
        'en-US',
        'en-us',
    ]));
};

export const getActivePlacementTest = async (language: string): Promise<ActivePlacementTest> => {
    const fallbackLanguages = buildLanguageFallbackChain(language);

    let lastError: AxiosError<ApiErrorResponse> | null = null;

    for (const languageCandidate of fallbackLanguages) {
        try {
            return await apiGetUnwrappedEnvelope<ActivePlacementTest>('/placement-tests/runtime/active', {
                params: { language: languageCandidate },
            });
        } catch (error) {
            if (!isAxiosError<ApiErrorResponse>(error)) {
                throw error;
            }

            lastError = error;

            if (error.response?.status === 404) {
                try {
                    return await apiGetUnwrappedEnvelope<ActivePlacementTest>('/placement-tests/active', {
                        params: { language: languageCandidate },
                    });
                } catch (fallbackError) {
                    if (!isAxiosError<ApiErrorResponse>(fallbackError)) {
                        throw fallbackError;
                    }

                    lastError = fallbackError;
                    if (fallbackError.response?.status !== 404) {
                        throw fallbackError;
                    }
                    continue;
                }
            }

            // Only continue fallback on "not found" for this language key.
            if (error.response?.status !== 404) {
                throw error;
            }
        }
    }

    throw lastError ?? new Error('No active placement test found');
};
