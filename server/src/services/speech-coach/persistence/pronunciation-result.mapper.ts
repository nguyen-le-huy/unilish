/**
 * @module pronunciation-result.mapper
 * @description Maps normalized assessment results into MongoDB-ready document shapes.
 * Keeps persistence concerns separate from engine/normalization logic.
 */

import type { NormalizedAssessmentResult } from '../contracts/assessment.contract.js';

export interface PronunciationResultDocument {
    readonly sessionId: string;
    readonly userId: string;
    readonly lessonId: string;
    readonly traceId: string;
    readonly utteranceId: string;
    readonly overallScore: number;
    readonly pronunciationScore: number;
    readonly fluencyScore: number;
    readonly completenessScore: number;
    readonly prosodyScore?: number;
    readonly wordResults: ReadonlyArray<{
        readonly word: string;
        readonly accuracyScore: number;
        readonly errorType: string;
    }>;
    readonly assessedAt: number;
    readonly provider: 'azure';
}

export class PronunciationResultMapper {
    toDocument(
        result: NormalizedAssessmentResult,
        userId: string,
        lessonId: string,
    ): PronunciationResultDocument {
        const { normalized, provider } = result;

        const prosodyScore = normalized.prosodyScore;

        return {
            sessionId: normalized.sessionId,
            userId,
            lessonId,
            traceId: normalized.traceId,
            utteranceId: normalized.utteranceId,
            overallScore: normalized.overallScore,
            pronunciationScore: normalized.pronunciationScore,
            fluencyScore: normalized.fluencyScore,
            completenessScore: normalized.completenessScore,
            wordResults: normalized.wordResults.map((w) => ({
                word: w.word,
                accuracyScore: w.accuracyScore,
                errorType: w.errorType,
            })),
            assessedAt: normalized.assessedAt,
            provider,
            // exactOptionalPropertyTypes: conditionally spread optional field
            ...(prosodyScore !== undefined ? { prosodyScore } : {}),
        };
    }
}
