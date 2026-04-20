import type { NextFunction, Request, Response } from 'express';
import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';

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
    scope: 'stt' | 'chat' | 'tts' | 'generate',
    maxRequests: number,
    windowSeconds: number,
) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const counterKey = `rate-limit:ai-voice:${scope}:${getActorKey(req)}`;

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

export const aiVoiceSttRateLimit = createRateLimitMiddleware('stt', 20, 60);
export const aiVoiceChatRateLimit = createRateLimitMiddleware('chat', 30, 60);
export const aiVoiceTtsRateLimit = createRateLimitMiddleware('tts', 40, 60);
export const aiVoiceGenerateRateLimit = createRateLimitMiddleware('generate', 10, 60);