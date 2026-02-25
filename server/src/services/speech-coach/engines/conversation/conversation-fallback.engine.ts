/**
 * @module conversation-fallback.engine
 * @description Fallback conversation engine using STT → LLM → TTS pipeline.
 * Activated when the OpenAI Realtime API connection fails (circuit-breaker triggered).
 * Implements the same IConversationEngine interface for transparent substitution.
 *
 * Phase 0/1 stub — full implementation in Phase 4 (Observability + Hardening).
 */

import { logger } from '../../../../utils/logger.js';
import type { ConversationEngineConfig, IConversationEngine } from './openai-realtime.engine.js';

/**
 * Fallback engine (STT → LLM → TTS) — Phase 4 stub.
 * Provides degraded but functional conversation when Realtime API is unavailable.
 */
export class ConversationFallbackEngine implements IConversationEngine {
    async initialize(config: ConversationEngineConfig): Promise<void> {
        logger.warn('[ConversationFallbackEngine][STUB] Initializing fallback STT→LLM→TTS pipeline', {
            sessionId: config.sessionId,
            traceId: config.traceId,
        });
        // TODO(Phase 4): Initialize Deepgram STT + OpenAI Chat Completions + ElevenLabs TTS clients
    }

    async ingestChunk(sessionId: string, audioData: string, isFinalChunk: boolean): Promise<void> {
        logger.debug('[ConversationFallbackEngine][STUB] ingestChunk called', {
            sessionId,
            isFinalChunk,
        });
        // TODO(Phase 4): Buffer audio, run STT on isFinalChunk, then feed transcript to LLM
        void audioData;
    }

    async replayHistory(
        sessionId: string,
        history: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>,
    ): Promise<void> {
        logger.debug('[ConversationFallbackEngine][STUB] replayHistory called', {
            sessionId,
            turnCount: history.length,
        });
        // TODO(Phase 4): Inject as messages[] into Chat Completions API
    }

    async terminate(sessionId: string): Promise<void> {
        logger.info('[ConversationFallbackEngine][STUB] terminate called', { sessionId });
        // TODO(Phase 4): Close STT + TTS streams and flush buffers
    }
}
