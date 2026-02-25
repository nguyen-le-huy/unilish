/**
 * @module retry.policy
 * @description Exponential-backoff retry utility for transient provider errors.
 * Used to wrap AI provider calls that may fail due to rate limits or transient faults.
 * Works in conjunction with CircuitBreakerPolicy and TimeoutPolicy.
 */

import { logger } from '../../../utils/logger.js';

export interface RetryPolicyConfig {
    readonly maxAttempts: number;       // e.g. 3
    readonly initialDelayMs: number;    // e.g. 500
    readonly backoffMultiplier: number; // e.g. 2 → 500ms, 1000ms, 2000ms
    readonly maxDelayMs: number;        // e.g. 10_000
    readonly retryableErrorCodes?: ReadonlyArray<number>; // e.g. [408, 429, 503]
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    config: RetryPolicyConfig,
    operationLabel: string,
): Promise<T> {
    let attempt = 0;
    let delayMs = config.initialDelayMs;

    while (attempt < config.maxAttempts) {
        attempt += 1;
        try {
            return await fn();
        } catch (error) {
            const isLast = attempt >= config.maxAttempts;

            logger.warn(`[RetryPolicy] Attempt ${attempt}/${config.maxAttempts} failed: ${operationLabel}`, {
                attempt,
                delayMs,
                isLast,
                error,
            });

            if (isLast) throw error;

            await sleep(Math.min(delayMs, config.maxDelayMs));
            delayMs *= config.backoffMultiplier;
        }
    }

    // TypeScript safeguard — unreachable
    throw new Error(`[RetryPolicy] Exhausted all attempts for: ${operationLabel}`);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
