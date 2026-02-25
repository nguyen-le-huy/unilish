/**
 * @module start-speaking-session.orchestrator
 * @description Use-case orchestrator for `speaking.session.start`.
 * Workflow:
 *   1. Guard: validate no duplicate active session.
 *   2. Build persona prompt.
 *   3. Persist active session snapshot to Redis via SessionManager.
 *   4. Emit `speaking.session.started` to client.
 *
 * Zero transport logic here. The gateway calls this; this calls repositories/emitters.
 */

import type { Socket } from 'socket.io';
import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import type { StartSessionInput } from '../validations/start-session.schema.js';
import type { SpeakingSessionManager } from '../sessions/speaking-session.manager.js';
import type { PromptBuilderService } from '../prompts/prompt-builder.service.js';
import { SpeakingEventEmitter } from '../transports/event-emitter.js';
import type { ActiveSpeakingSession } from '../contracts/session.contract.js';

export class StartSpeakingSessionOrchestrator {
    constructor(
        private readonly sessionManager: SpeakingSessionManager,
        private readonly promptBuilder: PromptBuilderService,
    ) { }

    async execute(payload: StartSessionInput, socket: Socket): Promise<void> {
        const { sessionId, userId, lessonId, traceId, personaId, targetLanguage, nativeLanguage, enablePronunciationAssessment } = payload;
        const emitter = new SpeakingEventEmitter(socket);

        logger.info('[StartSessionOrchestrator] Starting speaking session', {
            sessionId, userId, lessonId, traceId, personaId,
        });

        // ─── Guard: no duplicate session ──────────────────────────────────
        const existing = await this.sessionManager.getSession(sessionId);
        if (existing && existing.status === 'active') {
            throw new AppError(
                `Session ${sessionId} is already active`,
                HttpStatus.CONFLICT,
            );
        }

        // ─── Build opening prompt/greeting ────────────────────────────────
        const greeting = await this.promptBuilder.buildGreeting(personaId, targetLanguage);

        // ─── Persist initial session to Redis ─────────────────────────────
        const now = Date.now();
        const activeSession: ActiveSpeakingSession = {
            sessionId,
            userId,
            lessonId,
            traceId,
            personaId,
            targetLanguage,
            nativeLanguage,
            enablePronunciationAssessment,
            status: 'active',
            startedAt: now,
            lastActivityAt: now,
            lastKnownSequence: 0,
            audioChunkCount: 0,
            aiTurnCount: 0,
        };
        await this.sessionManager.createSession(activeSession);

        // ─── Emit started event ───────────────────────────────────────────
        emitter.emitSessionStarted({
            sessionId,
            traceId,
            timestamp: now,
            personaId,
            greeting,
        });

        logger.info('[StartSessionOrchestrator] Session started successfully', {
            sessionId, traceId,
        });
    }
}
