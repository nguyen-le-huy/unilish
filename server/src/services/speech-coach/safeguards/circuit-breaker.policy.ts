/**
 * @module circuit-breaker.policy
 * @description Simple sliding-window circuit breaker for AI provider calls.
 * States: CLOSED (normal) → OPEN (fail-fast) → HALF_OPEN (probe).
 *
 * Used to wrap OpenAI Realtime API calls. On OPEN, triggers fallback engine.
 */

import { logger } from '../../../utils/logger.js';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    readonly name: string;
    readonly failureThreshold: number; // failures before OPEN, e.g. 5
    readonly recoveryTimeMs: number; // ms before switching to HALF_OPEN, e.g. 30_000
    readonly successThresholdInHalfOpen: number; // successes to close again, e.g. 2
}

export class CircuitBreakerPolicy {
    private state: CircuitBreakerState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private openedAt: number | null = null;
    private readonly config: CircuitBreakerConfig;

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
    }

    get currentState(): CircuitBreakerState {
        return this.state;
    }

    /**
     * Execute a function wrapped by the circuit breaker.
     * Throws immediately if circuit is OPEN and recovery window has not elapsed.
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            const elapsed = Date.now() - (this.openedAt ?? 0);
            if (elapsed < this.config.recoveryTimeMs) {
                logger.warn(`[CircuitBreaker:${this.config.name}] Circuit is OPEN — fast-failing`, {
                    failureCount: this.failureCount,
                    elapsedMs: elapsed,
                    recoveryWindowMs: this.config.recoveryTimeMs,
                });
                throw new Error(`Circuit breaker OPEN for [${this.config.name}]. Failing fast.`);
            }
            this.transitionTo('HALF_OPEN');
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        if (this.state === 'HALF_OPEN') {
            this.successCount += 1;
            if (this.successCount >= this.config.successThresholdInHalfOpen) {
                this.transitionTo('CLOSED');
            }
        } else {
            this.failureCount = 0; // reset on success in CLOSED state
        }
    }

    private onFailure(): void {
        this.failureCount += 1;
        logger.warn(`[CircuitBreaker:${this.config.name}] Failure recorded`, {
            failureCount: this.failureCount,
            threshold: this.config.failureThreshold,
        });

        if (this.failureCount >= this.config.failureThreshold) {
            this.transitionTo('OPEN');
        }
    }

    private transitionTo(next: CircuitBreakerState): void {
        logger.warn(`[CircuitBreaker:${this.config.name}] State transition`, {
            from: this.state,
            to: next,
        });
        this.state = next;
        if (next === 'OPEN') {
            this.openedAt = Date.now();
        }
        if (next === 'CLOSED') {
            this.failureCount = 0;
            this.successCount = 0;
            this.openedAt = null;
        }
        if (next === 'HALF_OPEN') {
            this.successCount = 0;
        }
    }
}
