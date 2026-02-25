/**
 * @module quota.guard
 * @description Enforces per-user per-day speaking session quotas.
 * Guards against abuse and budget overruns using Redis counters.
 * Integrates with the subscription/quota service for limit resolution.
 *
 * Phase 0 skeleton — quota check deferred to Phase 1.
 */

import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import redisClient from '../../../config/redis.js';

const quotaKey = (userId: string, date: string): string =>
    `speech-coach:quota:${userId}:${date}`;

const today = (): string => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export class QuotaGuard {
    constructor(private readonly dailyLimitMinutes: number) { }

    /**
     * Check if user has quota remaining for a new session.
     * Throws AppError(429) if quota is exceeded.
     */
    async assertHasQuota(userId: string): Promise<void> {
        const key = quotaKey(userId, today());

        try {
            const usedSecondsRaw = await redisClient.get(key);
            const usedMinutes = usedSecondsRaw ? Math.ceil(parseInt(usedSecondsRaw, 10) / 60) : 0;

            if (usedMinutes >= this.dailyLimitMinutes) {
                logger.warn('[QuotaGuard] User daily speaking quota exceeded', {
                    userId,
                    usedMinutes,
                    dailyLimitMinutes: this.dailyLimitMinutes,
                });
                throw new AppError(
                    `Daily speaking quota of ${this.dailyLimitMinutes} minutes reached. Try again tomorrow.`,
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            logger.debug('[QuotaGuard] Quota check passed', {
                userId,
                usedMinutes,
                remainingMinutes: this.dailyLimitMinutes - usedMinutes,
            });
        } catch (error) {
            if (error instanceof AppError) throw error;
            // Redis failure — fail open (do not block user)
            logger.error('[QuotaGuard] Redis error during quota check — failing open', {
                userId,
                error,
            });
        }
    }

    /**
     * Deduct session duration from the user's daily quota counter.
     */
    async deductQuota(userId: string, durationMs: number): Promise<void> {
        const key = quotaKey(userId, today());
        const durationSeconds = Math.ceil(durationMs / 1000);

        try {
            const ttlSeconds = 24 * 60 * 60; // expire at end of day
            await redisClient.incrBy(key, durationSeconds);
            await redisClient.expire(key, ttlSeconds);

            logger.debug('[QuotaGuard] Quota deducted', {
                userId,
                durationSeconds,
            });
        } catch (error) {
            logger.error('[QuotaGuard] Failed to deduct quota', { userId, error });
        }
    }
}
