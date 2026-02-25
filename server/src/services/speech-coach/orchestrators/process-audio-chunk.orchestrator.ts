/**
 * @module process-audio-chunk.orchestrator
 * @description Use-case orchestrator for `speaking.audio.chunk`.
 * Workflow:
 *   1. Validate session is active.
 *   2. Update lastActivityAt + lastKnownSequence in Redis.
 *   3. Route audio to the conversation engine (Track 1) and optionally assessment engine (Track 2).
 *   4. Dual-track: both tracks run in parallel (Promise.all or separate fire-and-forget).
 *
 * Phase 0 stub — engine integrations are deferred to Phase 2.
 */

import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import type { AudioChunkInput } from '../validations/audio-chunk.schema.js';
import type { SpeakingSessionManager } from '../sessions/speaking-session.manager.js';

export class ProcessAudioChunkOrchestrator {
    constructor(
        private readonly sessionManager: SpeakingSessionManager,
    ) { }

    async execute(payload: AudioChunkInput): Promise<void> {
        const { sessionId, traceId, sequenceNumber, audioData, durationMs, isFinalChunk } = payload;

        // ─── Guard: session must be active ────────────────────────────────
        const session = await this.sessionManager.getSession(sessionId);
        if (!session || session.status !== 'active') {
            throw new AppError(
                `Session ${sessionId} is not active. Cannot process audio chunk.`,
                HttpStatus.CONFLICT,
            );
        }

        logger.debug('[ProcessAudioChunkOrchestrator] Processing audio chunk', {
            sessionId, traceId, sequenceNumber, durationMs, isFinalChunk,
        });

        // ─── Update session state in Redis ────────────────────────────────
        await this.sessionManager.updateSession(sessionId, {
            lastActivityAt: Date.now(),
            lastKnownSequence: sequenceNumber,
            audioChunkCount: session.audioChunkCount + 1,
        });

        // ─── TODO(Phase 2): Dual-track engine routing ─────────────────────
        // await Promise.all([
        //   this.conversationEngine.ingestChunk({ sessionId, audioData, isFinalChunk }),
        //   session.enablePronunciationAssessment
        //     ? this.assessmentEngine.assessChunk({ sessionId, audioData })
        //     : Promise.resolve(),
        // ]);

        logger.debug('[ProcessAudioChunkOrchestrator][STUB] Audio chunk received, engine routing pending', {
            sessionId, sequenceNumber,
        });

        void audioData; // suppress unused var until Phase 2
    }
}
