import type { NextFunction, Request, Response } from 'express';
import redisClient from '../config/redis.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

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
    scope: 'stt' | 'chat' | 'tts',
    maxRequests: number,
    windowSeconds: number,
) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const counterKey = `rate-limit:speaking-pipeline:${scope}:${getActorKey(req)}`;

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
                next(new AppError('Too many requests. Please retry later.', HttpStatus.TOO_MANY_REQUESTS));
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const speakingSttRateLimit = createRateLimitMiddleware('stt', 20, 60);
export const speakingChatRateLimit = createRateLimitMiddleware('chat', 15, 60);
export const speakingTtsRateLimit = createRateLimitMiddleware('tts', 15, 60);
