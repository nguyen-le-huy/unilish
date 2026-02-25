/**
 * @module finalize-speaking-session.orchestrator
 * @description Use-case orchestrator for `speaking.session.end`.
 * Workflow:
 *   1. Validate session exists and is not already ended.
 *   2. Update Redis session status to 'finalizing'.
 *   3. Persist finalized session to MongoDB (via SpeakingResultWriter — Phase 3).
 *   4. Archive audio to R2 (via AudioArchiveWriter — Phase 3).
 *   5. Remove active session from Redis.
 *   6. Emit `speaking.session.ended` to client.
 */

import type { Socket } from 'socket.io';
import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import type { EndSessionInput } from '../validations/end-session.schema.js';
import type { SpeakingSessionManager } from '../sessions/speaking-session.manager.js';
import { SpeakingEventEmitter } from '../transports/event-emitter.js';

export class FinalizeSpeakingSessionOrchestrator {
    constructor(
        private readonly sessionManager: SpeakingSessionManager,
    ) { }

    async execute(payload: EndSessionInput, socket: Socket): Promise<void> {
        const { sessionId, traceId, reason } = payload;
        const emitter = new SpeakingEventEmitter(socket);

        logger.info('[FinalizeSessionOrchestrator] Finalizing speaking session', {
            sessionId, traceId, reason,
        });

        // ─── Guard: session must exist ────────────────────────────────────
        const session = await this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new AppError(
                `Session ${sessionId} not found. Cannot finalize.`,
                HttpStatus.NOT_FOUND,
            );
        }
        if (session.status === 'ended') {
            logger.warn('[FinalizeSessionOrchestrator] Session already ended', { sessionId });
            return;
        }

        // ─── Mark as finalizing ───────────────────────────────────────────
        await this.sessionManager.updateSession(sessionId, { status: 'finalizing' });

        const endedAt = Date.now();
        const durationMs = endedAt - session.startedAt;

        // ─── TODO(Phase 3): Persist result to MongoDB ─────────────────────
        // await this.resultWriter.write({
        //   sessionId, userId: session.userId, lessonId: session.lessonId,
        //   traceId, startedAt: session.startedAt, endedAt, durationMs,
        //   personaId: session.personaId, endReason: reason,
        //   audioChunkCount: session.audioChunkCount, aiTurnCount: session.aiTurnCount,
        //   conversationHistory: [],
        //   status: 'ended',
        // });

        // ─── TODO(Phase 3): Archive audio to R2 ──────────────────────────
        // await this.audioArchiveWriter.archive(sessionId);

        // ─── Cleanup Redis ────────────────────────────────────────────────
        await this.sessionManager.deleteSession(sessionId);

        // ─── Emit session ended event ─────────────────────────────────────
        emitter.emitSessionEnded({
            sessionId,
            traceId,
            durationMs,
            reason: reason === 'user_initiated' ? 'user_initiated' : reason,
        });

        logger.info('[FinalizeSessionOrchestrator] Session finalized and cleaned up', {
            sessionId, durationMs, reason,
        });
    }
}
