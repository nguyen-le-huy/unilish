/**
 * @module openai-realtime.engine
 * @description Track 1 — OpenAI Realtime API conversation engine adapter.
 * Responsible for managing the streaming WebSocket connection to OpenAI Realtime API,
 * forwarding audio chunks, and emitting AI response chunks back to the client.
 *
 * Phase 0/1 stub — full implementation in Phase 2.
 * Provider SDK response MUST be normalized before emitting or persisting.
 */

import { logger } from '../../../../utils/logger.js';

export interface ConversationEngineConfig {
    readonly sessionId: string;
    readonly traceId: string;
    readonly systemPrompt: string;
    readonly voice: string; // e.g. 'alloy', 'echo', 'shimmer'
    readonly outputAudioEnabled: boolean;
}

export interface ConversationChunkResult {
    readonly sessionId: string;
    readonly traceId: string;
    readonly sequenceNumber: number;
    readonly textDelta: string;
    readonly audioDelta?: string; // base64
    readonly isFinal: boolean;
}

export interface IConversationEngine {
    initialize(config: ConversationEngineConfig): Promise<void>;
    ingestChunk(sessionId: string, audioData: string, isFinalChunk: boolean): Promise<void>;
    replayHistory(sessionId: string, history: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>): Promise<void>;
    terminate(sessionId: string): Promise<void>;
}

/**
 * OpenAI Realtime Engine — Phase 2 stub.
 * All methods are no-ops with structured logs until full integration.
 */
export class OpenAiRealtimeEngine implements IConversationEngine {
    async initialize(config: ConversationEngineConfig): Promise<void> {
        logger.info('[OpenAiRealtimeEngine][STUB] initialize called', {
            sessionId: config.sessionId,
            traceId: config.traceId,
        });
        // TODO(Phase 2): Open WebSocket to OpenAI Realtime API, send session.create event
    }

    async ingestChunk(sessionId: string, audioData: string, isFinalChunk: boolean): Promise<void> {
        logger.debug('[OpenAiRealtimeEngine][STUB] ingestChunk called', {
            sessionId,
            isFinalChunk,
            audioByteLength: audioData.length,
        });
        // TODO(Phase 2): Send input_audio_buffer.append event to OpenAI Realtime API
        void audioData;
    }

    async replayHistory(
        sessionId: string,
        history: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>,
    ): Promise<void> {
        logger.debug('[OpenAiRealtimeEngine][STUB] replayHistory called', {
            sessionId,
            turnCount: history.length,
        });
        // TODO(Phase 2): Inject conversation history into context via conversation.item.create
    }

    async terminate(sessionId: string): Promise<void> {
        logger.info('[OpenAiRealtimeEngine][STUB] terminate called', { sessionId });
        // TODO(Phase 2): Send session.terminate event and close WebSocket
    }
}
