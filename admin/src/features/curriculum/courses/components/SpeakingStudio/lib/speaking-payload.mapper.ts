/**
 * @module speaking-payload.mapper
 * @description V1 — Builds strongly-typed payloads for Socket emission.
 * Matches the V1 server-side Zod schemas exactly (start-session, audio-chunk, end-session).
 *
 * @v2-deferred buildUserMessagePayload — USER_MESSAGE event is V2.
 * @v2-deferred contractVersion field removed from V1 payloads.
 * @v2-deferred personaId, targetLanguage, enablePronunciationAssessment removed from session start.
 */

import type { SessionEndReason } from '../types/speaking.types';

// ─── V1 payload builders ──────────────────────────────────────────────────────

interface BuildSessionStartPayloadParams {
    sessionId: string;
    userId: string;
    lessonId: string;
    traceId: string;
    nativeLanguage: string;
}

interface BuildAudioChunkPayloadParams {
    sessionId: string;
    userId: string;
    lessonId: string;
    traceId: string;
    sequenceNumber: number;
    audioData: string;
    audioFormat: string;
    durationMs: number;
    isFinalChunk: boolean;
}

interface BuildSessionEndPayloadParams {
    sessionId: string;
    userId: string;
    lessonId: string;
    traceId: string;
    reason: SessionEndReason;
}

export const buildSessionStartPayload = (params: BuildSessionStartPayloadParams) => {
    const { sessionId, userId, lessonId, traceId, nativeLanguage } = params;

    return {
        sessionId,
        userId,
        lessonId,
        traceId,
        timestamp: Date.now(),
        nativeLanguage,
    };
};

export const buildAudioChunkPayload = (params: BuildAudioChunkPayloadParams) => {
    const { sessionId, userId, lessonId, traceId, sequenceNumber, audioData, audioFormat, durationMs, isFinalChunk } = params;

    return {
        sessionId,
        userId,
        lessonId,
        traceId,
        timestamp: Date.now(),
        sequenceNumber,
        audioData,
        audioFormat,
        durationMs,
        isFinalChunk,
    };
};

export const buildSessionEndPayload = (params: BuildSessionEndPayloadParams) => {
    const { sessionId, userId, lessonId, traceId, reason } = params;

    return {
        sessionId,
        userId,
        lessonId,
        traceId,
        timestamp: Date.now(),
        reason,
    };
};

