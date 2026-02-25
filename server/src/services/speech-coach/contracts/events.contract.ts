/**
 * @module events.contract
 * @description Typed Socket event name constants + payload map for the Speech Coach module.
 * All inbound events require `contractVersion` for forward compatibility.
 * All events require correlation fields: sessionId, userId, lessonId, traceId, timestamp.
 */

// ─── Inbound (Client → Server) ───────────────────────────────────────────────

export const SPEAKING_EVENTS_INBOUND = {
    SESSION_START: 'speaking.session.start',
    AUDIO_CHUNK: 'speaking.audio.chunk',
    SESSION_END: 'speaking.session.end',
    SESSION_RECOVER: 'speaking.session.recover',
} as const;

export type SpeakingInboundEventName =
    (typeof SPEAKING_EVENTS_INBOUND)[keyof typeof SPEAKING_EVENTS_INBOUND];

// ─── Outbound (Server → Client) ──────────────────────────────────────────────

export const SPEAKING_EVENTS_OUTBOUND = {
    SESSION_STARTED: 'speaking.session.started',
    AI_RESPONSE_CHUNK: 'speaking.ai.response.chunk',
    ASSESSMENT_PARTIAL: 'speaking.assessment.partial',
    ASSESSMENT_FINAL: 'speaking.assessment.final',
    SESSION_ERROR: 'speaking.session.error',
    SESSION_ENDED: 'speaking.session.ended',
} as const;

export type SpeakingOutboundEventName =
    (typeof SPEAKING_EVENTS_OUTBOUND)[keyof typeof SPEAKING_EVENTS_OUTBOUND];

// ─── Base correlation fields (mandatory on every payload) ────────────────────

export interface SpeakingEventBase {
    readonly sessionId: string;
    readonly userId: string;
    readonly lessonId: string;
    readonly traceId: string;
    readonly timestamp: number; // Unix ms
    readonly contractVersion: number; // e.g. 1
}

// ─── Inbound payload types ────────────────────────────────────────────────────

export interface StartSessionPayload extends SpeakingEventBase {
    readonly personaId: string;
    readonly targetLanguage: string;
    readonly nativeLanguage: string;
    readonly enablePronunciationAssessment: boolean;
}

export interface AudioChunkPayload extends SpeakingEventBase {
    readonly sequenceNumber: number;
    readonly audioData: Buffer | string; // base64 string over wire
    readonly durationMs: number;
    readonly isFinalChunk: boolean;
}

export interface EndSessionPayload extends SpeakingEventBase {
    readonly reason: 'user_initiated' | 'timeout' | 'error';
}

export interface RecoverSessionPayload extends SpeakingEventBase {
    readonly lastKnownSequence: number;
}

// ─── Outbound payload types ───────────────────────────────────────────────────

export interface SessionStartedPayload {
    readonly sessionId: string;
    readonly traceId: string;
    readonly timestamp: number;
    readonly personaId: string;
    readonly greeting: string;
}

export interface AiResponseChunkPayload {
    readonly sessionId: string;
    readonly traceId: string;
    readonly sequenceNumber: number;
    readonly textDelta: string;
    readonly audioDelta?: string; // base64 audio chunk if TTS enabled
    readonly isFinal: boolean;
}

export interface AssessmentPartialPayload {
    readonly sessionId: string;
    readonly traceId: string;
    readonly wordResults: ReadonlyArray<{
        readonly word: string;
        readonly accuracyScore: number;
        readonly errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
    }>;
}

export interface AssessmentFinalPayload {
    readonly sessionId: string;
    readonly traceId: string;
    readonly overallScore: number;
    readonly pronunciationScore: number;
    readonly fluencyScore: number;
    readonly completenessScore: number;
    readonly wordResults: ReadonlyArray<{
        readonly word: string;
        readonly accuracyScore: number;
        readonly errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
    }>;
}

export interface SessionErrorPayload {
    readonly sessionId: string;
    readonly traceId: string;
    readonly errorCode: string;
    readonly message: string;
    readonly retryable: boolean;
}

export interface SessionEndedPayload {
    readonly sessionId: string;
    readonly traceId: string;
    readonly durationMs: number;
    readonly reason: 'user_initiated' | 'timeout' | 'error' | 'completed';
}

// ─── Typed inbound event map ──────────────────────────────────────────────────

export interface SpeakingInboundEventMap {
    [SPEAKING_EVENTS_INBOUND.SESSION_START]: StartSessionPayload;
    [SPEAKING_EVENTS_INBOUND.AUDIO_CHUNK]: AudioChunkPayload;
    [SPEAKING_EVENTS_INBOUND.SESSION_END]: EndSessionPayload;
    [SPEAKING_EVENTS_INBOUND.SESSION_RECOVER]: RecoverSessionPayload;
}
