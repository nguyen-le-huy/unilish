/**
 * @module assessment-normalizer
 * @description Normalizer utility that transforms raw Azure Pronunciation Assessment
 * API responses into the canonical NormalizedAssessmentResult contract.
 * Provider SDK response MUST pass through this before emitting or persisting.
 *
 * Phase 0/2 stub — normalization logic filled in during Phase 2 Azure integration.
 */

import { logger } from '../../../../utils/logger.js';
import type {
    NormalizedAssessmentResult,
    UtteranceAssessmentResult,
    WordAssessmentResult,
    PronunciationErrorType,
} from '../../contracts/assessment.contract.js';

/** Raw Azure SDK word result shape (partial — full type from azure-cognitiveservices-speech-sdk) */
interface AzureWordResult {
    Word: string;
    Offset: number;
    Duration: number;
    AccuracyScore: number;
    ErrorType: string;
    Syllables?: Array<{ Syllable: string; AccuracyScore: number }>;
    Phonemes?: Array<{ Phoneme: string; AccuracyScore: number }>;
}

/** Raw Azure pronunciation assessment result shape */
interface AzureRawResult {
    Id: string;
    Text: string;
    PronunciationScore: number;
    AccuracyScore: number;
    FluencyScore: number;
    CompletenessScore: number;
    ProsodyScore?: number;
    Words: AzureWordResult[];
}

function mapErrorType(raw: string): PronunciationErrorType {
    const valid: PronunciationErrorType[] = [
        'None', 'Omission', 'Insertion', 'Mispronunciation', 'UnexpectedBreak', 'MissingBreak', 'Monotone',
    ];
    return (valid.includes(raw as PronunciationErrorType) ? raw : 'None') as PronunciationErrorType;
}

export class AssessmentNormalizer {
    normalize(
        raw: unknown,
        sessionId: string,
        traceId: string,
        utteranceId: string,
    ): NormalizedAssessmentResult {
        logger.debug('[AssessmentNormalizer][STUB] normalize called', {
            sessionId, traceId, utteranceId,
        });

        // TODO(Phase 2): Replace stub with real Azure SDK result parsing
        const azureResult = raw as AzureRawResult;

        const wordResults: ReadonlyArray<WordAssessmentResult> = (azureResult?.Words ?? []).map(
            (w: AzureWordResult): WordAssessmentResult => {
                const syllables = w.Syllables?.map((s) => ({
                    syllable: s.Syllable,
                    accuracyScore: s.AccuracyScore,
                }));
                const phonemes = w.Phonemes?.map((p) => ({
                    phoneme: p.Phoneme,
                    accuracyScore: p.AccuracyScore,
                }));

                // exactOptionalPropertyTypes: only include optional keys when defined
                const wordResult: WordAssessmentResult = {
                    word: w.Word ?? '',
                    offset: w.Offset ?? 0,
                    duration: w.Duration ?? 0,
                    accuracyScore: w.AccuracyScore ?? 0,
                    errorType: mapErrorType(w.ErrorType ?? 'None'),
                    ...(syllables !== undefined ? { syllables } : {}),
                    ...(phonemes !== undefined ? { phonemes } : {}),
                };
                return wordResult;
            }
        );

        const prosodyScore = azureResult?.ProsodyScore;
        const normalized: UtteranceAssessmentResult = {
            utteranceId,
            sessionId,
            traceId,
            text: azureResult?.Text ?? '',
            overallScore: azureResult?.AccuracyScore ?? 0,
            pronunciationScore: azureResult?.PronunciationScore ?? 0,
            fluencyScore: azureResult?.FluencyScore ?? 0,
            completenessScore: azureResult?.CompletenessScore ?? 0,
            wordResults,
            assessedAt: Date.now(),
            ...(prosodyScore !== undefined ? { prosodyScore } : {}),
        };

        return { provider: 'azure', raw, normalized };
    }
}
