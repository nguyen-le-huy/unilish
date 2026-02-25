/**
 * @module recover-speaking-session.orchestrator
 * @description Use-case orchestrator for `speaking.session.recover`.
 * Workflow:
 *   1. Look up recovery snapshot from Redis.
 *   2. If not found: attempt to restore from most recent session state.
 *   3. Rebuild conversation history for AI context replay.
 *   4. Mark session as active again.
 *   5. Re-emit `speaking.session.started` so client can resume UI.
 */

import type { Socket } from 'socket.io';
import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import type { RecoverSessionInput } from '../validations/end-session.schema.js';
import type { SpeakingSessionManager } from '../sessions/speaking-session.manager.js';
import { SpeakingEventEmitter } from '../transports/event-emitter.js';

export class RecoverSpeakingSessionOrchestrator {
    constructor(
        private readonly sessionManager: SpeakingSessionManager,
    ) { }

    async execute(payload: RecoverSessionInput, socket: Socket): Promise<void> {
        const { sessionId, userId, traceId, lastKnownSequence } = payload;
        const emitter = new SpeakingEventEmitter(socket);

        logger.info('[RecoverSessionOrchestrator] Attempting session recovery', {
            sessionId, userId, traceId, lastKnownSequence,
        });

        // ─── Look up session ──────────────────────────────────────────────
        const session = await this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new AppError(
                `Session ${sessionId} not found. Cannot recover.`,
                HttpStatus.NOT_FOUND,
            );
        }

        if (session.userId !== userId) {
            throw new AppError(
                `Unauthorized: userId mismatch for session ${sessionId}`,
                HttpStatus.FORBIDDEN,
            );
        }

        // ─── Attempt snapshot-based recovery ─────────────────────────────
        const snapshot = await this.sessionManager.getRecoverySnapshot(sessionId);
        const recoveredSequence = snapshot?.lastKnownSequence ?? session.lastKnownSequence;

        logger.info('[RecoverSessionOrchestrator] Recovery snapshot found', {
            sessionId, recoveredSequence,
        });

        // ─── Re-activate session ──────────────────────────────────────────
        await this.sessionManager.updateSession(sessionId, {
            status: 'active',
            lastActivityAt: Date.now(),
            lastKnownSequence: recoveredSequence,
        });

        // ─── TODO(Phase 2): Replay conversation history into engine context ──
        // if (snapshot?.conversationHistory?.length) {
        //   await this.conversationEngine.replayHistory(sessionId, snapshot.conversationHistory);
        // }

        // ─── Re-emit session started so client can resume ─────────────────
        emitter.emitSessionStarted({
            sessionId,
            traceId,
            timestamp: Date.now(),
            personaId: session.personaId,
            greeting: `Welcome back! We were at message ${recoveredSequence}. Let's continue.`,
        });

        logger.info('[RecoverSessionOrchestrator] Session recovered successfully', {
            sessionId, recoveredSequence,
        });
    }
}
