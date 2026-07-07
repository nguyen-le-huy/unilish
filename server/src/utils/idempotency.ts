import { v4 as uuidv4 } from 'uuid';
import redisClient from '../config/redis.js';
import { logger } from './logger.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const KEY_PREFIX = 'idempotency:';

/**
 * Build an idempotency key for the given scope.
 */
export function buildIdempotencyKey(userId: string, route: string, idempotencyKey: string): string {
    return `${KEY_PREFIX}${userId}:${route}:${idempotencyKey}`;
}

/**
 * Try to claim an idempotency key. Returns the stored response data if already set.
 * If not set, returns null and the caller should proceed and call setIdempotencyResponse.
 */
export async function tryClaimIdempotency<T>(redisKey: string): Promise<T | null> {
    if (!redisClient || !redisClient.isOpen) {
        logger.warn('[Idempotency] Redis not available, skipping dedup');
        return null;
    }

    try {
        const existing = await redisClient.get(redisKey);
        if (existing) {
            try {
                return JSON.parse(existing) as T;
            } catch {
                // Invalid JSON in cache, treat as miss
                return null;
            }
        }

        // SET NX to claim
        const claimed = await redisClient.set(redisKey, 'pending', {
            NX: true,
            EX: IDEMPOTENCY_TTL_SECONDS,
        });

        if (!claimed) {
            // Race condition — another request just set it
            // Wait briefly and read
            await new Promise((resolve) => setTimeout(resolve, 200));
            const value = await redisClient.get(redisKey);
            if (value && value !== 'pending') {
                return JSON.parse(value) as T;
            }
        }

        return null;
    } catch (error) {
        logger.error('[Idempotency] Redis error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * Store the response for an idempotency key.
 */
export async function setIdempotencyResponse<T>(redisKey: string, data: T): Promise<void> {
    if (!redisClient || !redisClient.isOpen) {
        return;
    }

    try {
        await redisClient.set(redisKey, JSON.stringify(data), {
            EX: IDEMPOTENCY_TTL_SECONDS,
        });
    } catch (error) {
        logger.error('[Idempotency] Failed to store response', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Generate a unique idempotency key.
 */
export function generateIdempotencyKey(): string {
    return uuidv4();
}
