/**
 * @module event-emitter
 * @description Typed helper around Socket.io for emitting outbound Speech Coach events.
 * Keeps all emit calls centralized and ensures payload types match the contract.
 * No business logic here — only transport concern.
 */

import type { Socket } from 'socket.io';
import { logger } from '../../../utils/logger.js';
import { SPEAKING_EVENTS_OUTBOUND } from '../contracts/events.contract.js';
import type {
    SessionStartedPayload,
    AiResponseChunkPayload,
    AssessmentPartialPayload,
    AssessmentFinalPayload,
    SessionErrorPayload,
    SessionEndedPayload,
} from '../contracts/events.contract.js';

export class SpeakingEventEmitter {
    constructor(private readonly socket: Socket) { }

    emitSessionStarted(payload: SessionStartedPayload): void {
        this.socket.emit(SPEAKING_EVENTS_OUTBOUND.SESSION_STARTED, payload);
        logger.debug('[SpeakingEventEmitter] Emitted session.started', {
            sessionId: payload.sessionId,
            traceId: payload.traceId,
        });
    }

    emitAiResponseChunk(payload: AiResponseChunkPayload): void {
        this.socket.emit(SPEAKING_EVENTS_OUTBOUND.AI_RESPONSE_CHUNK, payload);
    }

    emitAssessmentPartial(payload: AssessmentPartialPayload): void {
        this.socket.emit(SPEAKING_EVENTS_OUTBOUND.ASSESSMENT_PARTIAL, payload);
        logger.debug('[SpeakingEventEmitter] Emitted assessment.partial', {
            sessionId: payload.sessionId,
        });
    }

    emitAssessmentFinal(payload: AssessmentFinalPayload): void {
        this.socket.emit(SPEAKING_EVENTS_OUTBOUND.ASSESSMENT_FINAL, payload);
        logger.debug('[SpeakingEventEmitter] Emitted assessment.final', {
            sessionId: payload.sessionId,
            overallScore: payload.overallScore,
        });
    }

    emitSessionError(payload: SessionErrorPayload): void {
        this.socket.emit(SPEAKING_EVENTS_OUTBOUND.SESSION_ERROR, payload);
        logger.warn('[SpeakingEventEmitter] Emitted session.error', {
            sessionId: payload.sessionId,
            errorCode: payload.errorCode,
            retryable: payload.retryable,
        });
    }

    emitSessionEnded(payload: SessionEndedPayload): void {
        this.socket.emit(SPEAKING_EVENTS_OUTBOUND.SESSION_ENDED, payload);
        logger.info('[SpeakingEventEmitter] Emitted session.ended', {
            sessionId: payload.sessionId,
            durationMs: payload.durationMs,
        });
    }
}
