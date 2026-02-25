/**
 * @module speech-metrics.service
 * @description Collects and emits speaking session performance metrics.
 * Phase 0 skeleton — wired to a real metrics sink (Datadog/ClickHouse) in Phase 4.
 */

import { logger } from '../../../utils/logger.js';

export interface SessionMetricsSnapshot {
    readonly sessionId: string;
    readonly traceId: string;
    readonly totalDurationMs: number;
    readonly audioChunkCount: number;
    readonly aiTurnCount: number;
    readonly averageLatencyMs: number;
    readonly pronunciationScore?: number;
}

export class SpeechMetricsService {
    /**
     * Record metrics for a completed speaking session.
     * Phase 4: push to ClickHouse analytics table.
     */
    recordSessionCompleted(snapshot: SessionMetricsSnapshot): void {
        logger.info('[SpeechMetricsService] Session metrics recorded', {
            sessionId: snapshot.sessionId,
            traceId: snapshot.traceId,
            totalDurationMs: snapshot.totalDurationMs,
            audioChunkCount: snapshot.audioChunkCount,
            aiTurnCount: snapshot.aiTurnCount,
            averageLatencyMs: snapshot.averageLatencyMs,
            pronunciationScore: snapshot.pronunciationScore,
        });

        // TODO(Phase 4): await clickhouseClient.insert('speaking_session_metrics', snapshot);
    }

    /**
     * Record a per-turn latency observation.
     */
    recordTurnLatency(sessionId: string, traceId: string, latencyMs: number): void {
        logger.debug('[SpeechMetricsService] Turn latency recorded', {
            sessionId,
            traceId,
            latencyMs,
        });

        // TODO(Phase 4): Push to time-series bucket in analytics
    }
}
