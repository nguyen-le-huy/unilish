/**
 * @module assessment.contract
 * @description Pronunciation assessment result DTOs.
 * All provider-specific responses are normalized here before emitting or persisting.
 */

export type PronunciationErrorType =
    | 'None'
    | 'Omission'
    | 'Insertion'
    | 'Mispronunciation'
    | 'UnexpectedBreak'
    | 'MissingBreak'
    | 'Monotone';

// ─── Word-level result ─────────────────────────────────────────────────────

export interface WordAssessmentResult {
    readonly word: string;
    readonly offset: number; // start time in ticks
    readonly duration: number; // duration in ticks
    readonly accuracyScore: number; // 0–100
    readonly errorType: PronunciationErrorType;
    readonly syllables?: ReadonlyArray<{
        readonly syllable: string;
        readonly accuracyScore: number;
    }>;
    readonly phonemes?: ReadonlyArray<{
        readonly phoneme: string;
        readonly accuracyScore: number;
    }>;
}

// ─── Utterance-level result ────────────────────────────────────────────────

export interface UtteranceAssessmentResult {
    readonly utteranceId: string;
    readonly sessionId: string;
    readonly traceId: string;
    readonly text: string;
    readonly overallScore: number;
    readonly pronunciationScore: number;
    readonly fluencyScore: number;
    readonly completenessScore: number;
    readonly prosodyScore?: number;
    readonly wordResults: ReadonlyArray<WordAssessmentResult>;
    readonly assessedAt: number; // Unix ms
}

// ─── Normalized provider wrapper ───────────────────────────────────────────

export interface NormalizedAssessmentResult {
    readonly provider: 'azure';
    readonly raw: unknown; // original provider response (for audit)
    readonly normalized: UtteranceAssessmentResult;
}

// ─── Partial assessment (emitted progressively during utterance) ───────────

export interface PartialAssessmentResult {
    readonly sessionId: string;
    readonly traceId: string;
    readonly wordResults: ReadonlyArray<Pick<WordAssessmentResult, 'word' | 'accuracyScore' | 'errorType'>>;
}
