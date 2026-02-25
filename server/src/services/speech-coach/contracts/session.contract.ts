/**
 * @module session.contract
 * @description Session state DTOs for the Speech Coach module.
 * ActiveSpeakingSession lives in Redis (transient).
 * FinalizedSpeakingSession is persisted to MongoDB.
 */

export type SpeakingSessionStatus =
    | 'initializing'
    | 'active'
    | 'paused'
    | 'finalizing'
    | 'ended'
    | 'error';

export type SpeakingPersonaId =
    | 'airport-staff'
    | 'ielts-examiner'
    | 'business-client'
    | 'casual-friend';

// ─── Redis-backed active session state ───────────────────────────────────────

export interface ActiveSpeakingSession {
    readonly sessionId: string;
    readonly userId: string;
    readonly lessonId: string;
    readonly traceId: string;
    readonly personaId: SpeakingPersonaId;
    readonly targetLanguage: string;
    readonly nativeLanguage: string;
    readonly enablePronunciationAssessment: boolean;
    readonly status: SpeakingSessionStatus;
    readonly startedAt: number; // Unix ms
    readonly lastActivityAt: number; // Unix ms — used for idle timeout
    readonly lastKnownSequence: number;
    readonly audioChunkCount: number;
    readonly aiTurnCount: number;
}

// ─── Session recovery snapshot (stored alongside active session) ──────────────

export interface SessionRecoverySnapshot {
    readonly sessionId: string;
    readonly lastKnownSequence: number;
    readonly conversationHistory: ReadonlyArray<{
        readonly role: 'user' | 'assistant';
        readonly content: string;
        readonly timestamp: number;
    }>;
    readonly snapshotAt: number;
}

// ─── Finalized session DTO (ready for mongo persistence) ─────────────────────

export interface FinalizedSpeakingSession {
    readonly sessionId: string;
    readonly userId: string;
    readonly lessonId: string;
    readonly traceId: string;
    readonly personaId: SpeakingPersonaId;
    readonly status: Extract<SpeakingSessionStatus, 'ended' | 'error'>;
    readonly startedAt: number;
    readonly endedAt: number;
    readonly durationMs: number;
    readonly audioChunkCount: number;
    readonly aiTurnCount: number;
    readonly endReason: 'user_initiated' | 'timeout' | 'error' | 'completed';
    readonly conversationHistory: ReadonlyArray<{
        readonly role: 'user' | 'assistant';
        readonly content: string;
        readonly timestamp: number;
    }>;
}
