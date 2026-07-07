import type { NextFunction, Request, Response } from 'express';
import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

type MemoryCounter = {
    count: number;
    resetAt: number;
};

const fallbackCounters = new Map<string, MemoryCounter>();

const getActorKey = (req: Request): string => {
    const userId = req.user?._id?.toString();
    return userId ? `user:${userId}` : `ip:${req.ip}`;
};

const enforceWithMemory = (counterKey: string, maxRequests: number, windowSeconds: number): void => {
    const now = Date.now();
    const existing = fallbackCounters.get(counterKey);

    if (!existing || existing.resetAt <= now) {
        fallbackCounters.set(counterKey, {
            count: 1,
            resetAt: now + windowSeconds * 1000,
        });
        return;
    }

    if (existing.count >= maxRequests) {
        throw new AppError('Too many requests. Please retry later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    fallbackCounters.set(counterKey, existing);
};

const createRateLimitMiddleware = (
    scope: string,
    maxRequests: number,
    windowSeconds: number,
) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const counterKey = `rate-limit:ielts:${scope}:${getActorKey(req)}`;

            if (!redisClient.isReady) {
                enforceWithMemory(counterKey, maxRequests, windowSeconds);
                next();
                return;
            }

            const count = await redisClient.incr(counterKey);
            if (count === 1) {
                await redisClient.expire(counterKey, windowSeconds);
            }

            if (count > maxRequests) {
                logger.warn('[RateLimit] IELTS endpoint exceeded', {
                    scope,
                    userId: req.user?._id?.toString(),
                });
                next(new AppError('Too many requests. Please retry later.', HttpStatus.TOO_MANY_REQUESTS));
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Rate limit for POST start attempt: 10 requests per 60 seconds per user.
 */
export const ieltsStartRateLimit = createRateLimitMiddleware('start', 10, 60);

/**
 * Rate limit for POST submit: 10 requests per 60 seconds per user.
 */
export const ieltsSubmitRateLimit = createRateLimitMiddleware('submit', 10, 60);

/**
 * Rate limit for PATCH draft (autosave): 60 requests per 60 seconds per user.
 */
export const ieltsDraftRateLimit = createRateLimitMiddleware('draft', 60, 60);
