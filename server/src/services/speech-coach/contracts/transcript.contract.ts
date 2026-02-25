/**
 * @module transcript.contract
 * @description Transcript and word-timing DTOs for the Speech Coach module.
 * Used both for display rendering (word highlights) and for assessment correlation.
 */

// ─── Word timing token ────────────────────────────────────────────────────────

export interface WordTimingToken {
    readonly word: string;
    readonly startMs: number;
    readonly endMs: number;
    readonly confidence: number; // 0.0–1.0
}

// ─── Sentence-level transcript segment ────────────────────────────────────────

export interface TranscriptSegment {
    readonly segmentId: string;
    readonly sessionId: string;
    readonly speaker: 'user' | 'ai';
    readonly text: string;
    readonly startMs: number;
    readonly endMs: number;
    readonly words: ReadonlyArray<WordTimingToken>;
    readonly isFinal: boolean;
}

// ─── Full session transcript ──────────────────────────────────────────────────

export interface SessionTranscript {
    readonly sessionId: string;
    readonly traceId: string;
    readonly segments: ReadonlyArray<TranscriptSegment>;
    readonly totalDurationMs: number;
    readonly wordCount: number;
    readonly speakingRateWpm: number; // words per minute
}

// ─── Incremental transcript delta (streaming) ─────────────────────────────────

export interface TranscriptDelta {
    readonly sessionId: string;
    readonly traceId: string;
    readonly segmentId: string;
    readonly speaker: 'user' | 'ai';
    readonly textDelta: string;
    readonly wordsDelta: ReadonlyArray<WordTimingToken>;
    readonly isFinal: boolean;
    readonly timestamp: number; // Unix ms
}
