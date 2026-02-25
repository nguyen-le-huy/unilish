/**
 * @module latency-tracker
 * @description Tracks end-to-end and per-segment latency for the speaking pipeline.
 * Provides measurements for the observability layer (cost-telemetry + structured logs).
 *
 * Phase 0 skeleton — measurements wired to observability in Phase 4.
 */

import { logger } from '../../../utils/logger.js';

export interface LatencyMeasurement {
    readonly label: string;
    readonly sessionId: string;
    readonly traceId: string;
    readonly durationMs: number;
    readonly timestamp: number;
}

export class LatencyTracker {
    private readonly marks = new Map<string, number>();

    mark(label: string): void {
        this.marks.set(label, Date.now());
    }

    measure(
        fromLabel: string,
        toLabel: string,
        sessionId: string,
        traceId: string,
    ): LatencyMeasurement | null {
        const start = this.marks.get(fromLabel);
        const end = this.marks.get(toLabel);

        if (start === undefined || end === undefined) {
            logger.warn('[LatencyTracker] Cannot measure: missing mark', {
                fromLabel,
                toLabel,
                sessionId,
            });
            return null;
        }

        const measurement: LatencyMeasurement = {
            label: `${fromLabel}→${toLabel}`,
            sessionId,
            traceId,
            durationMs: end - start,
            timestamp: Date.now(),
        };

        logger.debug('[LatencyTracker] Measurement', measurement);
        return measurement;
    }

    reset(): void {
        this.marks.clear();
    }
}
