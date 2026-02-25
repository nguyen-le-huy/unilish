/**
 * @module speech-coach.service
 * @description Facade service for the Speech Coach module.
 * This is the single entry point that the Socket gateway calls.
 * Delegates to use-case orchestrators — no business logic lives here.
 *
 * Dependency graph (constructor injection):
 *   SpeechCoachService
 *     ├── StartSpeakingSessionOrchestrator (SessionManager, PromptBuilder)
 *     ├── ProcessAudioChunkOrchestrator (SessionManager)
 *     ├── FinalizeSpeakingSessionOrchestrator (SessionManager)
 *     └── RecoverSpeakingSessionOrchestrator (SessionManager)
 */

import type { Socket } from 'socket.io';
import { logger } from '../../utils/logger.js';
import { SpeakingSessionCacheRepo } from './sessions/speaking-session.cache.repo.js';
import { SpeakingSessionManager } from './sessions/speaking-session.manager.js';
import { PromptBuilderService } from './prompts/prompt-builder.service.js';
import { StartSpeakingSessionOrchestrator } from './orchestrators/start-speaking-session.orchestrator.js';
import { ProcessAudioChunkOrchestrator } from './orchestrators/process-audio-chunk.orchestrator.js';
import { FinalizeSpeakingSessionOrchestrator } from './orchestrators/finalize-speaking-session.orchestrator.js';
import { RecoverSpeakingSessionOrchestrator } from './orchestrators/recover-speaking-session.orchestrator.js';
import type { StartSessionInput } from './validations/start-session.schema.js';
import type { AudioChunkInput } from './validations/audio-chunk.schema.js';
import type { EndSessionInput, RecoverSessionInput } from './validations/end-session.schema.js';

export class SpeechCoachService {
    private readonly startOrchestrator: StartSpeakingSessionOrchestrator;
    private readonly audioChunkOrchestrator: ProcessAudioChunkOrchestrator;
    private readonly finalizeOrchestrator: FinalizeSpeakingSessionOrchestrator;
    private readonly recoverOrchestrator: RecoverSpeakingSessionOrchestrator;

    constructor() {
        // ─── Build dependency tree ────────────────────────────────────────
        const cacheRepo = new SpeakingSessionCacheRepo();
        const sessionManager = new SpeakingSessionManager(cacheRepo);
        const promptBuilder = new PromptBuilderService();

        this.startOrchestrator = new StartSpeakingSessionOrchestrator(sessionManager, promptBuilder);
        this.audioChunkOrchestrator = new ProcessAudioChunkOrchestrator(sessionManager);
        this.finalizeOrchestrator = new FinalizeSpeakingSessionOrchestrator(sessionManager);
        this.recoverOrchestrator = new RecoverSpeakingSessionOrchestrator(sessionManager);

        logger.info('[SpeechCoachService] Service initialized');
    }

    async startSession(payload: StartSessionInput, socket: Socket): Promise<void> {
        logger.info('[SpeechCoachService] startSession invoked', {
            sessionId: payload.sessionId,
            userId: payload.userId,
        });
        await this.startOrchestrator.execute(payload, socket);
    }

    async processAudioChunk(payload: AudioChunkInput): Promise<void> {
        await this.audioChunkOrchestrator.execute(payload);
    }

    async endSession(payload: EndSessionInput, socket: Socket): Promise<void> {
        logger.info('[SpeechCoachService] endSession invoked', {
            sessionId: payload.sessionId,
            reason: payload.reason,
        });
        await this.finalizeOrchestrator.execute(payload, socket);
    }

    async recoverSession(payload: RecoverSessionInput, socket: Socket): Promise<void> {
        logger.info('[SpeechCoachService] recoverSession invoked', {
            sessionId: payload.sessionId,
            lastKnownSequence: payload.lastKnownSequence,
        });
        await this.recoverOrchestrator.execute(payload, socket);
    }
}
