/**
 * @module stream-backpressure.guard
 * @description Guards against audio stream flooding by applying backpressure
 * when the pending chunk queue exceeds a configured threshold.
 * Returns a signal to the gateway to pause sending further chunks.
 *
 * Phase 0 skeleton — integrated into gateway in Phase 4 (hardening).
 */

import { logger } from '../../../utils/logger.js';

export interface BackpressureGuardConfig {
    readonly sessionId: string;
    readonly maxPendingChunks: number; // e.g. 10
}

export type BackpressureState = 'ok' | 'backpressure';

export class StreamBackpressureGuard {
    private pendingCount = 0;
    private readonly maxPending: number;
    private readonly sessionId: string;

    constructor(config: BackpressureGuardConfig) {
        this.sessionId = config.sessionId;
        this.maxPending = config.maxPendingChunks;
    }

    /** Call when a chunk starts processing. Returns current state. */
    acquire(): BackpressureState {
        this.pendingCount += 1;

        if (this.pendingCount > this.maxPending) {
            logger.warn('[StreamBackpressureGuard] Backpressure active', {
                sessionId: this.sessionId,
                pendingCount: this.pendingCount,
                maxPending: this.maxPending,
            });
            return 'backpressure';
        }

        return 'ok';
    }

    /** Call when a chunk finishes processing. */
    release(): void {
        this.pendingCount = Math.max(0, this.pendingCount - 1);

        if (this.pendingCount <= this.maxPending) {
            logger.debug('[StreamBackpressureGuard] Backpressure released', {
                sessionId: this.sessionId,
                pendingCount: this.pendingCount,
            });
        }
    }

    get currentState(): BackpressureState {
        return this.pendingCount > this.maxPending ? 'backpressure' : 'ok';
    }
}
