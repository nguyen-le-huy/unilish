/**
 * @module silence-detector
 * @description Detects silence windows in incoming audio streams.
 * Used by the circuit-breaker policy to auto-terminate sessions on prolonged silence.
 *
 * Phase 0 skeleton — RMS/energy-based detection logic deferred to Phase 1.
 */

import { logger } from '../../../utils/logger.js';

export interface SilenceDetectorConfig {
    readonly sessionId: string;
    readonly silenceThresholdMs: number; // e.g. 3000 = 3 seconds
    readonly onSilenceDetected: (sessionId: string, silenceDurationMs: number) => void;
}

export class SilenceDetector {
    private lastAudioAt: number = Date.now();
    private silenceTimer: NodeJS.Timeout | null = null;
    private readonly config: SilenceDetectorConfig;

    constructor(config: SilenceDetectorConfig) {
        this.config = config;
    }

    /** Call this each time an audio chunk is received to reset the silence timer. */
    onAudioReceived(): void {
        this.lastAudioAt = Date.now();
        this.resetTimer();
    }

    private resetTimer(): void {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        this.silenceTimer = setTimeout(() => {
            const silenceDurationMs = Date.now() - this.lastAudioAt;
            logger.warn('[SilenceDetector] Silence threshold exceeded', {
                sessionId: this.config.sessionId,
                silenceDurationMs,
                threshold: this.config.silenceThresholdMs,
            });
            this.config.onSilenceDetected(this.config.sessionId, silenceDurationMs);
        }, this.config.silenceThresholdMs);
    }

    destroy(): void {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        logger.debug('[SilenceDetector] Destroyed', { sessionId: this.config.sessionId });
    }
}
