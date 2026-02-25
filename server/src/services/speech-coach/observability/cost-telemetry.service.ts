/**
 * @module cost-telemetry.service
 * @description Tracks token/call cost for AI provider usage in speaking sessions.
 * Essential for unit economics tracking and budget alerts.
 * Phase 0 skeleton — integrated with a cost sink (Datadog custom metric) in Phase 4.
 */

import { logger } from '../../../utils/logger.js';

export type AiProvider = 'openai-realtime' | 'azure-speech' | 'elevenlabs' | 'deepgram';

export interface CostEvent {
    readonly sessionId: string;
    readonly traceId: string;
    readonly provider: AiProvider;
    readonly operation: string; // e.g. 'audio-input', 'audio-output', 'assessment'
    readonly units: number; // tokens, seconds, characters
    readonly unitLabel: 'tokens' | 'audio-seconds' | 'characters';
    readonly costUsd?: number; // computed estimate if rate is known
    readonly timestamp: number;
}

export class CostTelemetryService {
    private readonly events: CostEvent[] = [];

    record(event: CostEvent): void {
        this.events.push(event);
        logger.debug('[CostTelemetryService] Cost event recorded', {
            sessionId: event.sessionId,
            provider: event.provider,
            operation: event.operation,
            units: event.units,
            unitLabel: event.unitLabel,
            costUsd: event.costUsd,
        });

        // TODO(Phase 4): Push to Datadog custom metric or ClickHouse cost_events table
    }

    /** Summarize total estimated cost for the session */
    summarizeSessionCost(sessionId: string): number {
        const total = this.events
            .filter((e) => e.sessionId === sessionId && e.costUsd !== undefined)
            .reduce((sum, e) => sum + (e.costUsd ?? 0), 0);

        logger.info('[CostTelemetryService] Session cost summary', {
            sessionId,
            totalCostUsd: total,
            eventCount: this.events.length,
        });

        return total;
    }
}
